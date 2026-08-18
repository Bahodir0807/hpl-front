import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { RejectQuoteModal } from './reject-quote-modal';

describe('RejectQuoteModal', () => {
  it('does not submit an empty rejection reason', async () => {
    const onSubmit = vi.fn();
    render(
      <RejectQuoteModal
        quoteId="11111111"
        isPending={false}
        onCancel={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Отклонить' }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText('Укажите причину отказа.')).toBeInTheDocument();
  });

  it('submits a trimmed non-empty reason', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <RejectQuoteModal
        quoteId="11111111"
        isPending={false}
        onCancel={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    await userEvent.type(
      screen.getByRole('textbox', { name: 'Причина отказа' }),
      '  Изменился бюджет  ',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Отклонить' }));

    expect(onSubmit).toHaveBeenCalledWith('Изменился бюджет');
  });
});
