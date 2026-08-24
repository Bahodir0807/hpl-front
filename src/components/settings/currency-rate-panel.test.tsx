import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CurrencyRatePanel } from './currency-rate-panel';

const useAuthMock = vi.fn();
const useCurrentCurrencyRateMock = vi.fn();
const mutateAsync = vi.fn();

vi.mock('@/context/auth-context', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('@/hooks/use-currency-rates', () => ({
  CURRENCY_RATES_READ_PERMISSION: 'currency_rates:read',
  CURRENCY_RATES_MANAGE_PERMISSION: 'currency_rates:manage',
  useCurrentCurrencyRate: (...args: unknown[]) =>
    useCurrentCurrencyRateMock(...args),
  useCreateCurrencyRate: () => ({
    mutateAsync,
    isPending: false,
    data: null,
  }),
}));

function auth(permissions: string[]) {
  return {
    user: {
      id: 'user-1',
      email: 'user@hpl.local',
      roles: [],
      permissions,
    },
    hasPermission: (slug: string) => permissions.includes(slug),
    isInitialized: true,
    login: vi.fn(),
    logout: vi.fn(),
  };
}

describe('CurrencyRatePanel', () => {
  it('shows the DIRECTOR form for currency_rates:manage', async () => {
    useAuthMock.mockReturnValue(
      auth(['currency_rates:read', 'currency_rates:manage']),
    );
    useCurrentCurrencyRateMock.mockReturnValue({
      data: { fromCurrency: 'CNY', toCurrency: 'USD', rate: '0.14' },
      isLoading: false,
      isError: false,
    });

    render(<CurrencyRatePanel />);

    expect(screen.getByText('Курс CNY → USD')).toBeInTheDocument();
    expect(screen.getByText(/1 CNY = 0.14 USD/)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Сохранить курс' }),
    ).toBeInTheDocument();

    await userEvent.type(
      screen.getByPlaceholderText('0.14'),
      '0.15',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Сохранить курс' }));
    expect(mutateAsync).toHaveBeenCalledWith({ rate: '0.15' });
  });

  it('is read-only for HEAD/MANAGER without manage permission', () => {
    useAuthMock.mockReturnValue(auth(['currency_rates:read']));
    useCurrentCurrencyRateMock.mockReturnValue({
      data: { fromCurrency: 'CNY', toCurrency: 'USD', rate: '0.14' },
      isLoading: false,
      isError: false,
    });

    render(<CurrencyRatePanel />);

    expect(screen.getByText('Курс CNY → USD')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Сохранить курс' }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText('Изменять курс может только директор.'),
    ).toBeInTheDocument();
  });

  it('hides the panel from unauthorized roles', () => {
    useAuthMock.mockReturnValue(auth(['users:read']));
    useCurrentCurrencyRateMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
    });

    const { container } = render(<CurrencyRatePanel />);
    expect(container).toBeEmptyDOMElement();
  });
});
