import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { CalculationRequestForm } from "./calculation-request-form";
import {
  ADD_CALCULATION_LABEL,
  ADD_HPL_ROW_LABEL,
  CUSTOM_TYPE_DESCRIPTION_LABEL,
  SUBMIT_TO_HEAD_LABEL,
  createEmptyRequestForm,
  createEmptyRequestItem,
  serializeCalculationRequest,
  type CalculationRequestFormValues,
} from "@/lib/calculation-request";
import { QUALITY_LINES_NOT_FOUND } from "@/lib/quality-line-presentation";

const catalogs = {
  panelTypes: [
    { id: "type-interior", code: "interior", displayNameRu: "Интерьер" },
    { id: "type-furniture", code: "furniture", displayNameRu: "Мебельный" },
    { id: "type-other", code: "other", displayNameRu: "Другой" },
  ],
  panelSizes: [
    { id: "size-1", widthMm: 1220, heightMm: 2440, displayName: "1220 × 2440" },
    {
      id: "size-1830",
      widthMm: 1830,
      heightMm: 3050,
      displayName: "1830 × 3050",
    },
    {
      id: "size-sq",
      widthMm: 1000,
      heightMm: 1000,
      displayName: "1000 × 1000",
    },
  ],
  qualityClasses: [
    { id: "q-economy", code: "economy", nameRu: "Эконом" },
    { id: "q-medium", code: "medium", nameRu: "Медиум" },
    { id: "q-premium", code: "premium", nameRu: "Премиум" },
  ],
  panelColors: [
    {
      id: "color-wenge",
      supplierId: "sup-1",
      name: "Wenge",
      code: "WEN",
    },
  ],
  suppliers: [
    { id: "sup-1", code: "wuya" as const, name: "Wuya", deliveryDays: 10 },
    {
      id: "sup-2",
      code: "tianran" as const,
      name: "Tianran",
      deliveryDays: 14,
    },
  ],
};

function Harness({
  onSubmit,
}: {
  onSubmit?: (form: CalculationRequestFormValues) => void;
}) {
  const [value, setValue] = useState(createEmptyRequestForm());
  return (
    <CalculationRequestForm
      value={value}
      onChange={setValue}
      catalogs={catalogs}
      canSubmitToHead
      onSubmitToHead={() => onSubmit?.(value)}
    />
  );
}

async function openQualityLine(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Линейка, строка 1" }));
}

describe("CalculationRequestForm", () => {
  it("lets a manager add a second calculation and multiple HPL rows", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("button", { name: ADD_HPL_ROW_LABEL }));
    expect(screen.getAllByLabelText(/Тип HPL, строка/)).toHaveLength(2);

    await user.click(
      screen.getByRole("button", { name: ADD_CALCULATION_LABEL }),
    );
    expect(screen.getByText("Расчёт №2")).toBeInTheDocument();
    expect(screen.getAllByLabelText(/Тип HPL, строка/).length).toBeGreaterThan(
      2,
    );
  });

  it("duplicates a row without keeping the persisted id", async () => {
    const user = userEvent.setup();
    function DuplicateHarness() {
      const [value, setValue] = useState(() => {
        const form = createEmptyRequestForm();
        form.calculations[0].items[0].id = "persisted-1";
        form.calculations[0].items[0].panelTypeId = "type-interior";
        return form;
      });
      return (
        <CalculationRequestForm
          value={value}
          onChange={setValue}
          catalogs={catalogs}
        />
      );
    }

    render(<DuplicateHarness />);
    await user.click(
      screen.getByRole("button", { name: "Дублировать строку 1" }),
    );
    expect(screen.getAllByLabelText(/Тип HPL, строка/)).toHaveLength(2);
    expect(screen.getAllByLabelText(/Тип HPL, строка/)[1]).toHaveValue(
      "type-interior",
    );
  });

  it("deletes a row", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: ADD_HPL_ROW_LABEL }));
    await user.click(screen.getByRole("button", { name: "Удалить строку 2" }));
    expect(screen.getAllByLabelText(/Тип HPL, строка/)).toHaveLength(1);
  });

  it("does not show a manufacturer field in the manager form", () => {
    render(<Harness />);
    expect(screen.queryByText("Производитель")).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText(/Производитель, строка/),
    ).not.toBeInTheDocument();
  });

  it("lets HEAD assign suppliers independently to each HPL row", async () => {
    const user = userEvent.setup();
    const form = createEmptyRequestForm();
    form.calculations[0].items = [
      {
        ...createEmptyRequestItem(),
        panelTypeId: "type-interior",
        supplierId: "sup-1",
      },
      {
        ...createEmptyRequestItem(),
        panelTypeId: "type-interior",
        supplierId: "sup-2",
      },
    ];
    const onChange = vi.fn();

    render(
      <CalculationRequestForm
        value={form}
        onChange={onChange}
        catalogs={catalogs}
        canEditSupplier
      />,
    );

    const suppliers = screen.getAllByLabelText(/Поставщик, строка/);
    expect(suppliers).toHaveLength(2);
    expect(suppliers[0]).toHaveValue("sup-1");
    expect(suppliers[1]).toHaveValue("sup-2");

    await user.selectOptions(suppliers[0], "sup-2");
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        calculations: [
          expect.objectContaining({
            items: expect.arrayContaining([
              expect.objectContaining({ supplierId: "sup-2" }),
            ]),
          }),
        ],
      }),
    );
  });

  it("loads the global economy/medium/premium catalog without supplier", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await openQualityLine(user);
    expect(screen.getByRole("button", { name: /^Эконом/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Медиум/ })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /^Премиум/ }),
    ).toBeInTheDocument();
    expect(screen.queryByText(QUALITY_LINES_NOT_FOUND)).not.toBeInTheDocument();
  });

  it("keeps the selected global quality class when panel type changes", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await openQualityLine(user);
    await user.click(screen.getByRole("button", { name: /^Медиум/ }));
    expect(
      screen.getByRole("button", { name: "Линейка, строка 1" }),
    ).toHaveTextContent("Медиум");

    await user.selectOptions(
      screen.getByLabelText("Тип HPL, строка 1"),
      "type-furniture",
    );
    expect(
      screen.getByRole("button", { name: "Линейка, строка 1" }),
    ).toHaveTextContent("Медиум");
  });

  it("does not invent quality classes when the global backend catalog is empty", async () => {
    const user = userEvent.setup();
    const emptyCatalogs = { ...catalogs, qualityClasses: [] };
    render(
      <CalculationRequestForm
        value={createEmptyRequestForm()}
        onChange={vi.fn()}
        catalogs={emptyCatalogs}
      />,
    );

    await openQualityLine(user);
    expect(screen.getByText(QUALITY_LINES_NOT_FOUND)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^Эконом/ }),
    ).not.toBeInTheDocument();
  });

  it("shows customTypeDescription for catalog type other", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    expect(
      screen.queryByLabelText(CUSTOM_TYPE_DESCRIPTION_LABEL),
    ).not.toBeInTheDocument();
    await user.selectOptions(
      screen.getByLabelText("Тип HPL, строка 1"),
      "type-other",
    );
    expect(
      screen.getByLabelText(CUSTOM_TYPE_DESCRIPTION_LABEL),
    ).toBeInTheDocument();
  });

  it("shows row validation and the submit-to-head action without convert/finalize", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} />);

    expect(
      screen.getByRole("button", { name: SUBMIT_TO_HEAD_LABEL }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Создать черновик КП" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Сформировать КП" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText(/Утверждённая цена/),
    ).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: SUBMIT_TO_HEAD_LABEL }),
    );
    expect(onSubmit).toHaveBeenCalled();
  });

  it("keeps the standard size select visible and maps Decor to a PanelColor id", async () => {
    const user = userEvent.setup();
    function DecorHarness() {
      const [value, setValue] = useState(createEmptyRequestForm());
      return (
        <div>
          <CalculationRequestForm
            value={value}
            onChange={setValue}
            catalogs={catalogs}
          />
          <output aria-label="Выбранный colorId">
            {value.calculations[0].items[0].colorId}
          </output>
        </div>
      );
    }

    render(<DecorHarness />);
    expect(screen.getByLabelText("Размер, строка 1")).toBeInTheDocument();
    expect(
      screen.queryByLabelText("Ширина мм, строка 1"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText("Высота мм, строка 1"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("option", { name: "Нестандартный" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("option", { name: "Нестандартный размер" }),
    ).not.toBeInTheDocument();

    await user.selectOptions(
      screen.getByLabelText("Декор, строка 1"),
      "color-wenge",
    );
    expect(screen.getByLabelText("Выбранный colorId")).toHaveTextContent(
      "color-wenge",
    );
    expect(screen.getByLabelText("Декор, строка 1")).toHaveValue("color-wenge");
  });

  it("keeps add/duplicate/delete as non-submit buttons", () => {
    render(<Harness />);
    for (const name of [
      ADD_HPL_ROW_LABEL,
      ADD_CALCULATION_LABEL,
      "Дублировать строку 1",
      "Удалить строку 1",
    ]) {
      expect(screen.getByRole("button", { name })).toHaveAttribute(
        "type",
        "button",
      );
    }
  });

  it("does not render an editable sheetsCount field", () => {
    render(<Harness />);

    expect(
      screen.queryByRole("textbox", { name: /Количество, строка 1/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("spinbutton", { name: /Количество/ }),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText("Количество, строка 1").tagName).not.toBe(
      "INPUT",
    );
    expect(screen.getByLabelText("Количество, строка 1")).toHaveTextContent(
      "—",
    );
  });

  it("previews 180 sheets for 1830×3050 mm and 1000 m²", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    expect(screen.getByLabelText("Количество, строка 1")).toHaveTextContent(
      "—",
    );
    await user.type(screen.getByLabelText("Объём м², строка 1"), "1000");
    expect(screen.getByLabelText("Количество, строка 1")).toHaveTextContent(
      "—",
    );

    await user.selectOptions(
      screen.getByLabelText("Размер, строка 1"),
      "size-1830",
    );
    expect(screen.getByLabelText("Количество, строка 1")).toHaveTextContent(
      "180 шт.",
    );
  });

  it("recalculates the preview when area or size changes and ceils fractions", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.selectOptions(
      screen.getByLabelText("Размер, строка 1"),
      "size-sq",
    );
    await user.type(screen.getByLabelText("Объём м², строка 1"), "1.1");
    expect(screen.getByLabelText("Количество, строка 1")).toHaveTextContent(
      "2 шт.",
    );

    await user.clear(screen.getByLabelText("Объём м², строка 1"));
    expect(screen.getByLabelText("Количество, строка 1")).toHaveTextContent(
      "—",
    );
    await user.type(screen.getByLabelText("Объём м², строка 1"), "1000");
    expect(screen.getByLabelText("Количество, строка 1")).toHaveTextContent(
      "1000 шт.",
    );

    await user.selectOptions(
      screen.getByLabelText("Размер, строка 1"),
      "size-1830",
    );
    expect(screen.getByLabelText("Количество, строка 1")).toHaveTextContent(
      "180 шт.",
    );

    await user.selectOptions(
      screen.getByLabelText("Размер, строка 1"),
      "size-1",
    );
    expect(screen.getByLabelText("Количество, строка 1")).toHaveTextContent(
      "336 шт.",
    );

    await user.selectOptions(screen.getByLabelText("Размер, строка 1"), "");
    expect(screen.getByLabelText("Количество, строка 1")).toHaveTextContent(
      "—",
    );
  });

  it("keeps requiredAreaM2 as a decimal string and does not coerce empty to 0", async () => {
    const user = userEvent.setup();
    function AreaHarness() {
      const [value, setValue] = useState(createEmptyRequestForm());
      return (
        <div>
          <CalculationRequestForm
            value={value}
            onChange={setValue}
            catalogs={catalogs}
          />
          <output aria-label="area-raw">
            {JSON.stringify(value.calculations[0].items[0].requiredAreaM2)}
          </output>
        </div>
      );
    }

    render(<AreaHarness />);
    const area = screen.getByLabelText("Объём м², строка 1");
    expect(area).toHaveValue("");
    expect(screen.getByLabelText("area-raw")).toHaveTextContent('""');

    await user.type(area, "10.25");
    expect(area).toHaveValue("10.25");
    expect(screen.getByLabelText("area-raw")).toHaveTextContent('"10.25"');

    await user.clear(area);
    expect(area).toHaveValue("");
    expect(screen.getByLabelText("area-raw")).toHaveTextContent('""');
    expect(screen.getByLabelText("Количество, строка 1")).toHaveTextContent(
      "—",
    );
  });

  it("shows persisted GET sheetsCount as read-only and does not send it on PATCH", async () => {
    const user = userEvent.setup();
    function HydratedHarness() {
      const [value, setValue] = useState(() => {
        const form = createEmptyRequestForm();
        form.calculations[0].items[0] = {
          ...createEmptyRequestItem(),
          id: "item-1",
          qualityClassId: "q-medium",
          panelTypeId: "type-interior",
          thicknessMm: "8",
          panelSizeId: "size-1830",
          requiredAreaM2: "1000",
          sheetsCount: "180",
        };
        return form;
      });
      return (
        <div>
          <CalculationRequestForm
            value={value}
            onChange={setValue}
            catalogs={catalogs}
          />
          <output aria-label="patch-has-sheetsCount">
            {String(
              Object.prototype.hasOwnProperty.call(
                serializeCalculationRequest(value).calculations[0].items[0],
                "sheetsCount",
              ),
            )}
          </output>
        </div>
      );
    }

    render(<HydratedHarness />);
    expect(
      screen.queryByRole("textbox", { name: /Количество, строка 1/ }),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText("Количество, строка 1")).toHaveTextContent(
      "180 шт.",
    );
    expect(screen.getByLabelText("patch-has-sheetsCount")).toHaveTextContent(
      "false",
    );

    await user.clear(screen.getByLabelText("Объём м², строка 1"));
    await user.type(screen.getByLabelText("Объём м², строка 1"), "500");
    expect(screen.getByLabelText("Количество, строка 1")).toHaveTextContent(
      "90 шт.",
    );
    expect(screen.getByLabelText("patch-has-sheetsCount")).toHaveTextContent(
      "false",
    );
  });

  it("duplicates a row without treating persisted sheetsCount as an editable field", async () => {
    const user = userEvent.setup();
    function DuplicateQtyHarness() {
      const [value, setValue] = useState(() => {
        const form = createEmptyRequestForm();
        form.calculations[0].items[0] = {
          ...createEmptyRequestItem(),
          id: "persisted-1",
          panelSizeId: "size-1830",
          requiredAreaM2: "1000",
          sheetsCount: "999",
        };
        return form;
      });
      return (
        <CalculationRequestForm
          value={value}
          onChange={setValue}
          catalogs={catalogs}
        />
      );
    }

    render(<DuplicateQtyHarness />);
    expect(screen.getByLabelText("Количество, строка 1")).toHaveTextContent(
      "999 шт.",
    );

    await user.click(
      screen.getByRole("button", { name: "Дублировать строку 1" }),
    );
    expect(screen.getAllByLabelText(/Количество, строка/)).toHaveLength(2);
    expect(screen.getByLabelText("Количество, строка 2")).toHaveTextContent(
      "180 шт.",
    );
    expect(
      screen.queryByRole("textbox", { name: /Количество, строка 2/ }),
    ).not.toBeInTheDocument();
  });

  it("shows custom width/height only in explicit custom-size mode", () => {
    function CustomSizeHarness() {
      const [value, setValue] = useState(() => {
        const form = createEmptyRequestForm();
        form.calculations[0].items[0].sizeMode = "CUSTOM";
        form.calculations[0].items[0].customWidthMm = "1230";
        form.calculations[0].items[0].customHeightMm = "3050";
        return form;
      });
      return (
        <CalculationRequestForm
          value={value}
          onChange={setValue}
          catalogs={catalogs}
        />
      );
    }

    render(<CustomSizeHarness />);
    expect(screen.getByLabelText("Ширина мм, строка 1")).toHaveValue("1230");
    expect(screen.getByLabelText("Высота мм, строка 1")).toHaveValue("3050");
  });
});
