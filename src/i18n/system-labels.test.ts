import { describe, expect, it } from 'vitest';
import { dictionaries } from './dictionaries';
import { localizeSystemText } from './system-labels';
import { enumLabel, roleLabels } from '@/lib/labels';
import { panelTypeLabel } from '@/lib/hpl-domain';
import { setActiveMessages } from './active-messages';

describe('system label localization', () => {
  it('maps English role aliases into the active locale', () => {
    expect(localizeSystemText('Acceptance Manager', dictionaries.uz)).toBe(
      'Qabul menejeri',
    );
    expect(localizeSystemText('Acceptance Head', dictionaries.ru)).toBe(
      'Руководитель приёмки',
    );
    expect(enumLabel(roleLabels, 'Acceptance Head')).toBe(
      'Руководитель приёмки',
    );
  });

  it('translates known RU system labels when the active catalog is UZ or EN', () => {
    expect(localizeSystemText('Менеджер', dictionaries.uz)).toBe('Menejer');
    expect(localizeSystemText('Менеджер', dictionaries.en)).toBe('Manager');
    expect(localizeSystemText('Первый контакт', dictionaries.en)).toBe(
      'First contact',
    );
    expect(localizeSystemText('Интерьерный', dictionaries.uz)).toBe('Interyer');
  });

  it('leaves user data unchanged', () => {
    expect(
      localizeSystemText('Клиент хочет жёлтый декор', dictionaries.en),
    ).toBe('Клиент хочет жёлтый декор');
    expect(localizeSystemText('Acme Facade LLC', dictionaries.uz)).toBe(
      'Acme Facade LLC',
    );
  });

  it('labels canonical panel types from i18n instead of displayNameRu', () => {
    setActiveMessages(dictionaries.en);
    expect(
      panelTypeLabel({
        code: 'interior',
        displayNameRu: 'Интерьерный',
      }),
    ).toBe('Interior');
    setActiveMessages(dictionaries.ru);
  });
});
