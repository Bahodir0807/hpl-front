import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { LoseOpportunityModal } from './lose-opportunity-modal';
import { LOSS_REASONS, lossReasonLabels } from '@/lib/loss-reasons';

describe('LoseOpportunityModal', () => {
  it('offers every structured reason and requires a comment for OTHER', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <LoseOpportunityModal
        isOpen
        title="Фасад школы"
        entityLabel="лид"
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    for (const reason of LOSS_REASONS) {
      expect(
        screen.getByRole('option', { name: lossReasonLabels[reason] }),
      ).toBeInTheDocument();
    }

    await userEvent.selectOptions(screen.getByRole('combobox'), 'OTHER');
    await userEvent.click(
      screen.getByRole('button', { name: 'Закрыть как проигранный' }),
    );

    expect(onSubmit).not.toHaveBeenCalled();
    expect(
      screen.getAllByText('Для причины «Другое» нужен комментарий.').length,
    ).toBeGreaterThan(0);

    await userEvent.type(screen.getByRole('textbox'), 'Клиент отказался');
    await userEvent.click(
      screen.getByRole('button', { name: 'Закрыть как проигранный' }),
    );

    expect(onSubmit).toHaveBeenCalledWith({
      reason: 'OTHER',
      comment: 'Клиент отказался',
    });
  });
});
