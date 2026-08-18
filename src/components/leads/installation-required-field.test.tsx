import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import {
  InstallationRequiredField,
  installationSelectionToBoolean,
} from './installation-required-field';
import type { InstallationSelection } from './installation-required-field';

function InstallationHarness({
  onSubmit,
}: {
  onSubmit: (value: boolean) => void;
}) {
  const [selection, setSelection] = useState<InstallationSelection>();

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (selection) {
          onSubmit(installationSelectionToBoolean(selection));
        }
      }}
    >
      <InstallationRequiredField
        value={selection}
        onChange={setSelection}
      />
      <button type="submit">Продолжить</button>
    </form>
  );
}

describe('InstallationRequiredField', () => {
  it('starts unset without silently selecting either answer', () => {
    render(<InstallationHarness onSubmit={vi.fn()} />);

    expect(screen.getByRole('radio', { name: 'Да' })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: 'Нет' })).not.toBeChecked();
  });

  it('blocks submit while installation is unset', async () => {
    const onSubmit = vi.fn();
    render(<InstallationHarness onSubmit={onSubmit} />);

    await userEvent.click(screen.getByRole('button', { name: 'Продолжить' }));

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits Да as semantic true', async () => {
    const onSubmit = vi.fn();
    render(<InstallationHarness onSubmit={onSubmit} />);

    await userEvent.click(screen.getByRole('radio', { name: 'Да' }));
    await userEvent.click(screen.getByRole('button', { name: 'Продолжить' }));

    expect(onSubmit).toHaveBeenCalledWith(true);
  });

  it('submits Нет as semantic false instead of treating it as missing', async () => {
    const onSubmit = vi.fn();
    render(<InstallationHarness onSubmit={onSubmit} />);

    await userEvent.click(screen.getByRole('radio', { name: 'Нет' }));
    await userEvent.click(screen.getByRole('button', { name: 'Продолжить' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith(false);
  });
});
