import { NextResponse } from 'next/server';
import {
  clearAuthCookies,
  getAccessToken,
  getBackendApiUrl,
  getRefreshToken,
} from '@/lib/auth-cookies';

export async function POST() {
  const refreshToken = await getRefreshToken();
  const accessToken = await getAccessToken();

  if (refreshToken) {
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }

      await fetch(`${getBackendApiUrl()}/auth/logout`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ refreshToken }),
      });
    } catch {
      // Cookies are cleared below even if Nest is unreachable.
    }
  }

  await clearAuthCookies();

  return NextResponse.json({ success: true });
}
