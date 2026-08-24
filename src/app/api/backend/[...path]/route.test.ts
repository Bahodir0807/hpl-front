import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';

vi.mock('@/lib/auth-cookies', () => ({
  getAccessToken: vi.fn().mockResolvedValue('token'),
  getBackendApiUrl: vi.fn().mockReturnValue('http://backend.local'),
}));

describe('backend route proxy', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('preserves Content-Disposition for document downloads', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(Buffer.from('%PDF-test'), {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'attachment; filename="quote-test.pdf"',
        },
      }),
    );
    const request = new NextRequest(
      'http://localhost/api/backend/quotes/quote-id/pdf',
    );

    const response = await GET(request, {
      params: Promise.resolve({ path: ['quotes', 'quote-id', 'pdf'] }),
    });

    expect(response.headers.get('content-type')).toBe('application/pdf');
    expect(response.headers.get('content-disposition')).toBe(
      'attachment; filename="quote-test.pdf"',
    );
  });
});
