import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  ADMIN_PROVISIONABLE_ROLES,
  ADMIN_PROTECTED_ASSIGNMENT_ROLES,
  CANONICAL_ROLES,
  roleLabels,
} from './labels';

const EXPECTED_ADMIN_ASSIGNABLE_ROLES = [
  'ADMIN',
  'DIRECTOR',
  'HEAD',
  'MANAGER',
  'ACCOUNTANT',
  'STOREKEEPER',
] as const;

describe('user role labels and assignment policy', () => {
  it('labels all canonical roles in Russian', () => {
    expect(CANONICAL_ROLES).toEqual([...EXPECTED_ADMIN_ASSIGNABLE_ROLES]);
    expect(roleLabels.ADMIN).toBe('Администратор');
    expect(roleLabels.DIRECTOR).toBe('Директор');
    expect(roleLabels.HEAD).toBe('Руководитель');
    expect(roleLabels.MANAGER).toBe('Менеджер');
    expect(roleLabels.ACCOUNTANT).toBe('Бухгалтер');
    expect(roleLabels.STOREKEEPER).toBe('Кладовщик');
    expect(roleLabels).not.toHaveProperty('OBSERVER');
    expect(roleLabels).not.toHaveProperty('FINANCIER');
  });

  it('lets ADMIN assign every canonical role, including DIRECTOR, HEAD, and ACCOUNTANT', () => {
    expect(ADMIN_PROVISIONABLE_ROLES).toEqual(CANONICAL_ROLES);
    expect(ADMIN_PROVISIONABLE_ROLES).toEqual([
      ...EXPECTED_ADMIN_ASSIGNABLE_ROLES,
    ]);
    expect(ADMIN_PROVISIONABLE_ROLES).toContain('DIRECTOR');
    expect(ADMIN_PROVISIONABLE_ROLES).toContain('HEAD');
    expect(ADMIN_PROVISIONABLE_ROLES).toContain('ACCOUNTANT');
    expect(ADMIN_PROTECTED_ASSIGNMENT_ROLES).toEqual([
      'DIRECTOR',
      'HEAD',
      'ACCOUNTANT',
    ]);
    expect(ADMIN_PROVISIONABLE_ROLES).not.toContain('OBSERVER');
    expect(ADMIN_PROVISIONABLE_ROLES).not.toContain('FINANCIER');
  });

  it('accepts every provisionable role in the user-create zod enum', () => {
    const schema = z.enum(ADMIN_PROVISIONABLE_ROLES);

    for (const role of ADMIN_PROVISIONABLE_ROLES) {
      expect(schema.parse(role)).toBe(role);
    }

    expect(schema.safeParse('OBSERVER').success).toBe(false);
    expect(schema.safeParse('FINANCIER').success).toBe(false);
  });
});
