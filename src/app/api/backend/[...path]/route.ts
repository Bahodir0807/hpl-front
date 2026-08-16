import { NextRequest, NextResponse } from 'next/server';
import { getAccessToken, getBackendApiUrl } from '@/lib/auth-cookies';

async function proxyRequest(
  request: NextRequest,
  pathSegments: string[],
): Promise<NextResponse> {
  const accessToken = await getAccessToken();
  const backendPath = pathSegments.join('/');
  const search = request.nextUrl.search;
  const targetUrl = `${getBackendApiUrl()}/${backendPath}${search}`;

  const headers = new Headers();

  const contentType = request.headers.get('content-type');
  if (contentType) {
    headers.set('Content-Type', contentType);
  }

  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  const init: RequestInit = {
    method: request.method,
    headers,
  };

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = await request.arrayBuffer();
  }

  let backendResponse: Response;
  try {
    backendResponse = await fetch(targetUrl, init);
  } catch {
    return NextResponse.json(
      { message: 'Backend unavailable' },
      { status: 503 },
    );
  }

  const responseBody = await backendResponse.arrayBuffer();

  return new NextResponse(responseBody, {
    status: backendResponse.status,
    headers: {
      'Content-Type':
        backendResponse.headers.get('content-type') ?? 'application/json',
    },
  });
}

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxyRequest(request, path);
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxyRequest(request, path);
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxyRequest(request, path);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxyRequest(request, path);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxyRequest(request, path);
}
