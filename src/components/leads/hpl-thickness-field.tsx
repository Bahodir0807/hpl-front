'use client';

import {
  FURNITURE_THICKNESS_MAX_MM,
  FURNITURE_THICKNESS_MIN_MM,
  FURNITURE_THICKNESS_STEP,
  STANDARD_DISCRETE_THICKNESSES_MM,
  isFurnitureApplication,
  toDecimalNumber,
} from '@/lib/hpl-domain';

type HplThicknessFieldProps = {
  application?: string | null;
  value: string | number | null | undefined;
  onChange: (value: string) => void;
  error?: string;
  name?: string;
  compact?: boolean;
  disabled?: boolean;
};

export function HplThicknessField({
  application,
  value,
  onChange,
  error,
  name = 'thicknessMm',
  compact = false,
  disabled = false,
}: HplThicknessFieldProps) {
  const furniture = isFurnitureApplication(application);
  const displayValue =
    value === null || value === undefined ? '' : String(value);
  const selectedDiscrete = toDecimalNumber(value);
  const errorId = `${name}-error`;

  return (
    <label>
      {compact ? null : (
        <span className="mb-1 block text-sm font-medium text-slate-700">
          Толщина, мм
        </span>
      )}
      {furniture ? (
        <input
          name={name}
          type="number"
          inputMode="decimal"
          min={FURNITURE_THICKNESS_MIN_MM}
          max={FURNITURE_THICKNESS_MAX_MM}
          step={FURNITURE_THICKNESS_STEP}
          disabled={disabled}
          aria-label="Толщина, мм"
          aria-describedby={error ? errorId : undefined}
          value={displayValue}
          onChange={(event) => onChange(event.target.value)}
          className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
        />
      ) : (
        <select
          name={name}
          disabled={disabled}
          aria-label="Толщина, мм"
          aria-describedby={error ? errorId : undefined}
          value={selectedDiscrete != null ? String(selectedDiscrete) : ''}
          onChange={(event) => onChange(event.target.value)}
          className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">Выберите толщину</option>
          {STANDARD_DISCRETE_THICKNESSES_MM.map((thickness) => (
            <option key={thickness} value={thickness}>
              {thickness} мм
            </option>
          ))}
        </select>
      )}
      {error ? (
        <span id={errorId} className="mt-1 block text-sm text-red-600">
          {error}
        </span>
      ) : null}
    </label>
  );
}
