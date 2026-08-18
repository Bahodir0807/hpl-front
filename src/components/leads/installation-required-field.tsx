'use client';

export type InstallationSelection = 'yes' | 'no';

type InstallationRequiredFieldProps = {
  value?: InstallationSelection;
  onChange: (value: InstallationSelection) => void;
  error?: string;
  name?: string;
};

export function InstallationRequiredField({
  value,
  onChange,
  error,
  name = 'installationRequired',
}: InstallationRequiredFieldProps) {
  const errorId = `${name}-error`;

  return (
    <fieldset aria-describedby={error ? errorId : undefined}>
      <legend className="mb-1 block text-sm font-medium text-slate-700">
        Монтаж
      </legend>
      <div className="grid grid-cols-2 gap-2">
        <label className="flex items-center gap-2 rounded border border-slate-300 px-3 py-2 text-sm">
          <input
            type="radio"
            name={name}
            value="yes"
            checked={value === 'yes'}
            required
            onChange={() => onChange('yes')}
          />
          Да
        </label>
        <label className="flex items-center gap-2 rounded border border-slate-300 px-3 py-2 text-sm">
          <input
            type="radio"
            name={name}
            value="no"
            checked={value === 'no'}
            required
            onChange={() => onChange('no')}
          />
          Нет
        </label>
      </div>
      {error ? (
        <span id={errorId} className="mt-1 block text-sm text-red-600">
          {error}
        </span>
      ) : null}
    </fieldset>
  );
}

export function installationSelectionToBoolean(
  value: InstallationSelection,
): boolean {
  return value === 'yes';
}
