'use client';

import { MoneyCurrency, moneyCurrencyInputLabels } from '@/lib/currency';

type MoneyInputProps = {
  value: string | number;
  currency: MoneyCurrency;
  onValueChange: (value: string) => void;
  onCurrencyChange: (currency: MoneyCurrency) => void;
  placeholder?: string;
  disabled?: boolean;
  inputClassName?: string;
  selectClassName?: string;
};

export function MoneyInput({
  value,
  currency,
  onValueChange,
  onCurrencyChange,
  placeholder = 'Сумма',
  disabled = false,
  inputClassName = 'w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500',
  selectClassName = 'rounded border border-slate-300 bg-white px-2 py-2 text-sm text-slate-700 outline-none focus:border-slate-500',
}: MoneyInputProps) {
  const step = currency === 'USD' ? '0.01' : '1';

  return (
    <div className="flex gap-2">
      <input
        type="number"
        min="0"
        step={step}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(event) => onValueChange(event.target.value)}
        className={inputClassName}
      />
      <select
        value={currency}
        disabled={disabled}
        onChange={(event) =>
          onCurrencyChange(event.target.value as MoneyCurrency)
        }
        className={`${selectClassName} w-[88px] shrink-0`}
        aria-label="Валюта суммы"
      >
        {(Object.keys(moneyCurrencyInputLabels) as MoneyCurrency[]).map(
          (option) => (
            <option key={option} value={option}>
              {moneyCurrencyInputLabels[option]}
            </option>
          ),
        )}
      </select>
    </div>
  );
}
