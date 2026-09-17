import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CreateClientModal } from './create-client-modal';

const mutateAsync = vi.fn();

vi.mock('@/hooks/use-clients', () => ({
  useCreateClient: () => ({
    mutateAsync,
    isPending: false,
    isError: false,
  }),
  useCheckClientDuplicates: () => ({
    data: [],
    isFetching: false,
  }),
}));

describe('CreateClientModal contact fields', () => {
  beforeEach(() => {
    mutateAsync.mockReset();
    mutateAsync.mockResolvedValue({ id: 'client-1' });
  });

  it('shows phone and email fields for the client and contact person', () => {
    render(<CreateClientModal isOpen onClose={vi.fn()} />);

    expect(screen.getByRole('textbox', { name: 'Название' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /Тип/i })).toHaveDisplayValue('Компания');
    expect(screen.getByRole('option', { name: 'Компания' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Физлицо' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'COMPANY' })).not.toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Телефон' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Email' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Контакт: телефон' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Контакт: email' })).toBeInTheDocument();
  });

  it('sends phone and email on create', async () => {
    render(<CreateClientModal isOpen onClose={vi.fn()} />);

    await userEvent.type(screen.getByRole('textbox', { name: 'Название' }), 'ООО Фасад');
    await userEvent.type(screen.getByRole('textbox', { name: 'Телефон' }), '+998901112233');
    await userEvent.type(screen.getByRole('textbox', { name: 'Email' }), 'office@fasad.uz');
    await userEvent.click(screen.getByRole('button', { name: 'Создать' }));

    expect(mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'ООО Фасад',
        phone: '+998901112233',
        email: 'office@fasad.uz',
      }),
    );
  });
});
