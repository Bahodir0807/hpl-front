export const LEAD_PREFIX = 'BrowserQA-';
export const PROBE_EMAIL = 'phase5-qa-isolation@browser-qa.hpl';
export const PASSWORD = 'Password123!';

export const ROLE_EMAILS = {
  manager: 'manager1@hpl.com',
  head: 'head@hpl.com',
  engineer: 'engineer@hpl.com',
  director: 'director@hpl.com',
  admin: 'admin@hpl.com',
} as const;

export type RoleKey = keyof typeof ROLE_EMAILS;
