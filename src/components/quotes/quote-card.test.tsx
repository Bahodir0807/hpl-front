import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Quote } from "@/types/hpl";
import { formatDate } from "@/lib/format";
import {
  DELIVERY_REQUIRED_MESSAGE,
  PRODUCTION_REQUIRED_MESSAGE,
} from "@/lib/quote-commercial-terms";
import { QuoteCard } from "./quote-card";

const quote: Quote = {
  id: "11111111-2222-3333-4444-555555555555",
  leadId: "lead-1",
  managerId: "manager-1",
  status: "approved",
  displayCurrency: "USD",
  totalAmount: "2500",
  validUntil: "2026-09-01T00:00:00.000Z",
  createdAt: "2026-08-19T10:00:00.000Z",
  updatedAt: "2026-08-19T10:00:00.000Z",
  documentDate: "2020-01-01T00:00:00.000Z",
  commercialNote: "CIP Tashkent",
  productionDaysFrom: 10,
  productionDaysTo: 20,
  deliveryDaysFrom: 14,
  deliveryDaysTo: 25,
  items: [
    {
      id: "item-1",
      panelTypeName: "Интерьерная панель",
      panelSizeName: "1220 × 2440 мм",
      areaM2: "2.9768",
      requiredAreaM2: "20",
      sheetsCount: 8,
      pricePerM2: "100",
      pricePerSheet: "297.68",
      totalPrice: "2381.44",
    },
  ],
};

const draftQuote: Quote = {
  ...quote,
  status: "draft",
};

const handlers = {
  onSend: vi.fn(),
  onApprove: vi.fn(),
  onReject: vi.fn(),
  onClientAccept: vi.fn(),
  onConvert: vi.fn(),
};

describe("QuoteCard", () => {
  it("renders canonical status and snapshot without inventing sensitive fields", () => {
    render(
      <QuoteCard
        quote={quote}
        currentUserId="viewer-1"
        permissions={[]}
        {...handlers}
      />,
    );

    expect(screen.getByText("КП v1 · 11111111")).toBeInTheDocument();
    expect(screen.getByText("Согласовано")).toBeInTheDocument();
    expect(
      screen.getAllByText("Интерьерная панель", { exact: false }).length,
    ).toBeGreaterThan(0);
    expect(screen.queryByText("Цена закупки за м²")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Создать сделку" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(formatDate("2026-08-19T10:00:00.000Z")),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Дата КП")).not.toBeInTheDocument();
  });

  it("exposes authenticated PDF download without rendering binary text", async () => {
    const onDownloadPdf = vi.fn();
    render(
      <QuoteCard
        quote={{ ...quote, finalizedAt: "2026-08-21T12:00:00.000Z" }}
        currentUserId="viewer-1"
        permissions={["quotes:read"]}
        {...handlers}
        onDownloadPdf={onDownloadPdf}
      />,
    );

    await userEvent.click(
      screen.getByRole("button", { name: "Скачать КП PDF" }),
    );
    expect(onDownloadPdf).toHaveBeenCalled();
  });

  it("exposes authenticated DOCX download", async () => {
    const onDownloadDocx = vi.fn();
    render(
      <QuoteCard
        quote={{ ...quote, finalizedAt: "2026-08-21T12:00:00.000Z" }}
        currentUserId="viewer-1"
        permissions={["quotes:read"]}
        {...handlers}
        onDownloadDocx={onDownloadDocx}
      />,
    );

    await userEvent.click(
      screen.getByRole("button", { name: "Скачать КП DOCX" }),
    );
    expect(onDownloadDocx).toHaveBeenCalled();
  });

  it("lets HEAD edit all client-facing terms including Примечание", () => {
    render(
      <QuoteCard
        quote={draftQuote}
        currentUserId="head-1"
        permissions={["quotes:update", "quotes:read_all", "quotes:approve"]}
        {...handlers}
        onSaveCommercialTerms={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("Срок производства")).toBeInTheDocument();
    expect(screen.getByLabelText("КП действительно до")).toBeInTheDocument();
    expect(screen.getByLabelText("Примечание")).toBeInTheDocument();
    expect(screen.queryByLabelText("Срок производства от")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Срок доставки от")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Дата КП")).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText("Закупочная цена, CNY/м²"),
    ).not.toBeInTheDocument();
  });

  it("saves text commercial terms without numeric day ranges", async () => {
    const onSave = vi.fn();
    render(
      <QuoteCard
        quote={{
          ...draftQuote,
          productionTerms: "",
          deliveryTerms: "",
          productionDaysFrom: null,
          productionDaysTo: null,
          deliveryDaysFrom: null,
          deliveryDaysTo: null,
        }}
        currentUserId="head-1"
        permissions={["quotes:update", "quotes:read_all", "quotes:approve"]}
        {...handlers}
        onSaveCommercialTerms={onSave}
      />,
    );

    await userEvent.type(
      screen.getByLabelText("Срок производства"),
      "15–20 рабочих дней",
    );
    await userEvent.type(
      screen.getByLabelText("Срок доставки"),
      "Ориентировочно 4 недели после утверждения декора",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Сохранить условия КП" }),
    );

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        productionTerms: "15–20 рабочих дней",
        deliveryTerms: "Ориентировочно 4 недели после утверждения декора",
      }),
    );
    expect(onSave.mock.calls[0][0]).not.toHaveProperty("productionDaysFrom");
    expect(onSave.mock.calls[0][0]).not.toHaveProperty("deliveryDaysFrom");
  });

  it("shows legacy numeric ranges only as a read-only fallback", () => {
    render(
      <QuoteCard
        quote={quote}
        currentUserId="head-1"
        permissions={["quotes:read_all", "quotes:approve"]}
        {...handlers}
      />,
    );

    expect(screen.getByText("10–20 дней")).toBeInTheDocument();
    expect(screen.getByText("14–25 дней")).toBeInTheDocument();
    expect(screen.queryByLabelText("Срок производства")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Срок производства от")).not.toBeInTheDocument();
  });

  it("prints the stored Manager note snapshot on the generated Quote", () => {
    render(
      <QuoteCard
        quote={quote}
        currentUserId="head-1"
        permissions={["quotes:read_all", "quotes:approve"]}
        {...handlers}
      />,
    );

    expect(screen.getByText("CIP Tashkent")).toBeInTheDocument();
    expect(screen.queryByLabelText("Примечание")).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText("Закупочная цена, CNY/м²"),
    ).not.toBeInTheDocument();
  });

  it("keeps client-facing terms read-only for MANAGER", () => {
    const onSave = vi.fn();
    render(
      <QuoteCard
        quote={draftQuote}
        currentUserId="manager-1"
        permissions={["quotes:update", "quotes:client_accept"]}
        {...handlers}
        onSaveCommercialTerms={onSave}
      />,
    );

    expect(
      screen.queryByLabelText("Срок производства"),
    ).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Примечание")).not.toBeInTheDocument();
    expect(screen.getByText("CIP Tashkent")).toBeInTheDocument();
    expect(screen.queryByLabelText("Дата КП")).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText("Закупочная цена, CNY/м²"),
    ).not.toBeInTheDocument();

    expect(onSave).not.toHaveBeenCalled();
  });

  it("shows production validation while HEAD can still preview documents", () => {
    render(
      <QuoteCard
        quote={{
          ...draftQuote,
          productionDaysFrom: null,
          productionDaysTo: null,
        }}
        currentUserId="head-1"
        permissions={["quotes:update", "quotes:read_all", "quotes:approve"]}
        {...handlers}
        onSaveCommercialTerms={vi.fn()}
        onDownloadPdf={vi.fn()}
        onDownloadDocx={vi.fn()}
      />,
    );

    expect(screen.getByText(PRODUCTION_REQUIRED_MESSAGE)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Скачать КП PDF" }),
    ).toBeEnabled();
    expect(
      screen.getByRole("button", { name: "Скачать КП DOCX" }),
    ).toBeEnabled();
    expect(screen.getByLabelText("Срок производства")).toBeInTheDocument();
  });

  it("shows delivery validation while HEAD can preview documents", () => {
    render(
      <QuoteCard
        quote={{
          ...draftQuote,
          deliveryDaysFrom: null,
          deliveryDaysTo: null,
        }}
        currentUserId="head-1"
        permissions={["quotes:update", "quotes:read_all", "quotes:approve"]}
        {...handlers}
        onSaveCommercialTerms={vi.fn()}
        onDownloadPdf={vi.fn()}
        onDownloadDocx={vi.fn()}
      />,
    );

    expect(screen.getByText(DELIVERY_REQUIRED_MESSAGE)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Скачать КП PDF" }),
    ).toBeEnabled();
    expect(
      screen.getByRole("button", { name: "Скачать КП DOCX" }),
    ).toBeEnabled();
    expect(screen.getByLabelText("Срок доставки")).toBeInTheDocument();
    expect(screen.getByLabelText("Примечание")).toBeInTheDocument();
  });

  it("does not combine mixed USD/UZS totals", () => {
    render(
      <QuoteCard
        quote={{
          ...quote,
          items: [
            {
              id: "item-1",
              name: "USD позиция",
              areaM2: "10",
              pricePerM2: "300",
              currencyCode: "USD",
              priceApprovedAt: "2026-08-21T10:00:00.000Z",
              pricePerSheet: "1",
              totalPrice: "1",
            },
            {
              id: "item-2",
              name: "UZS позиция",
              areaM2: "8",
              pricePerM2: "4000000",
              currencyCode: "UZS",
              priceApprovedAt: "2026-08-21T10:00:00.000Z",
              pricePerSheet: "1",
              totalPrice: "1",
            },
          ],
        }}
        currentUserId="head-1"
        permissions={["quotes:approve"]}
        {...handlers}
      />,
    );

    expect(
      screen.getAllByText("В КП разные валюты — общий итог не складывается")
        .length,
    ).toBeGreaterThan(0);
  });

  it("makes a finalized quote read-only for HEAD and MANAGER", () => {
    const finalized = {
      ...draftQuote,
      finalizedAt: "2026-08-21T12:00:00.000Z",
      items: [
        {
          ...draftQuote.items[0],
          priceApprovedAt: "2026-08-21T10:00:00.000Z",
          currencyCode: "USD" as const,
        },
      ],
    };

    const { rerender } = render(
      <QuoteCard
        quote={finalized}
        currentUserId="head-1"
        permissions={["quotes:update", "quotes:read_all", "quotes:approve"]}
        {...handlers}
        onSaveCommercialTerms={vi.fn()}
        onApprovePricing={vi.fn()}
        onFinalize={vi.fn()}
      />,
    );

    expect(screen.getAllByText("КП финализировано").length).toBeGreaterThan(0);
    expect(
      screen.queryByLabelText("Срок производства"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Сформировать КП" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Утвердить коммерческие цены" }),
    ).not.toBeInTheDocument();

    rerender(
      <QuoteCard
        quote={finalized}
        currentUserId="manager-1"
        permissions={["quotes:update", "quotes:client_accept"]}
        {...handlers}
        onSaveCommercialTerms={vi.fn()}
      />,
    );

    expect(screen.getAllByText("КП финализировано").length).toBeGreaterThan(0);
    expect(screen.queryByLabelText("Примечание")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Сформировать КП" }),
    ).not.toBeInTheDocument();
  });
});
