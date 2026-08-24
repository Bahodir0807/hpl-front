import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HplThicknessField } from './hpl-thickness-field';

describe('HplThicknessField', () => {
  it('offers discrete standard thicknesses including 1/15/25 and not 16', () => {
    render(
      <HplThicknessField
        application="INTERIOR"
        value=""
        onChange={() => undefined}
      />,
    );

    expect(screen.getByRole('option', { name: '1 мм' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '15 мм' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '25 мм' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: '16 мм' })).not.toBeInTheDocument();
  });

  it('uses a numeric input for furniture instead of a 0.5–2.9 dropdown option', () => {
    render(
      <HplThicknessField
        application="FURNITURE"
        value="1.5"
        onChange={() => undefined}
      />,
    );

    const input = screen.getByLabelText('Толщина, мм');
    expect(input).toHaveAttribute('type', 'number');
    expect(input).toHaveAttribute('min', '0.5');
    expect(input).toHaveAttribute('max', '2.9');
    expect(screen.queryByRole('option', { name: '0.5–2.9' })).not.toBeInTheDocument();
  });
});
