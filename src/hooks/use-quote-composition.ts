'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import type { QuoteComposition } from '../types/hpl';

export function useQuoteComposition(leadId?: string) {
  return useQuery({
    queryKey: ['quote-composition', leadId],
    queryFn: async (): Promise<QuoteComposition> => {
      const response = await apiClient.get<QuoteComposition>(
        '/quotes/composition',
        { params: { leadId } },
      );
      return response.data;
    },
    enabled: Boolean(leadId),
  });
}
