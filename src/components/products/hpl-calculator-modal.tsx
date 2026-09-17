"use client";

import { useMemo, useState } from "react";
import { Product } from "@/hooks/use-inventory";
import { formatNumber } from "@/lib/format";
import { useI18n } from "@/i18n/provider";

type HplCalculatorModalProps = {
  product: Product | null;
  onClose: () => void;
};

const DEFAULT_WASTE_PERCENT = 5;

function resolveSheetArea(
  sheetArea: number | string | null | undefined,
  lengthMm: number,
  widthMm: number,
): number | null {
  const fromProduct = Number(sheetArea);
  if (!Number.isNaN(fromProduct) && fromProduct > 0) {
    return fromProduct;
  }

  if (lengthMm > 0 && widthMm > 0) {
    return (lengthMm * widthMm) / 1_000_000;
  }

  return null;
}

export function HplCalculatorModal({
  product,
  onClose,
}: HplCalculatorModalProps) {
  if (!product) {
    return null;
  }

  return (
    <HplCalculatorContent key={product.id} product={product} onClose={onClose} />
  );
}

function HplCalculatorContent({
  product,
  onClose,
}: {
  product: Product;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [requiredAreaM2, setRequiredAreaM2] = useState("");
  const [wastePercent, setWastePercent] = useState(String(DEFAULT_WASTE_PERCENT));

  const calculation = useMemo(() => {
    const areaPerSheet = resolveSheetArea(
      product.sheetArea,
      product.length,
      product.width,
    );
    const requiredM2 = Number(requiredAreaM2);
    const waste = Number(wastePercent);

    if (
      areaPerSheet === null ||
      areaPerSheet <= 0 ||
      Number.isNaN(requiredM2) ||
      requiredM2 <= 0 ||
      Number.isNaN(waste) ||
      waste < 0
    ) {
      return null;
    }

    const areaWithWaste = requiredM2 * (1 + waste / 100);
    const sheets = Math.ceil(areaWithWaste / areaPerSheet);
    const totalAreaM2 = sheets * areaPerSheet;

    return {
      areaPerSheet,
      areaWithWaste,
      sheets,
      totalAreaM2,
    };
  }, [product, requiredAreaM2, wastePercent]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4">
      <div className="w-full max-w-md rounded border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-950">
              {t("inventory.calculatorTitle")}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              {product.sku} ·{" "}
              {t("inventory.areaPerSheet", {
                area: formatNumber(product.sheetArea),
              })}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {t("inventory.mmSize", {
                length: product.length,
                width: product.width,
              })}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-slate-300 px-2 py-1 text-sm text-slate-700 hover:bg-slate-50"
          >
            {t("common.close")}
          </button>
        </div>

        <div className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              {t("inventory.requiredArea")}
            </span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={requiredAreaM2}
              onChange={(event) => setRequiredAreaM2(event.target.value)}
              placeholder={t("inventory.areaPlaceholder")}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              {t("inventory.wastePercent")}
            </span>
            <input
              type="number"
              min="0"
              step="1"
              value={wastePercent}
              onChange={(event) => setWastePercent(event.target.value)}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
            />
          </label>

          {calculation ? (
            <div className="rounded border border-slate-200 bg-slate-50 p-4 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-slate-600">{t("inventory.areaWithWaste")}</span>
                <span className="font-medium text-slate-900">
                  {t("common.m2", { value: formatNumber(calculation.areaWithWaste) })}
                </span>
              </div>
              <div className="mt-2 flex justify-between gap-4">
                <span className="text-slate-600">{t("inventory.wholeSheets")}</span>
                <span className="text-lg font-semibold text-slate-950">
                  {calculation.sheets}
                </span>
              </div>
              <div className="mt-2 flex justify-between gap-4">
                <span className="text-slate-600">{t("inventory.totalArea")}</span>
                <span className="font-medium text-slate-900">
                  {t("common.m2", { value: formatNumber(calculation.totalAreaM2) })}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              {t("inventory.enterAreaHint")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
