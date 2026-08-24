import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Lead } from '@/hooks/use-leads';
import { FORBIDDEN_ACTION_MESSAGE } from '@/lib/operational-errors';
import { QualifyLeadModal } from './qualify-lead-modal';

const mutateAsync = vi.fn();
const logout = vi.fn();
const apiPost = vi.fn();
const apiPatch = vi.fn();

vi.mock('@/hooks/use-leads', () => ({
  useQualifyLead: () => ({
    mutateAsync,
    isPending: false,
  }),
}));

vi.mock('@/hooks/use-clients', () => ({
  useClients: () => ({
    data: {
      items: [
        {
          id: '11111111-1111-4111-8111-111111111111',
          name: 'ООО Фасад',
          phone: '+998901112233',
          email: 'office@fasad.uz',
        },
      ],
    },
    isFetching: false,
  }),
  useClient: () => ({
    data: {
      id: '11111111-1111-4111-8111-111111111111',
      name: 'ООО Фасад',
      phone: '+998901112233',
      email: 'office@fasad.uz',
      contacts: [
        {
          id: '33333333-3333-4333-8333-333333333333',
          firstName: 'Иван',
          lastName: 'Петров',
          phone: '+998909998877',
          email: 'ivan@fasad.uz',
          isPrimary: true,
        },
      ],
      projectObjects: [
        {
          id: '22222222-2222-4222-8222-222222222222',
          name: 'Школа №1',
          stage: 'ACTIVE',
        },
      ],
    },
    isFetching: false,
  }),
}));

vi.mock('@/hooks/use-panels', () => ({
  usePanelTypes: () => ({
    data: [{ id: '44444444-4444-4444-8444-444444444444', code: 'interior' }],
    isFetching: false,
  }),
  usePanelSizes: () => ({
    data: [
      {
        id: '55555555-5555-4555-8555-555555555555',
        displayName: '1220 × 2440',
        widthMm: 1220,
        heightMm: 2440,
        areaM2: 2.97,
      },
    ],
    isFetching: false,
  }),
}));

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    post: (...args: unknown[]) => apiPost(...args),
    patch: (...args: unknown[]) => apiPatch(...args),
  },
}));

function axiosError(status: number, message: string): AxiosError {
  return new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined, {
    status,
    statusText: 'Error',
    headers: {},
    config: { headers: {} } as never,
    data: { message },
  });
}

function lead(overrides: Partial<Lead> = {}): Lead {
  return {
    id: 'lead-1',
    title: 'Фасад школы',
    source: 'website',
    status: 'NEW',
    ownerId: 'manager-1',
    clientId: '11111111-1111-4111-8111-111111111111',
    contactId: '33333333-3333-4333-8333-333333333333',
    projectObjectId: '22222222-2222-4222-8222-222222222222',
    needDescription: 'HPL панели для фасада школы',
    decisionMakerContact: 'Главный архитектор',
    createdAt: '2026-08-19T10:00:00.000Z',
    updatedAt: '2026-08-19T10:00:00.000Z',
    client: {
      id: '11111111-1111-4111-8111-111111111111',
      name: 'ООО Фасад',
      phone: '+998901112233',
      email: 'office@fasad.uz',
    },
    contact: {
      id: '33333333-3333-4333-8333-333333333333',
      firstName: 'Иван',
      lastName: 'Петров',
      phone: '+998909998877',
      email: 'ivan@fasad.uz',
    },
    projectObject: {
      id: '22222222-2222-4222-8222-222222222222',
      name: 'Школа №1',
    },
    qualification: {
      id: 'qual-1',
      leadId: 'lead-1',
      application: 'INTERIOR',
      panelTypeId: '44444444-4444-4444-8444-444444444444',
      thicknessMm: 8,
      panelSizeId: '55555555-5555-4555-8555-555555555555',
      colorCode: 'RAL-9005',
      colorName: 'Чёрный',
      requiredAreaM2: 24,
      installationRequired: true,
      urgent: false,
      willingToWait: true,
      panelType: { id: 'type-1', code: 'interior', displayNameRu: 'Интерьерный' },
    },
    ...overrides,
  };
}

describe('QualifyLeadModal MANAGER Stage 1', () => {
  beforeEach(() => {
    mutateAsync.mockReset();
    apiPost.mockReset();
    apiPatch.mockReset();
    logout.mockReset();
    mutateAsync.mockResolvedValue({ id: 'lead-1' });
    apiPatch.mockResolvedValue({ data: {} });
  });

  it('does not render commercial amount, timeline or stock-only fields', () => {
    render(<QualifyLeadModal lead={lead()} isOpen onClose={vi.fn()} />);

    expect(screen.queryByText('Оценка суммы')).not.toBeInTheDocument();
    expect(screen.queryByText('Срок реализации')).not.toBeInTheDocument();
    expect(screen.queryByText('Только склад')).not.toBeInTheDocument();
    expect(screen.queryByText('Данные контакта')).not.toBeInTheDocument();
  });

  it('uses mutually exclusive object modes', () => {
    render(<QualifyLeadModal lead={lead()} isOpen onClose={vi.fn()} />);

    expect(screen.getByText('Существующий объект')).toBeInTheDocument();
    expect(screen.getByText('Новый объект')).toBeInTheDocument();
    expect(screen.queryByLabelText('Название нового объекта')).not.toBeInTheDocument();
  });

  it('shows selected contact phone/email and does not copy the client name', () => {
    render(<QualifyLeadModal lead={lead()} isOpen onClose={vi.fn()} />);

    expect(screen.getAllByText('Иван Петров').length).toBeGreaterThan(0);
    expect(screen.getByText('+998909998877')).toBeInTheDocument();
    expect(screen.getByText('ivan@fasad.uz')).toBeInTheDocument();
    const contactContext = screen.getByText('Контакт', { selector: '.uppercase' }).parentElement;
    expect(contactContext).not.toHaveTextContent('ООО Фасад');
  });

  it('shows em dash when no contact is selected', () => {
    render(
      <QualifyLeadModal
        lead={lead({
          contactId: '',
          contact: null,
        })}
        isOpen
        onClose={vi.fn()}
      />,
    );

    const contactContext = screen.getByText('Контакт', { selector: '.uppercase' }).parentElement;
    expect(contactContext).toHaveTextContent('—');
  });

  it('keeps LPR as customer qualification information', () => {
    render(<QualifyLeadModal lead={lead()} isOpen onClose={vi.fn()} />);

    expect(
      screen.getByLabelText(/ЛПР \/ лицо, принимающее решение/),
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue('Главный архитектор')).toBeInTheDocument();
  });

  it('keeps explicit installation Да/Нет', () => {
    render(<QualifyLeadModal lead={lead()} isOpen onClose={vi.fn()} />);

    expect(screen.getByRole('radio', { name: 'Да' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Нет' })).not.toBeChecked();
  });

  it('submits the dedicated Stage 1 endpoint payload without forbidden commercial fields', async () => {
    const onClose = vi.fn();
    render(<QualifyLeadModal lead={lead()} isOpen onClose={onClose} />);

    await userEvent.click(screen.getByRole('button', { name: 'Квалифицировать' }));

    expect(mutateAsync).toHaveBeenCalledTimes(1);
    const payload = mutateAsync.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(payload).toMatchObject({
      id: 'lead-1',
      clientId: '11111111-1111-4111-8111-111111111111',
      contactId: '33333333-3333-4333-8333-333333333333',
      projectObjectId: '22222222-2222-4222-8222-222222222222',
      needDescription: 'HPL панели для фасада школы',
      decisionMakerContact: 'Главный архитектор',
    });
    expect(payload).not.toHaveProperty('estimatedAmount');
    expect(payload).not.toHaveProperty('estimatedAmountCurrency');
    expect(payload).not.toHaveProperty('targetDate');
    expect(payload.qualification).not.toHaveProperty('stockOnly');
    expect(payload.qualification).not.toHaveProperty('supplierId');
    expect(payload.qualification).not.toHaveProperty('qualityClassId');
    expect(apiPost).not.toHaveBeenCalled();
    expect(apiPatch).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('creates a new contact and includes contactId in qualify without a generic PATCH', async () => {
    apiPost.mockResolvedValueOnce({
      data: { id: '88888888-8888-4888-8888-888888888888' },
    });
    render(
      <QualifyLeadModal
        lead={lead({ contactId: null, contact: null })}
        isOpen
        onClose={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByRole('radio', { name: 'Новый контакт' }));
    await userEvent.type(screen.getByLabelText('Имя контакта'), 'Мария');
    await userEvent.click(screen.getByRole('button', { name: 'Квалифицировать' }));

    expect(apiPost).toHaveBeenCalledWith(
      '/clients/11111111-1111-4111-8111-111111111111/contacts',
      expect.objectContaining({ firstName: 'Мария', isPrimary: true }),
    );
    expect(mutateAsync.mock.calls[0]?.[0]).toMatchObject({
      contactId: '88888888-8888-4888-8888-888888888888',
    });
    expect(apiPatch).not.toHaveBeenCalled();
  });

  it('creates a new object and sends only the created projectObjectId', async () => {
    apiPost.mockResolvedValueOnce({ data: { id: '77777777-7777-4777-8777-777777777777' } });
    render(
      <QualifyLeadModal
        lead={lead({ projectObjectId: null, projectObject: null })}
        isOpen
        onClose={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByRole('radio', { name: 'Новый объект' }));
    await userEvent.type(
      screen.getByLabelText('Название нового объекта'),
      'Новая школа',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Квалифицировать' }));

    expect(apiPost).toHaveBeenCalledWith(
      '/clients/11111111-1111-4111-8111-111111111111/objects',
      { name: 'Новая школа' },
    );
    expect(mutateAsync.mock.calls[0]?.[0]).toMatchObject({
      projectObjectId: '77777777-7777-4777-8777-777777777777',
    });
    expect(JSON.stringify(mutateAsync.mock.calls[0]?.[0])).not.toContain(
      'Новая школа',
    );
  });

  it('rejects area 0 with an inline message and does not submit', async () => {
    render(
      <QualifyLeadModal
        lead={lead({
          qualification: {
            ...lead().qualification!,
            requiredAreaM2: 0,
          },
        })}
        isOpen
        onClose={vi.fn()}
      />,
    );

    const area = screen.getByLabelText(/Площадь, м2/);
    expect(area).toHaveValue(null);
    await userEvent.type(area, '0');
    await userEvent.click(screen.getByRole('button', { name: 'Квалифицировать' }));

    expect(screen.getByText('Укажите площадь больше 0.')).toBeInTheDocument();
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it('shows a 403 without logging the user out', async () => {
    mutateAsync.mockRejectedValue(axiosError(403, 'Forbidden'));
    const onClose = vi.fn();
    render(<QualifyLeadModal lead={lead()} isOpen onClose={onClose} />);

    await userEvent.click(screen.getByRole('button', { name: 'Квалифицировать' }));

    expect(await screen.findByText(FORBIDDEN_ACTION_MESSAGE)).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    expect(logout).not.toHaveBeenCalled();
  });
});
