import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../lib/api-client';
import {
  resolveQualityClassesPanelTypeParam,
  resolveQualityClassesSupplierParam,
  unwrapSupplierQualityClasses,
  useSupplierQualityClasses,
} from './use-panels';

vi.mock('../lib/api-client', () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

const ALL_CLASSES = [
  { id: 'q-economy', code: 'economy', nameRu: 'Эконом' },
  { id: 'q-medium', code: 'medium', nameRu: 'Медиум' },
  { id: 'q-premium', code: 'premium', nameRu: 'Премиум' },
];

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  }

  return { Wrapper, queryClient };
}

describe('supplier quality-class API unwrapping', () => {
  it('reads nested mapping payloads with id/code/nameRu', () => {
    const classes = unwrapSupplierQualityClasses({
      items: ALL_CLASSES.map((qualityClass) => ({ qualityClass })),
    });

    expect(classes).toEqual(ALL_CLASSES);
  });

  it('reads a raw mapping array from GET /suppliers/:code/quality-classes', () => {
    const classes = unwrapSupplierQualityClasses(
      ALL_CLASSES.map((qualityClass) => ({
        id: `map-${qualityClass.id}`,
        qualityClass,
      })),
    );

    expect(classes.map((item) => item.code)).toEqual([
      'economy',
      'medium',
      'premium',
    ]);
  });

  it('reads a flat quality-class array', () => {
    expect(unwrapSupplierQualityClasses(ALL_CLASSES)).toEqual(ALL_CLASSES);
  });

  it('keeps an empty backend payload empty without a hardcoded fallback', () => {
    expect(unwrapSupplierQualityClasses([])).toEqual([]);
    expect(unwrapSupplierQualityClasses({ items: [] })).toEqual([]);
    expect(unwrapSupplierQualityClasses(undefined)).toEqual([]);
  });
});

describe('useSupplierQualityClasses', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requests quality classes with the supplier code and canonical panelType', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: ALL_CLASSES });
    const { result } = renderHook(
      () => useSupplierQualityClasses('WUYA', 'INTERIOR'),
      { wrapper: createWrapper().Wrapper },
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(apiClient.get).toHaveBeenCalledWith(
      '/suppliers/wuya/quality-classes',
      { params: { panelType: 'interior' } },
    );
    expect(result.current.data?.map((item) => item.code)).toEqual([
      'economy',
      'medium',
      'premium',
    ]);
  });

  it('refetches when the supplier or panel type changes', async () => {
    vi.mocked(apiClient.get)
      .mockResolvedValueOnce({ data: ALL_CLASSES })
      .mockResolvedValueOnce({ data: [ALL_CLASSES[2]] })
      .mockResolvedValueOnce({ data: [ALL_CLASSES[0]] });

    const { result, rerender } = renderHook(
      ({ code, panelType }: { code: string; panelType: string }) =>
        useSupplierQualityClasses(code, panelType),
      {
        wrapper: createWrapper().Wrapper,
        initialProps: { code: 'wuya', panelType: 'interior' },
      },
    );

    await waitFor(() => {
      expect(result.current.data).toHaveLength(3);
    });

    rerender({ code: 'tianran', panelType: 'interior' });
    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith(
        '/suppliers/tianran/quality-classes',
        { params: { panelType: 'interior' } },
      );
      expect(result.current.data?.map((item) => item.code)).toEqual(['premium']);
    });

    rerender({ code: 'tianran', panelType: 'furniture' });
    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith(
        '/suppliers/tianran/quality-classes',
        { params: { panelType: 'furniture' } },
      );
      expect(result.current.data?.map((item) => item.code)).toEqual(['economy']);
    });
  });

  it('does not invent economy/medium/premium when the API is empty', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: [] });
    const { result } = renderHook(
      () => useSupplierQualityClasses('wuya', 'interior'),
      { wrapper: createWrapper().Wrapper },
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual([]);
    expect(result.current.data).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'economy' })]),
    );
  });

  it('canonicalizes supplier code and panelType query params', () => {
    expect(resolveQualityClassesSupplierParam(' Tianran ')).toBe('tianran');
    expect(resolveQualityClassesPanelTypeParam('EXTERIOR')).toBe(
      'exterior_with_uv',
    );
    expect(resolveQualityClassesPanelTypeParam('laboratory')).toBe(
      'laboratory',
    );
  });
});
