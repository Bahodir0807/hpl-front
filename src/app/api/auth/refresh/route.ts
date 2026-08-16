import { NextResponse } from 'next/server';
import {
  getBackendApiUrl,
  getRefreshToken,
  setAuthCookies,
} from '@/lib/auth-cookies';

type RefreshResponse = {
  accessToken: string;
  refreshToken?: string;
};

export async function POST() {
  const refreshToken = await getRefreshToken();

  if (!refreshToken) {
    return NextResponse.json(
      { message: 'Refresh token is missing' },
      { status: 401 },
    );
  }

  const backendResponse = await fetch(`${getBackendApiUrl()}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!backendResponse.ok) {
    let errorBody: unknown = { message: 'Refresh failed' };

    try {
      errorBody = await backendResponse.json();
    } catch {
      // ignore parse errors
    }

    return NextResponse.json(errorBody, { status: backendResponse.status });
  }

  const data = (await backendResponse.json()) as RefreshResponse;

  await setAuthCookies(
    data.accessToken,
    data.refreshToken ?? refreshToken,
  );

  return NextResponse.json({ success: true });
}
