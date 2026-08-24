import type {
  CreateClientPayload,
  CreateContactPayload,
} from '@/hooks/use-clients';

export type ClientContactSource = {
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  contacts?: Array<{
    firstName?: string | null;
    lastName?: string | null;
    phone?: string | null;
    email?: string | null;
    isPrimary?: boolean;
  }> | null;
} | null;

export type ContactPersonSource = {
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  email?: string | null;
} | null;

export type ClientContactPresentation = {
  clientName: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
};

export function optionalClientText(
  value?: string | null,
): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function displayContactValue(
  value?: string | null,
): string {
  return optionalClientText(value) ?? '—';
}

function firstText(
  ...values: Array<string | null | undefined>
): string | null {
  for (const value of values) {
    const trimmed = optionalClientText(value);
    if (trimmed) {
      return trimmed;
    }
  }

  return null;
}

function contactPersonName(contact?: ContactPersonSource): string | null {
  if (!contact) {
    return null;
  }

  const name = `${contact.firstName ?? ''} ${contact.lastName ?? ''}`.trim();
  return name || null;
}

function primaryClientContact(
  client?: ClientContactSource,
): ContactPersonSource {
  const contacts = client?.contacts ?? [];
  if (contacts.length === 0) {
    return null;
  }

  return contacts.find((item) => item.isPrimary) ?? contacts[0] ?? null;
}

export function mergeContactSources<T extends object>(
  ...parts: Array<T | null | undefined>
): T | null {
  const defined = parts.filter((part): part is T => Boolean(part));
  if (defined.length === 0) {
    return null;
  }

  return Object.assign({}, ...defined) as T;
}

export function resolveClientContactPresentation({
  client,
  contact,
}: {
  client?: ClientContactSource;
  contact?: ContactPersonSource;
}): ClientContactPresentation {
  const linkedContact = contactPersonName(contact) ? contact : null;
  const fallbackContact = linkedContact ? null : primaryClientContact(client);
  const resolvedContact = linkedContact ?? fallbackContact;

  return {
    clientName: firstText(client?.name) ?? '—',
    contactName: contactPersonName(resolvedContact),
    phone: firstText(
      resolvedContact?.phone,
      client?.phone,
    ),
    email: firstText(
      resolvedContact?.email,
      client?.email,
    ),
  };
}

export function buildCreateClientPayload(input: {
  type: CreateClientPayload['type'];
  name: string;
  inn?: string;
  phone?: string;
  email?: string;
  segment?: CreateClientPayload['segment'];
  region?: string;
  address?: string;
  source?: string;
  comment?: string;
  contactFirstName?: string;
  contactLastName?: string;
  contactPhone?: string;
  contactEmail?: string;
}): CreateClientPayload {
  const contactFirstName = optionalClientText(input.contactFirstName);
  const contact: CreateContactPayload | undefined = contactFirstName
    ? {
        firstName: contactFirstName,
        lastName: optionalClientText(input.contactLastName),
        phone: optionalClientText(input.contactPhone),
        email: optionalClientText(input.contactEmail),
        isPrimary: true,
      }
    : undefined;

  return {
    type: input.type,
    name: input.name.trim(),
    inn: optionalClientText(input.inn),
    phone: optionalClientText(input.phone),
    email: optionalClientText(input.email),
    segment: input.segment,
    region: optionalClientText(input.region),
    address: optionalClientText(input.address),
    source: optionalClientText(input.source),
    comment: optionalClientText(input.comment),
    contacts: contact ? [contact] : undefined,
  };
}

export function buildUpdateClientContactPayload(input: {
  phone?: string;
  email?: string;
}): { phone?: string; email?: string } {
  return {
    phone: optionalClientText(input.phone),
    email: optionalClientText(input.email),
  };
}
