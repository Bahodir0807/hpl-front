import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { QuoteCompositionPanel } from './quote-composition-panel';
import type { QuoteComposition } from '@/types/hpl';
import type { Locale } from '@/i18n/config';
import { I18nProvider } from '@/i18n/provider';

function renderPanel(
  composition: QuoteComposition,
  acknowledgeStale = false,
  locale: Locale = 'ru',
) {
  const onAcknowledgeStaleChange = vi.fn();
  render(
    <I18nProvider initialLocale={locale}>
      <QuoteCompositionPanel
        composition={composition}
        acknowledgeStale={acknowledgeStale}
        onAcknowledgeStaleChange={onAcknowledgeStaleChange}
      />
    </I18nProvider>,
  );
  return { onAcknowledgeStaleChange };
}

const unpricedHplComposition: QuoteComposition = {
  components: [
    {
      kind: 'HPL',
      label: 'HPL',
      readiness: 'READY',
      required: true,
      includeInQuote: true,
      amount: '0.00',
      currency: 'USD',
      warning: 'Цена HPL ещё не утверждена',
    },
    {
      kind: 'FACADE',
      label: 'Facade',
      readiness: 'READY',
      required: true,
      includeInQuote: true,
      amount: '8000',
      currency: 'USD',
    },
  ],
  totals: {
    byCurrency: [{ currency: 'USD', amount: '8000.00' }],
    grandTotal: { currency: 'USD', amount: '8000.00' },
  },
};

describe('QuoteCompositionPanel', () => {
  it('shows HPL-only without empty facade or installation sections', () => {
    renderPanel({
      components: [
        {
          kind: 'HPL',
          label: 'HPL',
          readiness: 'READY',
          required: true,
          includeInQuote: true,
          amount: '12000',
          currency: 'USD',
        },
        { kind: 'FACADE', label: 'Facade', readiness: 'NOT_REQUIRED', required: false },
        { kind: 'INSTALLATION', label: 'Install', readiness: 'NOT_REQUIRED', required: false },
      ],
      totals: { byCurrency: [{ currency: 'USD', amount: '12000.00' }], grandTotal: { currency: 'USD', amount: '12000.00' } },
    });
    expect(screen.getByText('HPL')).toBeInTheDocument();
    expect(screen.queryByText('Подсистема')).not.toBeInTheDocument();
    expect(screen.queryByText('Монтаж')).not.toBeInTheDocument();
  });

  it('shows HPL + facade approved amounts', () => {
    renderPanel({
      components: [
        { kind: 'HPL', label: 'HPL', readiness: 'READY', required: true, includeInQuote: true, amount: '12000', currency: 'USD' },
        { kind: 'FACADE', label: 'Facade', readiness: 'READY', required: true, includeInQuote: true, amount: '8000', currency: 'USD' },
        { kind: 'INSTALLATION', label: 'Install', readiness: 'NOT_REQUIRED', required: false },
      ],
      totals: { byCurrency: [{ currency: 'USD', amount: '20000.00' }], grandTotal: { currency: 'USD', amount: '20000.00' } },
    });
    expect(screen.getByText('Подсистема')).toBeInTheDocument();
    expect(screen.queryByText('Монтаж')).not.toBeInTheDocument();
  });

  it('shows HPL + installation', () => {
    renderPanel({
      components: [
        { kind: 'HPL', label: 'HPL', readiness: 'READY', required: true, includeInQuote: true, amount: '12000', currency: 'USD' },
        { kind: 'FACADE', label: 'Facade', readiness: 'NOT_REQUIRED', required: false },
        { kind: 'INSTALLATION', label: 'Install', readiness: 'READY', required: true, includeInQuote: true, amount: '15000', currency: 'USD' },
      ],
      totals: { byCurrency: [{ currency: 'USD', amount: '27000.00' }], grandTotal: { currency: 'USD', amount: '27000.00' } },
    });
    expect(screen.getByText('Монтаж')).toBeInTheDocument();
  });

  it('shows all three sections and a stale warning with acknowledgement', async () => {
    const user = userEvent.setup();
    const { onAcknowledgeStaleChange } = renderPanel({
      components: [
        { kind: 'HPL', label: 'HPL', readiness: 'READY', required: true, includeInQuote: true, amount: '12000', currency: 'USD' },
        { kind: 'FACADE', label: 'Facade', readiness: 'READY', required: true, includeInQuote: true, amount: '8000', currency: 'USD' },
        {
          kind: 'INSTALLATION',
          label: 'Install',
          readiness: 'STALE_APPROVED',
          required: true,
          includeInQuote: true,
          amount: '15000',
          currency: 'USD',
          staleTechnicalBasis: true,
          warning: 'Технический расчёт изменён после утверждения коммерческой стоимости',
        },
      ],
      totals: { byCurrency: [{ currency: 'USD', amount: '35000.00' }], grandTotal: { currency: 'USD', amount: '35000.00' } },
      staleAcknowledgementRequired: true,
    });
    expect(screen.getByText('HPL')).toBeInTheDocument();
    expect(screen.getByText('Подсистема')).toBeInTheDocument();
    expect(screen.getByText('Монтаж')).toBeInTheDocument();
    expect(
      screen.getByText('Технический расчёт изменён после утверждения'),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(
        'Технический расчёт изменён после утверждения коммерческой стоимости',
      ),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole('checkbox'));
    expect(onAcknowledgeStaleChange).toHaveBeenCalledWith(true);
  });

  it('does not invent a mixed-currency grand total', () => {
    renderPanel({
      components: [
        { kind: 'HPL', label: 'HPL', readiness: 'READY', required: true, includeInQuote: true, amount: '12000', currency: 'USD' },
        { kind: 'FACADE', label: 'Facade', readiness: 'READY', required: true, includeInQuote: true, amount: '8000', currency: 'EUR' },
      ],
      totals: {
        byCurrency: [
          { currency: 'USD', amount: '12000.00' },
          { currency: 'EUR', amount: '8000.00' },
        ],
        grandTotal: null,
      },
    });
    expect(
      screen.getByText('В КП разные валюты — общий итог не складывается'),
    ).toBeInTheDocument();
  });

  it('does not show a zero HPL amount as if it were an approved customer price', () => {
    renderPanel(unpricedHplComposition);
    expect(screen.getByText('Цена HPL ещё не утверждена')).toBeInTheDocument();
    expect(screen.queryByText('$0.00')).not.toBeInTheDocument();
    expect(screen.queryByText('0,00 $')).not.toBeInTheDocument();
    expect(screen.getByText('8 000,00 $')).toBeInTheDocument();
  });

  it.each([
    ['en', 'HPL price is not approved yet'],
    ['uz', 'HPL narxi hali tasdiqlanmagan'],
  ] as const)(
    'does not leak the Russian HPL unpriced API warning in %s',
    (locale, localized) => {
      renderPanel(unpricedHplComposition, false, locale);
      expect(screen.getByText(localized)).toBeInTheDocument();
      expect(
        screen.queryByText('Цена HPL ещё не утверждена'),
      ).not.toBeInTheDocument();
    },
  );
});
