'use client';

import {
  CANONICAL_HPL_APPLICATIONS,
  HPL_APPLICATION_LABELS,
  type HplApplication,
} from '@/lib/hpl-domain';

type HplApplicationFieldProps = {
  value?: HplApplication;
  onChange: (value: HplApplication) => void;
  error?: string;
  name?: string;
};

export function HplApplicationField({
  value,
  onChange,
  error,
  name = 'application',
}: HplApplicationFieldProps) {
  const errorId = `${name}-error`;

  return (
    <label>
      <span className="mb-1 block text-sm font-medium text-slate-700">
        Тип HPL
      </span>
      <select
        name={name}
        aria-label="Тип HPL"
        aria-describedby={error ? errorId : undefined}
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value as HplApplication)}
        className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
      >
        <option value="" disabled>
          Выберите тип
        </option>
        {CANONICAL_HPL_APPLICATIONS.map((application) => (
          <option key={application} value={application}>
            {HPL_APPLICATION_LABELS[application]}
          </option>
        ))}
      </select>
      {error ? (
        <span id={errorId} className="mt-1 block text-sm text-red-600">
          {error}
        </span>
      ) : null}
    </label>
  );
}
