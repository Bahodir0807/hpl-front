'use client';

import { useMemo } from 'react';
import { useI18n } from './provider';
import { createLabelMaps } from './label-maps';

export function useLabelMaps() {
  const { messages } = useI18n();
  return useMemo(() => createLabelMaps(messages), [messages]);
}
