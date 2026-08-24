import { describe, expect, it } from 'vitest';
import {
  ACCOUNTANT_PERMISSION_SHAPE,
  STOREKEEPER_PERMISSION_SHAPE,
  INSTALLER_PERMISSION_SHAPE,
  getDefaultAuthenticatedPath,
  prefersAccountantWorkspace,
  prefersInstallerWorkspace,
  prefersStorekeeperWorkspace,
} from './auth-routing';

describe('getDefaultAuthenticatedPath', () => {
  it('routes sales roles to leads when they can read leads', () => {
    expect(
      getDefaultAuthenticatedPath({ permissions: ['auth:me', 'leads:read'] }),
    ).toBe('/leads');
  });

  it('does not send technical admin users to leads without leads permission', () => {
    expect(
      getDefaultAuthenticatedPath({
        permissions: ['auth:me', 'users:read', 'admin:queues'],
      }),
    ).toBe('/users');
  });

  it('routes real ACCOUNTANT permissions to orders', () => {
    expect(
      getDefaultAuthenticatedPath({
        permissions: [...ACCOUNTANT_PERMISSION_SHAPE],
      }),
    ).toBe('/orders');
    expect(prefersAccountantWorkspace(ACCOUNTANT_PERMISSION_SHAPE)).toBe(true);
  });

  it('routes real STOREKEEPER permissions to receipts', () => {
    expect(
      getDefaultAuthenticatedPath({
        permissions: [...STOREKEEPER_PERMISSION_SHAPE],
      }),
    ).toBe('/receipts');
    expect(prefersStorekeeperWorkspace(STOREKEEPER_PERMISSION_SHAPE)).toBe(true);
  });

  it('routes real INSTALLER permissions to the installation workspace', () => {
    expect(
      getDefaultAuthenticatedPath({
        permissions: [...INSTALLER_PERMISSION_SHAPE],
      }),
    ).toBe('/installations');
    expect(prefersInstallerWorkspace(INSTALLER_PERMISSION_SHAPE)).toBe(true);
  });

  it('keeps HEAD and DIRECTOR on leads even with installation authority', () => {
    expect(
      getDefaultAuthenticatedPath({
        permissions: [
          'auth:me',
          'leads:read',
          'deals:read',
          'installation:schedule',
          'installation:confirm_supervisor',
          'installation:assess',
        ],
      }),
    ).toBe('/leads');
  });

  it('falls back to the authenticated dashboard for users without module permissions', () => {
    expect(getDefaultAuthenticatedPath({ permissions: ['auth:me'] })).toBe('/');
  });
});
