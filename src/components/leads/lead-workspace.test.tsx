import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Lead } from "@/hooks/use-leads";
import { dateInputToIso, formatDate } from "@/lib/format";
import {
  QUALITY_LINE_PLACEHOLDER,
  QUALITY_LINES_EMPTY_MESSAGE,
} from "@/lib/quality-line-presentation";
import type {
  CalculationSession,
  LeadCommercialQualification,
  LeadQualification,
  Quote,
} from "@/types/hpl";
import { LeadWorkspace } from "./lead-workspace";

const useAuthMock = vi.fn();
const useLeadMock = vi.fn();
const useLeadWorkspaceMock = vi.fn();
const useCalculationsByLeadMock = vi.fn();
const useQuotesMock = vi.fn();
const useUsersListMock = vi.fn();
const confirmCommercialMutateAsync = vi.fn();
const saveNoteMutateAsync = vi.fn();
const handoffMutateAsync = vi.fn();

vi.mock("@/context/auth-context", () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock("next/dynamic", () => ({
  default: () => {
    function CalculatorStub() {
      return <div>Калькулятор HPL-панелей</div>;
    }
    return CalculatorStub;
  },
}));

vi.mock("@/components/leads/qualify-lead-modal", () => ({
  QualifyLeadModal: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div>Форма квалификации Stage 1</div> : null,
}));

vi.mock("@/hooks/use-leads", () => ({
  useLead: (...args: unknown[]) => useLeadMock(...args),
  useAssignLeadOwner: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useConfirmLeadCommercialQualification: () => ({
    mutateAsync: confirmCommercialMutateAsync,
    isPending: false,
  }),
  useUnqualifyLead: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useLoseLead: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
    isError: false,
  }),
  useUpdateLeadManagerCommercialNote: () => ({
    mutateAsync: saveNoteMutateAsync,
    isPending: false,
  }),
  useHandoffLeadToHead: () => ({
    mutateAsync: handoffMutateAsync,
    isPending: false,
  }),
}));

vi.mock("@/hooks/use-lead-workspace", () => ({
  useLeadWorkspace: (...args: unknown[]) => useLeadWorkspaceMock(...args),
  useCreateLeadCall: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useCreateLeadNote: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock("@/hooks/use-calculations", () => ({
  useCalculationsByLead: (...args: unknown[]) =>
    useCalculationsByLeadMock(...args),
  useFinalizeCalculation: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

const useCalculationRequestsMock = vi.fn(() => ({
  data: [] as Array<{ id: string; notes?: string | null }>,
  isLoading: false,
  isError: false,
}));

vi.mock("@/hooks/use-calculation-requests", () => ({
  useCalculationRequests: () => useCalculationRequestsMock(),
}));

vi.mock("@/hooks/use-quotes", () => ({
  useQuotes: (...args: unknown[]) => useQuotesMock(...args),
  useConvertCalculationToQuote: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useUpdateQuoteStatus: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useRecordQuoteClientAcceptance: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useConvertQuoteToDeal: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDownloadQuotePdf: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDownloadQuoteDocx: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateQuoteCommercialTerms: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useApproveQuotePricing: () => ({ mutateAsync: vi.fn(), isPending: false }),
  usePreviewQuotePricing: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useFinalizeQuote: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useCreateQuoteVersion: () => ({ mutateAsync: vi.fn(), isPending: false }),
  isQuoteTermsLockedError: () => false,
}));

vi.mock("@/components/calculations/calculation-request-panel", () => ({
  CalculationRequestPanel: () => (
    <div>
      <p>Запросы расчёта</p>
    </div>
  ),
}));

vi.mock("@/hooks/use-users", () => ({
  useUsersList: () => useUsersListMock(),
}));

const useSuppliersMock = vi.fn();
const useSupplierQualityClassesMock = vi.fn();

vi.mock("@/hooks/use-panels", () => ({
  useSuppliers: (...args: unknown[]) => useSuppliersMock(...args),
  useSupplierQualityClasses: (...args: unknown[]) =>
    useSupplierQualityClassesMock(...args),
}));

const MANAGER_PERMISSIONS = [
  "leads:read",
  "leads:update",
  "leads:qualify",
  "calculations:read",
  "calculations:create",
  "calculations:update",
  "quotes:read",
  "quotes:create",
  "quotes:update",
  "quotes:client_accept",
];

const HEAD_PERMISSIONS = [
  "leads:read",
  "leads:read_all",
  "leads:qualify",
  "leads:commercial_qualify",
  "calculations:read",
  "calculations:read_all",
  "calculations:create",
  "calculations:update",
  "quotes:read",
  "quotes:read_all",
  "quotes:create",
  "quotes:update",
  "quotes:approve",
];

const DIRECTOR_PERMISSIONS = [
  "leads:read",
  "leads:read_all",
  "calculations:read",
  "calculations:read_all",
  "quotes:read",
  "quotes:read_all",
];

function auth(permissions: string[], roles: string[], id = "user-1") {
  return {
    user: {
      id,
      email: `${roles[0]?.toLowerCase() ?? "user"}@hpl.local`,
      roles,
      permissions,
    },
    hasPermission: (slug: string) => permissions.includes(slug),
    isInitialized: true,
    login: vi.fn(),
    logout: vi.fn(),
  };
}

function qualification(): LeadQualification {
  return {
    id: "qual-1",
    leadId: "lead-1",
    application: "INTERIOR",
    panelTypeId: "type-1",
    thicknessMm: 8,
    panelSizeId: "size-1",
    colorCode: "RAL-9005",
    colorName: "Чёрный",
    requiredAreaM2: 20,
    installationRequired: true,
    panelType: { id: "type-1", code: "interior", displayNameRu: "Интерьерный" },
    panelSize: {
      id: "size-1",
      displayName: "1220 × 2440 мм",
      widthMm: 1220,
      heightMm: 2440,
    },
  };
}

function furnitureQualification(
  overrides: Partial<LeadQualification> = {},
): LeadQualification {
  return {
    id: "qual-1",
    leadId: "lead-1",
    application: "FURNITURE",
    panelTypeId: "type-furniture",
    thicknessMm: 2.9,
    panelSizeId: "size-1",
    colorCode: "RAL-9005",
    colorName: "Чёрный",
    requiredAreaM2: 12,
    installationRequired: false,
    customerRequirements: "Кухонные фасады",
    panelType: {
      id: "type-furniture",
      code: "furniture",
      displayNameRu: "Мебельный",
    },
    panelSize: {
      id: "size-1",
      displayName: "1220 × 2440 мм",
      widthMm: 1220,
      heightMm: 2440,
    },
    ...overrides,
  };
}

function laboratoryQualification(): LeadQualification {
  return {
    ...furnitureQualification(),
    application: "LABORATORY",
    panelTypeId: "type-lab",
    thicknessMm: 8,
    panelType: {
      id: "type-lab",
      code: "laboratory",
      displayNameRu: "Лабораторный",
    },
  };
}

function exteriorQualification(): LeadQualification {
  return {
    ...furnitureQualification(),
    application: "EXTERIOR_WITH_UV",
    panelTypeId: "type-ext",
    thicknessMm: 8,
    panelType: {
      id: "type-ext",
      code: "exterior_with_uv",
      displayNameRu: "Exterior с УФ",
    },
  };
}

const QUALITY_BY_CODE = {
  economy: { id: "q-economy", code: "economy", nameRu: "Economy" },
  medium: { id: "q-medium", code: "medium", nameRu: "Medium" },
  premium: { id: "q-premium", code: "premium", nameRu: "Premium" },
};

const ALL_QUALITY_CODES: Array<keyof typeof QUALITY_BY_CODE> = [
  "economy",
  "medium",
  "premium",
];

const BACKEND_QUALITY_MAP: Record<
  string,
  Record<string, Array<keyof typeof QUALITY_BY_CODE>>
> = {
  furniture: {
    tianran: ALL_QUALITY_CODES,
    wuya: ALL_QUALITY_CODES,
    polybet: ALL_QUALITY_CODES,
  },
  laboratory: {
    tianran: ALL_QUALITY_CODES,
    wuya: ALL_QUALITY_CODES,
    polybet: ALL_QUALITY_CODES,
  },
  interior: {
    tianran: ALL_QUALITY_CODES,
    wuya: ALL_QUALITY_CODES,
    polybet: ALL_QUALITY_CODES,
  },
  exterior_with_uv: {
    tianran: ALL_QUALITY_CODES,
    wuya: ALL_QUALITY_CODES,
    polybet: ALL_QUALITY_CODES,
  },
};

function qualityClassesFor(supplierCode: unknown, panelType: unknown) {
  const supplier = String(supplierCode ?? "").toLowerCase();
  const panel = String(panelType ?? "").toLowerCase();
  const codes = BACKEND_QUALITY_MAP[panel]?.[supplier] ?? [];
  return codes.map((code) => QUALITY_BY_CODE[code]);
}

function lead(overrides: Partial<Lead> = {}): Lead {
  return {
    id: "lead-1",
    title: "Фасад школы",
    source: "website",
    status: "QUALIFIED",
    ownerId: "manager-1",
    createdAt: "2026-08-19T10:00:00.000Z",
    updatedAt: "2026-08-19T10:00:00.000Z",
    qualification: qualification(),
    ...overrides,
  };
}

function calculation(
  overrides: Partial<CalculationSession> = {},
): CalculationSession {
  return {
    id: "calc-1",
    leadId: "lead-1",
    status: "finalized",
    totalAmount: "1500000",
    createdAt: "2026-08-20T10:00:00.000Z",
    updatedAt: "2026-08-20T10:00:00.000Z",
    items: [
      {
        panelTypeId: "type-1",
        supplierId: "sup-1",
        thicknessMm: 8,
        sheetsCount: 8,
        clientPricePerM2: "50",
        pricePerSheet: "150",
        totalPrice: "1500000",
        panelType: { code: "interior", displayNameRu: "Интерьерный" },
        supplier: { code: "tianran", name: "Tianran" },
      },
    ],
    ...overrides,
  };
}

function quote(overrides: Partial<Quote> = {}): Quote {
  return {
    id: "11111111-2222-3333-4444-555555555555",
    leadId: "lead-1",
    managerId: "manager-1",
    status: "approved",
    totalAmount: "1500000",
    createdAt: "2026-08-20T11:00:00.000Z",
    updatedAt: "2026-08-20T11:00:00.000Z",
    items: [],
    ...overrides,
  };
}

function setupWorkspace({
  permissions,
  roles,
  currentUserId = "user-1",
  leadData = lead(),
  workspaceLead,
  calculations = [],
  quotes = [],
  commercialQualification = null,
}: {
  permissions: string[];
  roles: string[];
  currentUserId?: string;
  leadData?: Lead;
  workspaceLead?: Lead;
  calculations?: CalculationSession[];
  quotes?: Quote[];
  commercialQualification?: LeadCommercialQualification | null;
}) {
  useAuthMock.mockReturnValue(auth(permissions, roles, currentUserId));
  useLeadMock.mockReturnValue({
    data: leadData,
    isLoading: false,
    isError: false,
  });
  const workspaceSource = workspaceLead ?? leadData;
  useLeadWorkspaceMock.mockReturnValue({
    data: {
      lead: workspaceSource,
      qualification: workspaceSource.qualification,
      commercialQualification,
      calculations,
      quotes,
      calls: [],
      notes: [],
      activities: [],
    },
    isLoading: false,
  });
  useCalculationsByLeadMock.mockReturnValue({
    data: calculations,
    isLoading: false,
    isError: false,
  });
  useQuotesMock.mockReturnValue({
    data: quotes,
    isLoading: false,
    isError: false,
  });
  useUsersListMock.mockReturnValue({
    users: [],
    usersById: new Map(),
  });
  useSuppliersMock.mockReturnValue({
    data: [
      { id: "sup-wuya", code: "wuya", name: "Wuya" },
      { id: "sup-1", code: "tianran", name: "Tianran" },
      { id: "sup-polybet", code: "polybet", name: "Polybet" },
    ],
    isFetching: false,
  });
  useSupplierQualityClassesMock.mockImplementation(
    (supplierCode, panelType) => ({
      data: qualityClassesFor(supplierCode, panelType),
      isFetching: false,
      isSuccess: true,
      isError: false,
    }),
  );
}

describe("LeadWorkspace commercial calculation authority", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("hides commercial calculation actions from MANAGER and does not require a manual request", async () => {
    setupWorkspace({
      permissions: MANAGER_PERMISSIONS,
      roles: ["MANAGER"],
      currentUserId: "manager-1",
    });

    render(<LeadWorkspace leadId="lead-1" />);

    expect(
      screen.queryByRole("button", { name: "Новый расчёт" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("Коммерческий расчёт ожидает руководителя."),
    ).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Расчёты" }));
    expect(
      screen.queryByRole("button", { name: "Новый расчёт" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Создать запрос расчёта" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Отправить руководителю" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Рассчитать" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Конвертировать в КП" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Сформировать КП" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("Калькулятор HPL-панелей"),
    ).not.toBeInTheDocument();
  });

  it("lets HEAD open commercial calculation from the lead workspace", async () => {
    setupWorkspace({
      permissions: HEAD_PERMISSIONS,
      roles: ["HEAD"],
      currentUserId: "head-1",
    });

    render(<LeadWorkspace leadId="lead-1" />);

    expect(
      screen.queryByText("Коммерческий расчёт ожидает руководителя."),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Новый расчёт" }),
    ).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Расчёты" }));
    await userEvent.click(screen.getByRole("button", { name: "Новый расчёт" }));
    expect(screen.getByText("Калькулятор HPL-панелей")).toBeInTheDocument();
  });

  it("does not expose commercial calculation to DIRECTOR without calculations:create", async () => {
    setupWorkspace({
      permissions: DIRECTOR_PERMISSIONS,
      roles: ["DIRECTOR"],
      currentUserId: "director-1",
    });

    render(<LeadWorkspace leadId="lead-1" />);

    expect(
      screen.queryByRole("button", { name: "Новый расчёт" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText("Коммерческий расчёт ожидает руководителя."),
    ).toBeInTheDocument();
  });

  it("lets DIRECTOR run calculation when backend grants create", async () => {
    setupWorkspace({
      permissions: [...DIRECTOR_PERMISSIONS, "calculations:create"],
      roles: ["DIRECTOR"],
      currentUserId: "director-1",
    });

    render(<LeadWorkspace leadId="lead-1" />);

    await userEvent.click(screen.getByRole("button", { name: "Расчёты" }));
    await userEvent.click(screen.getByRole("button", { name: "Новый расчёт" }));
    expect(screen.getByText("Калькулятор HPL-панелей")).toBeInTheDocument();
  });

  it("lets MANAGER open Stage 1 qualification", async () => {
    setupWorkspace({
      permissions: MANAGER_PERMISSIONS,
      roles: ["MANAGER"],
      currentUserId: "manager-1",
      leadData: lead({ status: "IN_PROGRESS" }),
    });

    render(<LeadWorkspace leadId="lead-1" />);

    await userEvent.click(
      screen.getByRole("button", { name: "Квалифицировать" }),
    );
    expect(screen.getByText("Форма квалификации Stage 1")).toBeInTheDocument();
  });

  it("lets MANAGER view an approved commercial result without edit or convert actions", async () => {
    setupWorkspace({
      permissions: MANAGER_PERMISSIONS,
      roles: ["MANAGER"],
      currentUserId: "manager-1",
      calculations: [calculation()],
      quotes: [quote()],
    });

    render(<LeadWorkspace leadId="lead-1" />);

    expect(
      screen.queryByText("Коммерческий расчёт ожидает руководителя."),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Новый расчёт" }),
    ).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Расчёты" }));
    expect(screen.getByText("Только просмотр")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Конвертировать в КП" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("textbox", { name: /сумм|цен/i }),
    ).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "КП" }));
    expect(screen.getByText("Согласовано")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Согласовать" }),
    ).not.toBeInTheDocument();
  });
});

describe("LeadWorkspace contact block", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("displays saved phone and email from the workspace client when the lead contact is stripped", () => {
    setupWorkspace({
      permissions: MANAGER_PERMISSIONS,
      roles: ["MANAGER"],
      currentUserId: "manager-1",
      leadData: lead({
        clientId: "client-1",
        contactId: "contact-1",
        client: { id: "client-1", name: "ООО Фасад" },
        contact: { id: "contact-1", firstName: "Иван", lastName: "Петров" },
      }),
      workspaceLead: lead({
        clientId: "client-1",
        contactId: "contact-1",
        client: {
          id: "client-1",
          name: "ООО Фасад",
          phone: "+998901112233",
          email: "office@fasad.uz",
        },
        contact: {
          id: "contact-1",
          firstName: "Иван",
          lastName: "Петров",
        },
      }),
    });

    render(<LeadWorkspace leadId="lead-1" />);

    expect(screen.getAllByText("ООО Фасад").length).toBeGreaterThan(0);
    expect(screen.getByText("Иван Петров")).toBeInTheDocument();
    expect(screen.getByText("+998901112233")).toBeInTheDocument();
    expect(screen.getByText("office@fasad.uz")).toBeInTheDocument();
  });

  it("displays em dash when phone and email are missing", () => {
    setupWorkspace({
      permissions: MANAGER_PERMISSIONS,
      roles: ["MANAGER"],
      currentUserId: "manager-1",
      leadData: lead({
        client: { id: "client-1", name: "ООО Фасад" },
      }),
    });

    render(<LeadWorkspace leadId="lead-1" />);

    const phone = screen.getByText("Телефон").parentElement;
    const email = screen.getByText("Email").parentElement;
    expect(phone).toHaveTextContent("—");
    expect(email).toHaveTextContent("—");
  });

  it("does not copy the client name into the contact person field", () => {
    setupWorkspace({
      permissions: MANAGER_PERMISSIONS,
      roles: ["MANAGER"],
      currentUserId: "manager-1",
      leadData: lead({
        client: { id: "client-1", name: "ООО Фасад", phone: "+998901112233" },
      }),
    });

    render(<LeadWorkspace leadId="lead-1" />);

    const contactField = screen.getByText("Контакт", {
      selector: ".uppercase",
    }).parentElement;
    expect(contactField).toHaveTextContent("—");
    expect(screen.getByText("+998901112233")).toBeInTheDocument();
  });
});

describe("LeadWorkspace Stage 2 commercial separation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    confirmCommercialMutateAsync.mockReset();
    confirmCommercialMutateAsync.mockResolvedValue({});
  });

  async function selectSupplier(label: string) {
    await userEvent.click(screen.getByRole("button", { name: /Поставщик/ }));
    await userEvent.click(
      screen.getByRole("button", { name: new RegExp(label) }),
    );
  }

  async function openQualitySelector() {
    await userEvent.click(screen.getByRole("button", { name: "Линейка" }));
  }

  it("does not let MANAGER select supplier, quality lines or timeline", () => {
    setupWorkspace({
      permissions: MANAGER_PERMISSIONS,
      roles: ["MANAGER"],
      currentUserId: "manager-1",
    });

    render(<LeadWorkspace leadId="lead-1" />);

    expect(
      screen.queryByText("Коммерческая квалификация"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Поставщик/ }),
    ).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Срок реализации")).not.toBeInTheDocument();
    expect(
      document.querySelector('input[type="date"]'),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Эконом")).not.toBeInTheDocument();
    expect(screen.queryByText("Медиум")).not.toBeInTheDocument();
    expect(screen.queryByText("Премиум")).not.toBeInTheDocument();
  });

  it("does not expose Stage 2 timeline to DIRECTOR or ADMIN-only", () => {
    setupWorkspace({
      permissions: DIRECTOR_PERMISSIONS,
      roles: ["DIRECTOR"],
      currentUserId: "director-1",
    });

    const { unmount } = render(<LeadWorkspace leadId="lead-1" />);

    expect(
      screen.queryByText("Коммерческая квалификация"),
    ).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Срок реализации")).not.toBeInTheDocument();
    unmount();

    setupWorkspace({
      permissions: ["leads:read", "leads:read_all"],
      roles: ["ADMIN"],
      currentUserId: "admin-1",
    });
    render(<LeadWorkspace leadId="lead-1" />);

    expect(
      screen.queryByText("Коммерческая квалификация"),
    ).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Срок реализации")).not.toBeInTheDocument();
  });

  it("keeps a neutral quality placeholder before and after supplier selection", async () => {
    setupWorkspace({
      permissions: HEAD_PERMISSIONS,
      roles: ["HEAD"],
      currentUserId: "head-1",
    });

    render(<LeadWorkspace leadId="lead-1" />);

    expect(screen.getByRole("button", { name: "Линейка" })).toHaveTextContent(
      QUALITY_LINE_PLACEHOLDER,
    );
    expect(
      screen.queryByRole("button", { name: /Эконом \/ Медиум \/ Премиум/ }),
    ).not.toBeInTheDocument();

    await selectSupplier("Тианран");

    expect(screen.getByRole("button", { name: "Линейка" })).toHaveTextContent(
      QUALITY_LINE_PLACEHOLDER,
    );
  });

  it("lets HEAD choose the backend-mapped INTERIOR + Tianran line", async () => {
    setupWorkspace({
      permissions: HEAD_PERMISSIONS,
      roles: ["HEAD"],
      currentUserId: "head-1",
    });

    render(<LeadWorkspace leadId="lead-1" />);

    expect(screen.getByText("Коммерческая квалификация")).toBeInTheDocument();
    expect(screen.getByLabelText("Срок реализации")).toBeInTheDocument();

    await selectSupplier("Тианран");
    await openQualitySelector();

    expect(screen.getByRole("button", { name: /^Эконом/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Медиум/ })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /^Премиум/ }),
    ).toBeInTheDocument();
  });

  it("shows FURNITURE Stage 1 context as read-only for HEAD", () => {
    setupWorkspace({
      permissions: HEAD_PERMISSIONS,
      roles: ["HEAD"],
      currentUserId: "head-1",
      leadData: lead({ qualification: furnitureQualification() }),
    });

    render(<LeadWorkspace leadId="lead-1" />);

    expect(screen.getAllByText("Мебельный").length).toBe(1);
    expect(screen.getAllByText("2.9 мм").length).toBe(1);
    expect(screen.getAllByText("Кухонные фасады").length).toBe(1);
    expect(screen.getByText("Квалификация клиента")).toBeInTheDocument();
    expect(screen.queryByText("Контекст Stage 1")).not.toBeInTheDocument();
    expect(screen.queryByText("Потребность HPL")).not.toBeInTheDocument();
  });

  it.each(["Вуя", "Тианран", "Полибет"] as const)(
    "renders FURNITURE backend mapping for %s",
    async (supplierLabel) => {
      setupWorkspace({
        permissions: HEAD_PERMISSIONS,
        roles: ["HEAD"],
        currentUserId: "head-1",
        leadData: lead({ qualification: furnitureQualification() }),
      });

      render(<LeadWorkspace leadId="lead-1" />);

      await selectSupplier(supplierLabel);
      await openQualitySelector();

      expect(useSupplierQualityClassesMock).toHaveBeenCalledWith(
        supplierLabel === "Вуя"
          ? "wuya"
          : supplierLabel === "Тианран"
            ? "tianran"
            : "polybet",
        "furniture",
      );
      expect(
        screen.getByRole("button", { name: /^Эконом/ }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /^Медиум/ }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /^Премиум/ }),
      ).toBeInTheDocument();
      expect(
        screen.queryByText(QUALITY_LINES_EMPTY_MESSAGE),
      ).not.toBeInTheDocument();
    },
  );

  it.each(["Вуя", "Тианран", "Полибет"] as const)(
    "renders LABORATORY backend mapping for %s",
    async (supplierLabel) => {
      setupWorkspace({
        permissions: HEAD_PERMISSIONS,
        roles: ["HEAD"],
        currentUserId: "head-1",
        leadData: lead({ qualification: laboratoryQualification() }),
      });

      render(<LeadWorkspace leadId="lead-1" />);

      await selectSupplier(supplierLabel);
      await openQualitySelector();

      expect(
        screen.getByRole("button", { name: /^Эконом/ }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /^Медиум/ }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /^Премиум/ }),
      ).toBeInTheDocument();
    },
  );

  it("keeps INTERIOR mappings and does not apply FURNITURE rules globally", async () => {
    setupWorkspace({
      permissions: HEAD_PERMISSIONS,
      roles: ["HEAD"],
      currentUserId: "head-1",
    });

    render(<LeadWorkspace leadId="lead-1" />);

    await selectSupplier("Вуя");
    await openQualitySelector();
    expect(screen.getByRole("button", { name: /^Эконом/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Медиум/ })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Вуя/ }));
    await userEvent.click(screen.getByRole("button", { name: /Полибет/ }));
    await openQualitySelector();
    expect(
      screen.getByRole("button", { name: /^Премиум/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Эконом/ })).toBeInTheDocument();
  });

  it("keeps EXTERIOR_WITH_UV mappings and hides Tianran + Эконом", async () => {
    setupWorkspace({
      permissions: HEAD_PERMISSIONS,
      roles: ["HEAD"],
      currentUserId: "head-1",
      leadData: lead({ qualification: exteriorQualification() }),
    });

    render(<LeadWorkspace leadId="lead-1" />);

    await selectSupplier("Тианран");
    await openQualitySelector();
    expect(screen.getByRole("button", { name: /^Медиум/ })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /^Премиум/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Эконом/ })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Тианран/ }));
    await userEvent.click(screen.getByRole("button", { name: /Вуя/ }));
    await openQualitySelector();
    expect(screen.getByRole("button", { name: /^Эконом/ })).toBeInTheDocument();
  });

  it("shows the empty-mapping configuration message when backend returns no lines", async () => {
    setupWorkspace({
      permissions: HEAD_PERMISSIONS,
      roles: ["HEAD"],
      currentUserId: "head-1",
      leadData: lead({ qualification: furnitureQualification() }),
    });
    useSupplierQualityClassesMock.mockImplementation(() => ({
      data: [],
      isFetching: false,
      isSuccess: true,
      isError: false,
    }));

    render(<LeadWorkspace leadId="lead-1" />);

    await selectSupplier("Вуя");

    expect(screen.getByText(QUALITY_LINES_EMPTY_MESSAGE)).toBeInTheDocument();
  });

  it("submits Stage 2 commercial qualification without Stage 1 fields", async () => {
    setupWorkspace({
      permissions: HEAD_PERMISSIONS,
      roles: ["HEAD"],
      currentUserId: "head-1",
      leadData: lead({ qualification: furnitureQualification() }),
    });

    render(<LeadWorkspace leadId="lead-1" />);

    await selectSupplier("Вуя");
    await openQualitySelector();
    await userEvent.click(screen.getByRole("button", { name: /^Эконом/ }));
    fireEvent.change(screen.getByLabelText("Срок реализации"), {
      target: { value: "2026-09-15" },
    });
    await userEvent.type(
      screen.getByPlaceholderText("Комментарий"),
      "Срок согласован",
    );
    await userEvent.click(screen.getByRole("button", { name: "Подтвердить" }));

    expect(confirmCommercialMutateAsync).toHaveBeenCalledTimes(1);
    expect(confirmCommercialMutateAsync).toHaveBeenCalledWith({
      id: "lead-1",
      supplierId: "sup-wuya",
      qualityClassId: "q-economy",
      targetDate: dateInputToIso("2026-09-15"),
      decisionComment: "Срок согласован",
    });
    const payload = confirmCommercialMutateAsync.mock.calls[0]?.[0] as Record<
      string,
      unknown
    >;
    expect(payload).not.toHaveProperty("application");
    expect(payload).not.toHaveProperty("panelTypeId");
    expect(payload).not.toHaveProperty("thicknessMm");
  });

  it("renders saved commercial summary with Вуя, Эконом and targetDate", () => {
    const targetDate = "2026-09-15T00:00:00.000Z";
    setupWorkspace({
      permissions: MANAGER_PERMISSIONS,
      roles: ["MANAGER"],
      currentUserId: "manager-1",
      leadData: lead({
        qualification: furnitureQualification(),
        targetDate,
      }),
      commercialQualification: {
        id: "cq-1",
        leadId: "lead-1",
        supplierId: "sup-wuya",
        qualityClassId: "q-economy",
        mappingId: "map-1",
        status: "CONFIRMED",
        targetDate,
        confirmedById: "head-1",
        confirmedAt: "2026-08-20T10:00:00.000Z",
        supplier: { id: "sup-wuya", code: "wuya", name: "Wuya" },
        qualityClass: { id: "q-economy", code: "economy", nameRu: "Economy" },
      },
    });

    render(<LeadWorkspace leadId="lead-1" />);

    const commercialSection = screen.getByText(
      "Коммерческие данные",
    ).parentElement;
    expect(commercialSection).toHaveTextContent("Поставщик");
    expect(commercialSection).toHaveTextContent("Вуя");
    expect(commercialSection).toHaveTextContent("Линейка");
    expect(commercialSection).toHaveTextContent("Эконом");
    expect(commercialSection).toHaveTextContent("Срок реализации");
    expect(commercialSection).toHaveTextContent(formatDate(targetDate));
    expect(commercialSection).not.toHaveTextContent("Буя");
    expect(commercialSection).not.toHaveTextContent("wuya");
    expect(commercialSection).not.toHaveTextContent("q-economy");
    expect(screen.queryByLabelText("Срок реализации")).not.toBeInTheDocument();
    expect(screen.queryByText("Целевая дата")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Коммерческая квалификация"),
    ).not.toBeInTheDocument();
  });
});

describe("LeadWorkspace Manager customer note handoff", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useCalculationRequestsMock.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    });
    saveNoteMutateAsync.mockResolvedValue({
      leadId: "lead-1",
      commercialNote: "CIP Tashkent",
      managerCommercialNoteUpdatedAt: "2026-08-20T11:00:00.000Z",
      managerCommercialInputReadyAt: null,
      managerCommercialInputReadyById: null,
    });
    handoffMutateAsync.mockResolvedValue({
      leadId: "lead-1",
      commercialNote: "CIP Tashkent",
      managerCommercialNoteUpdatedAt: "2026-08-20T11:00:00.000Z",
      managerCommercialInputReadyAt: "2026-08-20T12:00:00.000Z",
      managerCommercialInputReadyById: "manager-1",
    });
  });

  it("lets MANAGER edit the customer note textarea", () => {
    setupWorkspace({
      permissions: MANAGER_PERMISSIONS,
      roles: ["MANAGER"],
      currentUserId: "manager-1",
      leadData: lead({
        managerCommercialNote: "Нужен CIP Tashkent",
      }),
    });

    render(<LeadWorkspace leadId="lead-1" />);

    expect(
      screen.getByLabelText("Примечание / пожелания клиента"),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Примечание / пожелания клиента")).toHaveValue(
      "Нужен CIP Tashkent",
    );
    expect(
      screen.getByText(
        "Укажите пожелания клиента, условия, комментарии или информацию, которую нужно учесть при подготовке КП.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Отправить руководителю" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByLabelText("Закупочная цена, CNY/м²"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("Коммерческая квалификация"),
    ).not.toBeInTheDocument();
  });

  it("lets HEAD read the same note without an editor", () => {
    setupWorkspace({
      permissions: HEAD_PERMISSIONS,
      roles: ["HEAD"],
      currentUserId: "head-1",
      leadData: lead({
        managerCommercialNote: "Нужен CIP Tashkent",
        managerCommercialInputReadyAt: "2026-08-20T12:00:00.000Z",
      }),
    });

    render(<LeadWorkspace leadId="lead-1" />);

    expect(
      screen.getByText("Примечание менеджера / пожелания клиента"),
    ).toBeInTheDocument();
    expect(screen.getByText("Нужен CIP Tashkent")).toBeInTheDocument();
    expect(
      screen.queryByLabelText("Примечание / пожелания клиента"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Отправить руководителю" }),
    ).not.toBeInTheDocument();
  });

  it("hides the Info manager note after a calculation request exists", () => {
    useCalculationRequestsMock.mockReturnValue({
      data: [
        {
          id: "req-1",
          notes:
            "Клиент хочет жёлтый декор, окончательный цвет согласовать перед заказом.",
        },
      ],
      isLoading: false,
      isError: false,
    });
    setupWorkspace({
      permissions: HEAD_PERMISSIONS,
      roles: ["HEAD"],
      currentUserId: "head-1",
      leadData: lead({
        managerCommercialNote: null,
        managerCommercialInputReadyAt: "2026-08-20T12:00:00.000Z",
      }),
    });

    render(<LeadWorkspace leadId="lead-1" />);

    expect(
      screen.queryByText("Примечание менеджера / пожелания клиента"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(
        "Клиент хочет жёлтый декор, окончательный цвет согласовать перед заказом.",
      ),
    ).not.toBeInTheDocument();
  });

  it("saves the note without handing off to HEAD", async () => {
    setupWorkspace({
      permissions: MANAGER_PERMISSIONS,
      roles: ["MANAGER"],
      currentUserId: "manager-1",
    });

    render(<LeadWorkspace leadId="lead-1" />);

    await userEvent.type(
      screen.getByLabelText("Примечание / пожелания клиента"),
      "Условия поставки CIP",
    );
    await userEvent.click(screen.getByRole("button", { name: "Сохранить" }));

    expect(saveNoteMutateAsync).toHaveBeenCalledWith({
      id: "lead-1",
      commercialNote: "Условия поставки CIP",
    });
    expect(handoffMutateAsync).not.toHaveBeenCalled();
  });

  it("shows the handoff success state after sending to HEAD", async () => {
    setupWorkspace({
      permissions: MANAGER_PERMISSIONS,
      roles: ["MANAGER"],
      currentUserId: "manager-1",
    });

    render(<LeadWorkspace leadId="lead-1" />);

    await userEvent.click(
      screen.getByRole("button", { name: "Отправить руководителю" }),
    );

    expect(handoffMutateAsync).toHaveBeenCalledWith("lead-1");
    expect(
      await screen.findByText("Передано руководителю"),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Отправить руководителю" }),
    ).not.toBeInTheDocument();
  });

  it("shows the saved manager note after lead refetch without overwriting Need", () => {
    setupWorkspace({
      permissions: MANAGER_PERMISSIONS,
      roles: ["MANAGER"],
      currentUserId: "manager-1",
      leadData: lead({
        needDescription: "Фасад бизнес-центра",
        managerCommercialNote: null,
        qualification: furnitureQualification({
          customerRequirements: "Фасад бизнес-центра",
        }),
      }),
    });
    const view = render(<LeadWorkspace leadId="lead-1" />);
    expect(
      screen.getByLabelText("Примечание / пожелания клиента"),
    ).toHaveValue("");
    expect(screen.getByText("Фасад бизнес-центра")).toBeInTheDocument();

    setupWorkspace({
      permissions: MANAGER_PERMISSIONS,
      roles: ["MANAGER"],
      currentUserId: "manager-1",
      leadData: lead({
        needDescription: "Фасад бизнес-центра",
        managerCommercialNote:
          "Клиент хочет получить предложение до пятницы",
        qualification: furnitureQualification({
          customerRequirements: "Фасад бизнес-центра",
        }),
      }),
    });
    view.rerender(<LeadWorkspace leadId="lead-1" />);

    expect(
      screen.getByLabelText("Примечание / пожелания клиента"),
    ).toHaveValue("Клиент хочет получить предложение до пятницы");
    expect(screen.getByText("Фасад бизнес-центра")).toBeInTheDocument();
  });
});

describe("LeadWorkspace Info tab duplicate cleanup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows customer need once in qualification context", () => {
    const need = "HPL панели для фасада школы";
    setupWorkspace({
      permissions: MANAGER_PERMISSIONS,
      roles: ["MANAGER"],
      currentUserId: "manager-1",
      leadData: lead({
        needDescription: need,
        qualification: furnitureQualification({
          customerRequirements: need,
        }),
      }),
    });

    render(<LeadWorkspace leadId="lead-1" />);

    expect(screen.getAllByText(need)).toHaveLength(1);
    expect(screen.getAllByText("Потребность", { selector: ".uppercase" })).toHaveLength(
      1,
    );
    expect(screen.queryByText("Потребность HPL")).not.toBeInTheDocument();
  });

  it("renders Stage 1 context once", () => {
    setupWorkspace({
      permissions: HEAD_PERMISSIONS,
      roles: ["HEAD"],
      currentUserId: "head-1",
      leadData: lead({
        qualification: furnitureQualification(),
      }),
    });

    render(<LeadWorkspace leadId="lead-1" />);

    expect(screen.getAllByText("Квалификация клиента")).toHaveLength(1);
    expect(screen.queryByText("Контекст Stage 1")).not.toBeInTheDocument();
    expect(screen.getAllByText("Дедлайн клиента")).toHaveLength(1);
    expect(screen.getAllByText("Стадия объекта")).toHaveLength(1);
    expect(screen.getAllByText("Вентфасад уже есть?")).toHaveLength(1);
    expect(screen.getAllByText("Комплектация вентфасада")).toHaveLength(1);
  });

  it("does not duplicate installation in Status", () => {
    setupWorkspace({
      permissions: MANAGER_PERMISSIONS,
      roles: ["MANAGER"],
      currentUserId: "manager-1",
      leadData: lead({
        qualification: furnitureQualification({ installationRequired: true }),
      }),
    });

    render(<LeadWorkspace leadId="lead-1" />);

    const qualification = screen.getByText("Квалификация клиента").parentElement;
    expect(qualification).toHaveTextContent("Монтаж");
    expect(qualification).toHaveTextContent("Да");

    const status = screen.getByRole("heading", { name: "Статус" }).parentElement;
    expect(status).not.toBeNull();
    expect(within(status as HTMLElement).queryByText("Монтаж")).not.toBeInTheDocument();
  });

  it("hides empty commercial summary while HEAD still sees the editable form", () => {
    setupWorkspace({
      permissions: HEAD_PERMISSIONS,
      roles: ["HEAD"],
      currentUserId: "head-1",
    });

    render(<LeadWorkspace leadId="lead-1" />);

    expect(screen.queryByText("Коммерческие данные")).not.toBeInTheDocument();
    expect(screen.getByText("Коммерческая квалификация")).toBeInTheDocument();
    expect(screen.getByLabelText("Срок реализации")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Подтвердить" })).toBeInTheDocument();
  });

  it("keeps saved commercial summary for MANAGER without the editable form", () => {
    const targetDate = "2026-09-15T00:00:00.000Z";
    setupWorkspace({
      permissions: MANAGER_PERMISSIONS,
      roles: ["MANAGER"],
      currentUserId: "manager-1",
      leadData: lead({ targetDate }),
      commercialQualification: {
        id: "cq-1",
        leadId: "lead-1",
        supplierId: "sup-wuya",
        qualityClassId: "q-economy",
        mappingId: "map-1",
        status: "CONFIRMED",
        targetDate,
        confirmedById: "head-1",
        confirmedAt: "2026-08-20T10:00:00.000Z",
        supplier: { id: "sup-wuya", code: "wuya", name: "Wuya" },
        qualityClass: { id: "q-economy", code: "economy", nameRu: "Economy" },
      },
    });

    render(<LeadWorkspace leadId="lead-1" />);

    const commercialSection = screen.getByText("Коммерческие данные").parentElement;
    expect(commercialSection).toHaveTextContent("Вуя");
    expect(commercialSection).toHaveTextContent("Эконом");
    expect(screen.queryByText("Коммерческая квалификация")).not.toBeInTheDocument();
  });

  it("keeps the HEAD commercial form after confirmation alongside the saved summary", () => {
    const targetDate = "2026-09-15T00:00:00.000Z";
    setupWorkspace({
      permissions: HEAD_PERMISSIONS,
      roles: ["HEAD"],
      currentUserId: "head-1",
      leadData: lead({ targetDate }),
      commercialQualification: {
        id: "cq-1",
        leadId: "lead-1",
        supplierId: "sup-wuya",
        qualityClassId: "q-economy",
        mappingId: "map-1",
        status: "CONFIRMED",
        targetDate,
        confirmedById: "head-1",
        confirmedAt: "2026-08-20T10:00:00.000Z",
        supplier: { id: "sup-wuya", code: "wuya", name: "Wuya" },
        qualityClass: { id: "q-economy", code: "economy", nameRu: "Economy" },
      },
    });

    render(<LeadWorkspace leadId="lead-1" />);

    expect(screen.getByText("Коммерческие данные")).toBeInTheDocument();
    expect(screen.getByText("Коммерческая квалификация")).toBeInTheDocument();
    expect(screen.getByLabelText("Срок реализации")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Подтвердить" })).toBeInTheDocument();
  });
});

describe("LeadWorkspace calculation action placement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("keeps request and saved-calculation actions on the Calculations tab only", async () => {
    setupWorkspace({
      permissions: HEAD_PERMISSIONS,
      roles: ["HEAD"],
      currentUserId: "head-1",
    });

    render(<LeadWorkspace leadId="lead-1" />);

    expect(
      screen.queryByRole("button", { name: "Новый расчёт" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Создать запрос расчёта" }),
    ).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Расчёты" }));

    expect(
      screen.queryByRole("button", { name: "Создать запрос расчёта" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Отправить руководителю" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Новый расчёт" })).toBeInTheDocument();
    expect(screen.getByText("Сохранённые расчёты")).toBeInTheDocument();
  });

  it("does not show saved-calculation action to MANAGER", async () => {
    setupWorkspace({
      permissions: MANAGER_PERMISSIONS,
      roles: ["MANAGER"],
      currentUserId: "manager-1",
    });

    render(<LeadWorkspace leadId="lead-1" />);
    await userEvent.click(screen.getByRole("button", { name: "Расчёты" }));

    expect(
      screen.queryByRole("button", { name: "Создать запрос расчёта" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Новый расчёт" }),
    ).not.toBeInTheDocument();
  });

  it("keeps Quote tab copy unchanged", async () => {
    setupWorkspace({
      permissions: MANAGER_PERMISSIONS,
      roles: ["MANAGER"],
      currentUserId: "manager-1",
    });

    render(<LeadWorkspace leadId="lead-1" />);
    await userEvent.click(screen.getByRole("button", { name: "КП" }));

    expect(screen.getByText("Коммерческие предложения")).toBeInTheDocument();
    expect(
      screen.getByText("История предложений по этому лиду"),
    ).toBeInTheDocument();
    expect(screen.getByText("КП пока нет.")).toBeInTheDocument();
  });
});
