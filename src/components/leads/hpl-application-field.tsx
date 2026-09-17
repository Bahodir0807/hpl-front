'use client';

import {
  CANONICAL_HPL_APPLICATIONS,
  type HplApplication,
} from '@/lib/hpl-domain';
import { useI18n } from '@/i18n/provider';
import { useLabelMaps } from '@/i18n/use-label-maps';

type HplApplicationFieldProps = {
  value?: HplApplication;
  onChange: (value: HplApplication) => void;
  error?: string;
  name?: string;
  label?: string;
  disabled?: boolean;
};

export function HplApplicationField({
  value,
  onChange,
  error,
  name = 'application',
  label,
  disabled = false,
}: HplApplicationFieldProps) {
  const { t } = useI18n();
  const { hplApplicationLabels } = useLabelMaps();
  const fieldLabel = label ?? t('hpl.applicationField');
  const errorId = `${name}-error`;

  return (
    <label>
      <span className="mb-1 block text-sm font-medium text-slate-700">
        {fieldLabel}
      </span>
      <select
        name={name}
        aria-label={fieldLabel}
        aria-describedby={error ? errorId : undefined}
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value as HplApplication)}
        disabled={disabled}
        className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
      >
        <option value="" disabled>
          {t('hpl.selectType')}
        </option>
        {CANONICAL_HPL_APPLICATIONS.map((application) => (
          <option key={application} value={application}>
            {hplApplicationLabels[application]}
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
