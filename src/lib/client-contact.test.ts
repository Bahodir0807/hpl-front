import { describe, expect, it } from 'vitest';
import {
  buildCreateClientPayload,
  buildUpdateClientContactPayload,
  displayContactValue,
  resolveClientContactPresentation,
} from './client-contact';

describe('client contact presentation', () => {
  it('maps a linked contact person separately from the client', () => {
    expect(
      resolveClientContactPresentation({
        client: {
          name: 'ООО Фасад',
          phone: '+998901112233',
          email: 'office@fasad.uz',
        },
        contact: {
          firstName: 'Иван',
          lastName: 'Петров',
          phone: '+998909998877',
          email: 'ivan@fasad.uz',
        },
      }),
    ).toEqual({
      clientName: 'ООО Фасад',
      contactName: 'Иван Петров',
      phone: '+998909998877',
      email: 'ivan@fasad.uz',
    });
  });

  it('falls back to client phone/email when the contact person has none', () => {
    expect(
      resolveClientContactPresentation({
        client: {
          name: 'ООО Фасад',
          phone: '+998901112233',
          email: 'office@fasad.uz',
        },
        contact: {
          firstName: 'Иван',
          lastName: 'Петров',
        },
      }),
    ).toEqual({
      clientName: 'ООО Фасад',
      contactName: 'Иван Петров',
      phone: '+998901112233',
      email: 'office@fasad.uz',
    });
  });

  it('does not invent a contact person from the client name', () => {
    expect(
      resolveClientContactPresentation({
        client: {
          name: 'ООО Фасад',
          phone: '+998901112233',
          email: 'office@fasad.uz',
        },
      }),
    ).toEqual({
      clientName: 'ООО Фасад',
      contactName: null,
      phone: '+998901112233',
      email: 'office@fasad.uz',
    });
  });

  it('uses the primary client contact when the lead has no linked person', () => {
    expect(
      resolveClientContactPresentation({
        client: {
          name: 'ООО Фасад',
          phone: '+998901112233',
          contacts: [
            {
              firstName: 'Мария',
              lastName: 'Иванова',
              phone: '+998907776655',
              email: 'maria@fasad.uz',
              isPrimary: true,
            },
          ],
        },
      }),
    ).toEqual({
      clientName: 'ООО Фасад',
      contactName: 'Мария Иванова',
      phone: '+998907776655',
      email: 'maria@fasad.uz',
    });
  });

  it('displays em dash for missing phone and email', () => {
    expect(displayContactValue(null)).toBe('—');
    expect(displayContactValue('   ')).toBe('—');
    expect(displayContactValue('+998901112233')).toBe('+998901112233');
  });
});

describe('client create/update payloads', () => {
  it('sends client and contact phone/email and omits blank optional fields', () => {
    expect(
      buildCreateClientPayload({
        type: 'COMPANY',
        name: 'ООО Фасад',
        phone: ' +998901112233 ',
        email: 'office@fasad.uz',
        inn: '',
        contactFirstName: 'Иван',
        contactLastName: 'Петров',
        contactPhone: '+998909998877',
        contactEmail: 'ivan@fasad.uz',
        region: '  ',
      }),
    ).toEqual({
      type: 'COMPANY',
      name: 'ООО Фасад',
      inn: undefined,
      phone: '+998901112233',
      email: 'office@fasad.uz',
      segment: undefined,
      region: undefined,
      address: undefined,
      source: undefined,
      comment: undefined,
      contacts: [
        {
          firstName: 'Иван',
          lastName: 'Петров',
          phone: '+998909998877',
          email: 'ivan@fasad.uz',
          isPrimary: true,
        },
      ],
    });
  });

  it('omits the nested contact when no contact person name is provided', () => {
    expect(
      buildCreateClientPayload({
        type: 'INDIVIDUAL',
        name: 'Иван Петров',
        phone: '+998901112233',
        email: 'ivan@fasad.uz',
      }),
    ).toMatchObject({
      phone: '+998901112233',
      email: 'ivan@fasad.uz',
      contacts: undefined,
    });
  });

  it('omits blank phone/email from an update payload', () => {
    expect(
      buildUpdateClientContactPayload({
        phone: ' +998901112233 ',
        email: '  ',
      }),
    ).toEqual({
      phone: '+998901112233',
      email: undefined,
    });
  });
});
