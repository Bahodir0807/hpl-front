export const baseURL =
  process.env.BROWSER_QA_BASE_URL ?? 'http://localhost:3007';
export const apiURL =
  process.env.BROWSER_QA_API_URL ?? 'http://127.0.0.1:3006/api';
export const authDir = `${process.cwd()}/.auth`;
export const screenshotRoot = `${process.cwd()}/artifacts/phase6/${new Date().toISOString().slice(0, 10)}`;
export const LOGIN_SPACING_MS = Number(
  process.env.BROWSER_QA_LOGIN_SPACING_MS ?? '13000',
);
