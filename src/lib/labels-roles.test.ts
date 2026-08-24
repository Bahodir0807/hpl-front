import { describe, expect, it } from 'vitest';
import {
  ADMIN_PROVISIONABLE_ROLES,
  ADMIN_PROTECTED_ASSIGNMENT_ROLES,
  CANONICAL_ROLES,
  roleLabels,
} from './labels';

describe('user role labels and assignment policy', () => {
  it('labels all canonical roles in Russian', () => {
    expect(CANONICAL_ROLES).toEqual([
      'ADMIN',
      'DIRECTOR',
      'HEAD',
      'MANAGER',
      'ACCOUNTANT',
      'STOREKEEPER',
      'INSTALLER',
    ]);
    expect(roleLabels.ADMIN).toBe('Администратор');
    expect(roleLabels.DIRECTOR).toBe('Директор');
    expect(roleLabels.HEAD).toBe('Руководитель');
    expect(roleLabels.MANAGER).toBe('Менеджер');
    expect(roleLabels.ACCOUNTANT).toBe('Бухгалтер');
    expect(roleLabels.STOREKEEPER).toBe('Кладовщик');
    expect(roleLabels.INSTALLER).toBe('Монтажник');
    expect(roleLabels).not.toHaveProperty('OBSERVER');
    expect(roleLabels).not.toHaveProperty('FINANCIER');
  });

  it('lets ADMIN assign only non-protected roles', () => {
    expect(ADMIN_PROVISIONABLE_ROLES).toEqual([
      'ADMIN',
      'MANAGER',
      'STOREKEEPER',
      'INSTALLER',
    ]);
    expect(ADMIN_PROTECTED_ASSIGNMENT_ROLES).toEqual([
      'DIRECTOR',
      'HEAD',
      'ACCOUNTANT',
    ]);
    expect(ADMIN_PROVISIONABLE_ROLES).not.toContain('OBSERVER');
    expect(ADMIN_PROVISIONABLE_ROLES).not.toContain('FINANCIER');
    expect(ADMIN_PROVISIONABLE_ROLES).not.toContain('DIRECTOR');
    expect(ADMIN_PROVISIONABLE_ROLES).not.toContain('HEAD');
    expect(ADMIN_PROVISIONABLE_ROLES).not.toContain('ACCOUNTANT');
  });
});
