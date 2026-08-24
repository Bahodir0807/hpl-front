import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Next.js 16: конвенция middleware переименована в proxy
// (node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md).
// Это оптимистичная проверка наличия сессии, а не полноценная авторизация:
// валидность токена подтверждает backend при первом API-запросе.

const PUBLIC_PATHS = ['/login'];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // accessToken живёт недолго, поэтому наличие refreshToken достаточно,
  // чтобы пропустить запрос — клиент обновит пару через /auth/refresh.
  const accessToken = request.cookies.get('accessToken')?.value;
  const refreshToken = request.cookies.get('refreshToken')?.value;

  if (!accessToken && !refreshToken) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};