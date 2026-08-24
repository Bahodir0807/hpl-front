import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ClientQuotes } from "./client-quotes";
import type { Quote } from "@/types/hpl";

const useAuthMock = vi.fn();
const useClientQuotesMock = vi.fn();
const useQuoteMock = vi.fn();
const downloadPdf = vi.fn();
const downloadDocx = vi.fn();

vi.mock("@/context/auth-context", () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock("@/hooks/use-quotes", () => ({
  useClientQuotes: (...args: unknown[]) => useClientQuotesMock(...args),
  useQuote: (...args: unknown[]) => useQuoteMock(...args),
  useUpdateQuoteStatus: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateQuoteCommercialTerms: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useRecordQuoteClientAcceptance: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useConvertQuoteToDeal: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDownloadQuotePdf: () => ({
    mutateAsync: downloadPdf,
    isPending: false,
    variables: undefined,
  }),
  useDownloadQuoteDocx: () => ({
    mutateAsync: downloadDocx,
    isPending: false,
    variables: undefined,
  }),
  useApproveQuotePricing: () => ({ mutateAsync: vi.fn(), isPending: false }),
  usePreviewQuotePricing: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useFinalizeQuote: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useCreateQuoteVersion: () => ({ mutateAsync: vi.fn(), isPending: false }),
  isQuoteTermsLockedError: () => false,
}));

vi.mock("@/components/quotes/quote-card", () => ({
  QuoteCard: ({ quote }: { quote: Quote }) => <div>Открыто КП {quote.id}</div>,
}));

function quote(id: string, overrides: Partial<Quote> = {}): Quote {
  return {
    id,
    leadId: "lead-1",
    clientId: "client-1",
    managerId: "manager-1",
    status: "draft",
    items: [],
    totalAmount: "1000",
    createdAt: "2026-08-20T10:00:00.000Z",
    updatedAt: "2026-08-20T10:00:00.000Z",
    ...overrides,
  };
}

describe("ClientQuotes history", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthMock.mockReturnValue({
      user: {
        id: "manager-1",
        permissions: ["quotes:read", "quotes:client_accept"],
      },
    });
    useQuoteMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });
  });

  it("loads GET /quotes?clientId= through the client quotes hook", () => {
    useClientQuotesMock.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    });
    render(<ClientQuotes clientId="client-1" />);
    expect(useClientQuotesMock).toHaveBeenCalledWith("client-1");
  });

  it("shows an empty quote history", () => {
    useClientQuotesMock.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    });
    render(<ClientQuotes clientId="client-1" />);
    expect(
      screen.getByText("Коммерческих предложений пока нет."),
    ).toBeInTheDocument();
  });

  it("renders multiple quotes and opens an old quote via GET, not convert", async () => {
    useClientQuotesMock.mockReturnValue({
      data: [
        quote("quote-1", { number: "КП-1" }),
        quote("quote-2", { number: "КП-2" }),
      ],
      isLoading: false,
      isError: false,
    });
    useQuoteMock.mockReturnValue({
      data: quote("quote-1", {
        number: "КП-1",
        finalizedAt: "2026-08-21T12:00:00.000Z",
      }),
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    render(<ClientQuotes clientId="client-1" />);
    expect(screen.getByText("КП-1")).toBeInTheDocument();
    expect(screen.getByText("КП-2")).toBeInTheDocument();

    await userEvent.click(
      screen.getAllByRole("button", { name: "Открыть" })[0],
    );
    expect(useQuoteMock).toHaveBeenCalledWith("quote-1");
    expect(screen.getByText("Открыто КП quote-1")).toBeInTheDocument();
  });

  it("downloads PDF and DOCX only after finalize for a manager", async () => {
    useClientQuotesMock.mockReturnValue({
      data: [quote("quote-1", { finalizedAt: "2026-08-21T12:00:00.000Z" })],
      isLoading: false,
      isError: false,
    });
    render(<ClientQuotes clientId="client-1" />);
    await userEvent.click(screen.getByRole("button", { name: "PDF" }));
    expect(downloadPdf).toHaveBeenCalledWith("quote-1");
    await userEvent.click(screen.getByRole("button", { name: "DOCX" }));
    expect(downloadDocx).toHaveBeenCalledWith("quote-1");
  });

  it("does not let a manager download a draft Quote PDF", () => {
    useClientQuotesMock.mockReturnValue({
      data: [quote("quote-1")],
      isLoading: false,
      isError: false,
    });
    render(<ClientQuotes clientId="client-1" />);
    expect(screen.getByRole("button", { name: "PDF" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "DOCX" })).toBeDisabled();
  });
});
