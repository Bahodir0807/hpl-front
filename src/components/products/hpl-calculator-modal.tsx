"use client";

import { useEffect, useMemo, useState } from "react";
import { Product } from "@/hooks/use-inventory";
import { formatNumber } from "@/lib/format";

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
  const [requiredAreaM2, setRequiredAreaM2] = useState("");
  const [wastePercent, setWastePercent] = useState(String(DEFAULT_WASTE_PERCENT));

  useEffect(() => {
    if (product) {
      setRequiredAreaM2("");
      setWastePercent(String(DEFAULT_WASTE_PERCENT));
    }
  }, [product?.id]);

  const calculation = useMemo(() => {
    if (!product) {
      return null;
    }

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

  if (!product) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4">
      <div className="w-full max-w-md rounded border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-950">
              Калькулятор HPL
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              {product.sku} · {formatNumber(product.sheetArea)} м²/лист
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {product.length} × {product.width} мм
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-slate-300 px-2 py-1 text-sm text-slate-700 hover:bg-slate-50"
          >
            Закрыть
          </button>
        </div>

        <div className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Нужная площадь, м²
            </span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={requiredAreaM2}
              onChange={(event) => setRequiredAreaM2(event.target.value)}
              placeholder="Например, 48.5"
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Запас на раскрой, %
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
                <span className="text-slate-600">Площадь с запасом</span>
                <span className="font-medium text-slate-900">
                  {formatNumber(calculation.areaWithWaste)} м²
                </span>
              </div>
              <div className="mt-2 flex justify-between gap-4">
                <span className="text-slate-600">Листов (целых)</span>
                <span className="text-lg font-semibold text-slate-950">
                  {calculation.sheets}
                </span>
              </div>
              <div className="mt-2 flex justify-between gap-4">
                <span className="text-slate-600">Итоговая площадь</span>
                <span className="font-medium text-slate-900">
                  {formatNumber(calculation.totalAreaM2)} м²
                </span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              Введите площадь в м² для расчёта количества листов.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
