import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '@/i18n/provider';
import { AcceptQuoteModal } from './accept-quote-modal';
import { ExecutionHandoffPanel } from './execution-handoff-panel';
import type { LeadExecutionView } from '@/hooks/use-quotes';
import type { Quote } from '@/types/hpl';

const view: LeadExecutionView = {
  active: {
    id: 'handoff-2',
    dealId: 'deal-1',
    leadId: 'lead-1',
    quoteId: 'quote-2',
    quoteVersion: 2,
    acceptedAt: '2026-09-24T10:00:00.000Z',
    acceptedBy: { id: 'manager-1', name: 'Ivan Petrov' },
    acceptanceNote: 'Согласовано',
    status: 'ACTIVE',
    revision: 2,
    active: true,
    components: [
      {
        kind: 'HPL',
        label: 'HPL',
        required: true,
        status: 'PENDING',
        sourceRevision: null,
        technicalRevision: null,
        currentTechnicalRevision: null,
        customerAmount: '1000',
        currency: 'USD',
        changedAfterAcceptance: false,
      },
      {
        kind: 'FACADE',
        label: 'Подсистема',
        required: true,
        status: 'PENDING',
        sourceRevision: 2,
        technicalRevision: 4,
        currentTechnicalRevision: 5,
        customerAmount: '500',
        currency: 'USD',
        changedAfterAcceptance: true,
      },
    ],
  },
  history: [
    {
      id: 'handoff-1',
      dealId: 'deal-1',
      leadId: 'lead-1',
      quoteId: 'quote-1',
      quoteVersion: 1,
      acceptedAt: '2026-09-20T10:00:00.000Z',
      acceptedBy: { id: 'manager-1', name: 'Ivan Petrov' },
      acceptanceNote: null,
      status: 'SUPERSEDED',
      revision: 1,
      active: false,
      components: [],
    },
  ],
};

describe('execution handoff panel', () => {
  it('shows the accepted version, missing installation, and a stale facade warning', () => {
    render(
      <I18nProvider>
        <ExecutionHandoffPanel view={view} />
      </I18nProvider>,
    );
    expect(screen.getByText(/Принятое КП: v2/)).toBeInTheDocument();
    expect(screen.getByText('Не входит')).toBeInTheDocument();
    expect(
      screen.getByText('Технические данные изменились после принятия КП'),
    ).toBeInTheDocument();
    expect(screen.getByText(/Заменено версией v2/)).toBeInTheDocument();
  });

  it('confirms the exact version before acceptance', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const quote = {
      id: 'quote-1',
      managerId: 'manager-1',
      status: 'approved',
      versionNumber: 3,
      finalizedAt: '2026-09-24T08:00:00.000Z',
      createdAt: '2026-09-24T08:00:00.000Z',
      updatedAt: '2026-09-24T08:00:00.000Z',
      items: [],
    } as Quote;
    render(
      <I18nProvider>
        <AcceptQuoteModal
          quote={quote}
          isPending={false}
          onCancel={vi.fn()}
          onSubmit={onSubmit}
        />
      </I18nProvider>,
    );
    expect(screen.getByText('Будет принята версия v3')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Зафиксировать принятие' }));
    expect(onSubmit).toHaveBeenCalledWith('');
  });
});
