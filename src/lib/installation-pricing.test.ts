import { describe, expect, it } from 'vitest';
import {
  canApproveInstallationCommercial,
  canManageInstallationCatalog,
  canPrepareInstallationCommercial,
  canReadInstallationCost,
  canUpdateInstallationTechnical,
} from './installation-pricing';
import { dictionaries } from '@/i18n/dictionaries';

describe('installation pricing ACL helpers', () => {
  it('grants HEAD/DIRECTOR cost and approval and keeps ENGINEER/MANAGER out of rates', () => {
    const head = [
      'installation_pricing:read_cost',
      'installation_pricing:manage_contractors',
      'installation_pricing:manage_rates',
      'installation_pricing:prepare',
      'installation_pricing:approve',
    ];
    expect(canReadInstallationCost(head)).toBe(true);
    expect(canManageInstallationCatalog(head)).toBe(true);
    expect(canPrepareInstallationCommercial(head)).toBe(true);
    expect(canApproveInstallationCommercial(head)).toBe(true);
    expect(canApproveInstallationCommercial(['quotes:approve'])).toBe(false);
    expect(canApproveInstallationCommercial(['facade_pricing:approve'])).toBe(
      false,
    );
    expect(canReadInstallationCost(['leads:read'])).toBe(false);
    expect(canUpdateInstallationTechnical(['installation:update_technical'])).toBe(
      true,
    );
    expect(canUpdateInstallationTechnical(head)).toBe(false);
  });

  it('keeps RU/UZ/EN installation copy', () => {
    expect(dictionaries.ru.installationPricing.title).toBe('Стоимость монтажа');
    expect(dictionaries.en.installationPricing.title).toBe('Installation cost');
    expect(dictionaries.uz.installationPricing.title).toBe('Montaj qiymati');
    expect(dictionaries.ru.engineering.installationTitle).toBe('Монтаж');
    expect(dictionaries.ru.navigation.installationRates).toBe('Тарифы монтажа');
  });
});
