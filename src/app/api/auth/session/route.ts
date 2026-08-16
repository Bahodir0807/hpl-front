import { NextResponse } from 'next/server';
import { getAccessToken, getRefreshToken } from '@/lib/auth-cookies';

export async function GET() {
  const [accessToken, refreshToken] = await Promise.all([
    getAccessToken(),
    getRefreshToken(),
  ]);

  return NextResponse.json({
    hasSession: Boolean(accessToken || refreshToken),
  });
}
