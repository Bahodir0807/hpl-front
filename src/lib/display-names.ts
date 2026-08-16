import { Contact } from "../hooks/use-clients";
import { User } from "../hooks/use-users";

export type PersonLike = {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
};

export type NamedEntityLike = {
  name?: string | null;
  title?: string | null;
};

function looksLikeOpaqueId(value: string): boolean {
  return (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    ) || /^\d{6,}$/i.test(value)
  );
}

export function formatPersonName(
  person?: PersonLike | null,
  fallback = "—",
): string {
  if (!person) {
    return fallback;
  }

  const name = `${person.firstName ?? ""} ${person.lastName ?? ""}`.trim();

  return name || person.email || fallback;
}

export function formatContactName(
  contact?: Pick<Contact, "firstName" | "lastName"> | null,
  fallback = "—",
): string {
  if (!contact) {
    return fallback;
  }

  return formatPersonName(contact, fallback);
}

export function resolveEntityName(
  entity?: NamedEntityLike | null,
  entityId?: string | null,
  fallback = "—",
): string {
  const resolved = entity?.name ?? entity?.title;

  if (resolved) {
    return resolved;
  }

  if (entityId && !looksLikeOpaqueId(entityId)) {
    return entityId;
  }

  return fallback;
}

export function resolveUserName(
  user: PersonLike | null | undefined,
  userId: string | null | undefined,
  usersById?: Map<string, User>,
  fallback = "—",
): string {
  if (user) {
    return formatPersonName(user, fallback);
  }

  if (userId && usersById) {
    const found = usersById.get(userId);

    if (found) {
      return formatPersonName(found);
    }
  }

  if (userId && !looksLikeOpaqueId(userId)) {
    return userId;
  }

  return fallback;
}

const GENERIC_STAGE_REQUIREMENT_MESSAGES = new Set([
  "deal stage requirements are not met",
  "deal stage requirements are not met.",
]);

export function localizeStageRequirementMessage(
  message?: string,
): string | undefined {
  if (!message) {
    return undefined;
  }

  const normalized = message.trim().toLowerCase();

  if (GENERIC_STAGE_REQUIREMENT_MESSAGES.has(normalized)) {
    return undefined;
  }

  return message.trim();
}

export function hasApproverRole(roles: string[]): boolean {
  return roles.includes("HEAD") || roles.includes("ADMIN");
}
