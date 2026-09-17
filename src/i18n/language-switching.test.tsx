import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { I18nProvider } from '@/i18n/provider';
import { useI18n } from '@/i18n/provider';
import { dictionaries } from '@/i18n/dictionaries';

function Probe() {
  const { t, locale } = useI18n();
  return (
    <div>
      <p>{t('navigation.leads')}</p>
      <p>{t('calculations.sendToHead')}</p>
      <p>{t('quotes.createDraft')}</p>
      <p>{t('statuses.calculationRequest.draft')}</p>
      <p>{t('roles.MANAGER')}</p>
      <p>{t('validation.required')}</p>
      <p>{t('errors.quoteSupplierRequired')}</p>
      <p data-testid="note">Клиент хочет жёлтый декор</p>
      <p data-testid="locale">{locale}</p>
    </div>
  );
}

describe('language switching presentation', () => {
  it('keeps RU labels by default', () => {
    render(
      <I18nProvider>
        <Probe />
      </I18nProvider>,
    );
    expect(screen.getByText('Лиды')).toBeInTheDocument();
    expect(screen.getByText('Отправить руководителю')).toBeInTheDocument();
    expect(screen.getByText('Создать черновик КП')).toBeInTheDocument();
    expect(screen.getByText('Черновик')).toBeInTheDocument();
    expect(screen.getByText('Менеджер')).toBeInTheDocument();
    expect(screen.getByText('Обязательное поле')).toBeInTheDocument();
    expect(
      screen.getByText('Выберите поставщика для каждой позиции.'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('note')).toHaveTextContent(
      'Клиент хочет жёлтый декор',
    );
  });

  it('changes chrome labels across RU → UZ → EN without changing user notes', async () => {
    const user = userEvent.setup();

    function SwitcherProbe() {
      const { t, setLocale } = useI18n();
      return (
        <div>
          <button type="button" onClick={() => setLocale('uz')}>
            to-uz
          </button>
          <button type="button" onClick={() => setLocale('en')}>
            to-en
          </button>
          <button type="button" onClick={() => setLocale('ru')}>
            to-ru
          </button>
          <p>{t('navigation.leads')}</p>
          <p>{t('calculations.sendToHead')}</p>
          <p>{t('quotes.createDraft')}</p>
          <p>{t('roles.HEAD')}</p>
          <p data-testid="note">Клиент хочет жёлтый декор</p>
        </div>
      );
    }

    render(
      <I18nProvider>
        <SwitcherProbe />
      </I18nProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'to-uz' }));
    expect(screen.getByText('Lidlar')).toBeInTheDocument();
    expect(screen.getByText('Rahbarga yuborish')).toBeInTheDocument();
    expect(
      screen.getByText('Tijorat taklifi qoralamasini yaratish'),
    ).toBeInTheDocument();
    expect(screen.getByText('Rahbar')).toBeInTheDocument();
    expect(screen.getByTestId('note')).toHaveTextContent(
      'Клиент хочет жёлтый декор',
    );

    await user.click(screen.getByRole('button', { name: 'to-en' }));
    expect(screen.getByText('Leads')).toBeInTheDocument();
    expect(screen.getByText('Send to Head')).toBeInTheDocument();
    expect(screen.getByText('Create quote draft')).toBeInTheDocument();
    expect(screen.getByText('Head')).toBeInTheDocument();
    expect(screen.getByTestId('note')).toHaveTextContent(
      'Клиент хочет жёлтый декор',
    );

    await user.click(screen.getByRole('button', { name: 'to-ru' }));
    expect(screen.getByText('Лиды')).toBeInTheDocument();
  });

  it('translates statuses, roles, validation, and errors across locales', () => {
    expect(dictionaries.ru.statuses.calculationRequest.submitted).toBe(
      'Отправлен руководителю',
    );
    expect(dictionaries.uz.statuses.calculationRequest.processing).toBe(
      'Jarayonda',
    );
    expect(dictionaries.en.statuses.calculationRequest.quoted).toBe(
      'Quote created',
    );
    expect(dictionaries.en.roles.ACCEPTANCE_HEAD).toBe('Acceptance Head');
    expect(dictionaries.uz.roles.ACCEPTANCE_MANAGER).toBe('Qabul menejeri');
    expect(dictionaries.ru.roles.HEAD).toBe('Руководитель');
    expect(dictionaries.uz.validation.required).toBe('Majburiy maydon');
    expect(dictionaries.en.errors.quoteSupplierRequired).toBe(
      'Select a supplier for each item.',
    );
  });

  it('uses the same keys in all dictionaries for statuses and roles', () => {
    expect(dictionaries.uz.statuses.calculationRequest.submitted).toBe(
      'Rahbarga yuborilgan',
    );
    expect(dictionaries.en.statuses.calculationRequest.quoted).toBe(
      'Quote created',
    );
    expect(dictionaries.en.roles.STOREKEEPER).toBe('Storekeeper');
  });
});
