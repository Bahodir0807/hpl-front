import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { installationSelectionToBoolean } from '@/components/leads/installation-required-field';
import { buildQualifyLeadPayload } from '@/components/leads/qualify-lead-form';
import { apiClient } from '../lib/api-client';
import { useQualifyLead } from './use-leads';

vi.mock('../lib/api-client', () => ({
  apiClient: {
    post: vi.fn(),
  },
}));

vi.mock('../lib/toast', () => ({
  showSuccess: vi.fn(),
  showError: vi.fn(),
}));

const LEAD_ID = '66666666-6666-4666-8666-666666666666';
const CLIENT_ID = '11111111-1111-4111-8111-111111111111';
const CONTACT_ID = '33333333-3333-4333-8333-333333333333';
const OBJECT_ID = '22222222-2222-4222-8222-222222222222';
const TYPE_ID = '44444444-4444-4444-8444-444444444444';
const SIZE_ID = '55555555-5555-4555-8555-555555555555';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe('useQualifyLead HTTP contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { id: LEAD_ID, status: 'QUALIFIED' },
    });
  });

  it('POSTs the serializer body to /leads/:id/qualify without the local id field', async () => {
    const payload = buildQualifyLeadPayload({
      leadId: LEAD_ID,
      clientId: CLIENT_ID,
      contactId: CONTACT_ID,
      projectObjectId: OBJECT_ID,
      values: {
        clientId: CLIENT_ID,
        objectMode: 'EXISTING',
        projectObjectId: OBJECT_ID,
        newObjectName: '',
        newObjectAddress: '',
        objectStage: 'Скоро фасад',
        objectExpectedDate: '2026-11-15',
        contactMode: 'EXISTING',
        contactId: CONTACT_ID,
        contactFirstName: '',
        contactLastName: '',
        contactPhone: '',
        contactEmail: '',
        needDescription: 'HPL панели для фасада школы',
        decisionMakerContact: 'Главный архитектор',
        installationRequired: 'yes',
        ventFacadeExists: 'yes',
        ventFacadeKitRequired: 'no',
        urgent: false,
        willingToWait: true,
      },
      installationRequired: installationSelectionToBoolean('yes'),
      items: [
        {
          application: 'INTERIOR',
          panelTypeId: TYPE_ID,
          thicknessMm: null,
          panelSizeId: SIZE_ID,
          customWidthMm: null,
          customHeightMm: null,
          colorCode: null,
          colorName: 'тёмно-серый',
          requiredAreaM2: 24.5,
        },
      ],
    });

    const { result } = renderHook(() => useQualifyLead(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync(payload);

    await waitFor(() => expect(apiClient.post).toHaveBeenCalledTimes(1));

    expect(apiClient.post).toHaveBeenCalledWith(
      `/leads/${LEAD_ID}/qualify`,
      expect.not.objectContaining({ id: LEAD_ID }),
    );

    const [, body] = vi.mocked(apiClient.post).mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];

    expect(body).not.toHaveProperty('id');
    expect(body).toMatchObject({
      clientId: CLIENT_ID,
      contactId: CONTACT_ID,
      projectObjectId: OBJECT_ID,
      objectStage: 'Скоро фасад',
      needDescription: 'HPL панели для фасада школы',
      decisionMakerContact: 'Главный архитектор',
      qualification: {
        installationRequired: true,
        ventFacadeExists: true,
        ventFacadeKitRequired: false,
        urgent: false,
        willingToWait: true,
        customerRequirements: 'HPL панели для фасада школы',
      },
    });
    expect(body.objectExpectedDate).toEqual(expect.stringMatching(/^2026-11-1[45]T/));
    expect(body.qualification).toEqual(
      expect.objectContaining({
        items: [
          expect.objectContaining({
            application: 'INTERIOR',
            panelTypeId: TYPE_ID,
            thicknessMm: null,
            panelSizeId: SIZE_ID,
            requiredAreaM2: 24.5,
          }),
        ],
      }),
    );
  });
});
