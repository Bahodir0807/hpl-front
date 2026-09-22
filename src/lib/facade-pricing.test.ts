import { describe, expect, it } from 'vitest';
import {
  canApproveFacadeCommercial,
  canManageFacadeOffers,
  canPrepareFacadeCommercial,
  canReadFacadePurchase,
} from './facade-pricing';
import { dictionaries } from '@/i18n/dictionaries';

describe('facade pricing ACL helpers', () => {
  it('grants HEAD and DIRECTOR prepare/approve and keeps ENGINEER/MANAGER out', () => {
    const head = [
      'facade_pricing:read_purchase',
      'facade_pricing:manage_offers',
      'facade_pricing:prepare',
      'facade_pricing:approve',
    ];
    expect(canReadFacadePurchase(head)).toBe(true);
    expect(canManageFacadeOffers(head)).toBe(true);
    expect(canPrepareFacadeCommercial(head)).toBe(true);
    expect(canApproveFacadeCommercial(head)).toBe(true);
    expect(canApproveFacadeCommercial(['quotes:approve'])).toBe(false);
    expect(canApproveFacadeCommercial(['engineering:update_technical'])).toBe(
      false,
    );
    expect(canReadFacadePurchase(['leads:read'])).toBe(false);
  });

  it('keeps RU/UZ/EN commercial copy', () => {
    expect(dictionaries.ru.facadePricing.title).toBe('Стоимость подсистемы');
    expect(dictionaries.en.facadePricing.title).toBe('Subsystem cost');
    expect(dictionaries.uz.facadePricing.title).toBe('Podsistema qiymati');
    expect(dictionaries.ru.facadePricing.staleTechnical).toContain(
      'Технический расчёт изменён',
    );
  });
});
