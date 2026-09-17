import { dictionaries } from './dictionaries';
import { getActiveMessages } from './active-messages';
import { getByPath } from './translate';
import type { Messages } from './types';

const ROLE_ALIASES: Record<string, string> = {
  'acceptance manager': 'roles.ACCEPTANCE_MANAGER',
  'acceptance head': 'roles.ACCEPTANCE_HEAD',
  'acceptance_manager': 'roles.ACCEPTANCE_MANAGER',
  'acceptance_head': 'roles.ACCEPTANCE_HEAD',
};

function shouldIndexValue(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.length >= 3 && !trimmed.includes('{');
}

function collectValueKeys(
  value: unknown,
  prefix = '',
  into: Map<string, string>,
): void {
  if (typeof value === 'string') {
    if (prefix && shouldIndexValue(value)) {
      into.set(value, prefix);
    }
    return;
  }

  if (!value || typeof value !== 'object') {
    return;
  }

  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    collectValueKeys(nested, prefix ? `${prefix}.${key}` : key, into);
  }
}

function buildSystemLabelIndex(): Map<string, string> {
  const index = new Map<string, string>();

  for (const messages of Object.values(dictionaries)) {
    collectValueKeys(messages, '', index);
  }

  return index;
}

const SYSTEM_LABEL_INDEX = buildSystemLabelIndex();

export function localizeSystemText(
  value: string | null | undefined,
  messages: Messages = getActiveMessages(),
): string {
  if (value == null) {
    return messages.common.dash;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return messages.common.dash;
  }

  const aliasKey = ROLE_ALIASES[trimmed.toLowerCase()];
  if (aliasKey) {
    const aliased = getByPath(messages, aliasKey);
    if (typeof aliased === 'string') {
      return aliased;
    }
  }

  const exactKey = SYSTEM_LABEL_INDEX.get(trimmed);
  if (exactKey) {
    const localized = getByPath(messages, exactKey);
    if (typeof localized === 'string') {
      return localized;
    }
  }

  return trimmed;
}
