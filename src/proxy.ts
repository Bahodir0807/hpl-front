import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { randomUUID } from 'node:crypto';

// Next.js 16: конвенция middleware переименована в proxy
// (node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md).
// Это оптимистичная проверка наличия сессии, а не полноценная авторизация:
// валидность токена подтверждает backend при первом API-запросе.

const PUBLIC_PATHS = ['/login'];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const nonce = Buffer.from(randomUUID()).toString('base64');
  const isDev = process.env.NODE_ENV === 'development';
  const cspHeader = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'nonce-" + nonce + "'",
    "style-src-attr 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "connect-src 'self'",
    ...(isDev ? [] : ['upgrade-insecure-requests']),
  ].join('; ');
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', cspHeader);

  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    return addSecurityPolicy(
      NextResponse.next({ request: { headers: requestHeaders } }),
      cspHeader,
    );
  }

  // accessToken живёт недолго, поэтому наличие refreshToken достаточно,
  // чтобы пропустить запрос — клиент обновит пару через /auth/refresh.
  const accessToken = request.cookies.get('accessToken')?.value;
  const refreshToken = request.cookies.get('refreshToken')?.value;

  if (!accessToken && !refreshToken) {
    return addSecurityPolicy(
      NextResponse.redirect(new URL('/login', request.url)),
      cspHeader,
    );
  }

  return addSecurityPolicy(
    NextResponse.next({ request: { headers: requestHeaders } }),
    cspHeader,
  );
}

function addSecurityPolicy(response: NextResponse, cspHeader: string) {
  response.headers.set('Content-Security-Policy', cspHeader);
  return response;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
