import { describe, expect, it } from 'vitest';
import {
  canAssignEngineerToLead,
  leadNeedsEngineer,
  prefersEngineerWorkspace,
} from './engineering';
import { ENGINEER_PERMISSION_SHAPE } from './auth-routing';

describe('engineering helpers', () => {
  it('does not require an engineer for HPL-only', () => {
    expect(
      leadNeedsEngineer({
        installationRequired: false,
        ventFacadeKitRequired: false,
      }),
    ).toBe(false);
    expect(
      canAssignEngineerToLead({
        permissions: ['engineering:assign'],
        status: 'QUALIFIED',
        qualification: {
          installationRequired: false,
          ventFacadeKitRequired: false,
        },
      }),
    ).toBe(false);
  });

  it('requires a single engineer for subsystem, installation, or both', () => {
    expect(
      leadNeedsEngineer({
        installationRequired: false,
        ventFacadeKitRequired: true,
      }),
    ).toBe(true);
    expect(
      leadNeedsEngineer({
        installationRequired: true,
        ventFacadeKitRequired: false,
      }),
    ).toBe(true);
    expect(
      leadNeedsEngineer({
        installationRequired: true,
        ventFacadeKitRequired: true,
      }),
    ).toBe(true);
  });

  it('hides the action without engineering:assign', () => {
    expect(
      canAssignEngineerToLead({
        permissions: ['leads:update'],
        status: 'QUALIFIED',
        qualification: { installationRequired: true },
      }),
    ).toBe(false);
  });

  it('routes engineering-scoped users to the engineer workspace', () => {
    expect(prefersEngineerWorkspace([...ENGINEER_PERMISSION_SHAPE])).toBe(true);
    expect(
      prefersEngineerWorkspace(['engineering:read', 'leads:read_all']),
    ).toBe(false);
  });
});
