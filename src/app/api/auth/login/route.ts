import { NextResponse } from 'next/server';
import { getBackendApiUrl, setAuthCookies } from '@/lib/auth-cookies';

type LoginBody = {
  email?: string;
  password?: string;
};

type LoginResponse = {
  accessToken: string;
  refreshToken: string;
};

export async function POST(request: Request) {
  let body: LoginBody;

  try {
    body = (await request.json()) as LoginBody;
  } catch {
    return NextResponse.json(
      { message: 'Invalid request body' },
      { status: 400 },
    );
  }

  const { email, password } = body;

  if (!email || !password) {
    return NextResponse.json(
      { message: 'Email and password are required' },
      { status: 400 },
    );
  }

  const backendResponse = await fetch(`${getBackendApiUrl()}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!backendResponse.ok) {
    let errorBody: unknown = { message: 'Login failed' };

    try {
      errorBody = await backendResponse.json();
    } catch {
      // ignore parse errors
    }

    return NextResponse.json(errorBody, { status: backendResponse.status });
  }

  const { accessToken, refreshToken } =
    (await backendResponse.json()) as LoginResponse;

  await setAuthCookies(accessToken, refreshToken);

  return NextResponse.json({ success: true });
}
