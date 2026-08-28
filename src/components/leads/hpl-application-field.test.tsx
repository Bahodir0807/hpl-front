import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { HplApplicationField } from './hpl-application-field';
import type { HplApplication } from '@/lib/hpl-domain';

function ApplicationHarness({
  onChange,
}: {
  onChange: (value: HplApplication) => void;
}) {
  const [value, setValue] = useState<HplApplication>('INTERIOR');

  return (
    <HplApplicationField
      value={value}
      onChange={(next) => {
        setValue(next);
        onChange(next);
      }}
    />
  );
}

describe('HplApplicationField', () => {
  it('shows all four canonical HPL types', () => {
    render(<ApplicationHarness onChange={() => undefined} />);

    expect(screen.getByRole('option', { name: 'Интерьерный' })).toHaveValue(
      'INTERIOR',
    );
    expect(screen.getByRole('option', { name: 'Exterior с УФ' })).toHaveValue(
      'EXTERIOR_WITH_UV',
    );
    expect(screen.getByRole('option', { name: 'Лабораторный' })).toHaveValue(
      'LABORATORY',
    );
    expect(screen.getByRole('option', { name: 'Мебельный' })).toHaveValue(
      'FURNITURE',
    );
    expect(screen.queryByRole('option', { name: 'Экстерьер' })).not.toBeInTheDocument();
  });

  it('submits the new exterior value as EXTERIOR_WITH_UV', async () => {
    const onChange = vi.fn();
    render(<ApplicationHarness onChange={onChange} />);

    await userEvent.selectOptions(
      screen.getByLabelText('Применение / тип HPL'),
      'EXTERIOR_WITH_UV',
    );

    expect(onChange).toHaveBeenCalledWith('EXTERIOR_WITH_UV');
  });
});
