'use client';

import { useMutation } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import { getErrorMessage } from '../lib/errors';
import { showError, showSuccess } from '../lib/toast';

export type FileRelatedType =
  | 'DEAL'
  | 'ORDER'
  | 'CLIENT'
  | 'PRODUCT'
  | 'TASK'
  | 'LEAD'
  | 'PAYMENT';

export type UploadedFile = {
  id: string;
  fileName?: string;
  originalName?: string;
  mimeType?: string;
  size?: number;
  url?: string;
};

export function useUploadFile() {
  return useMutation({
    mutationFn: async (formData: FormData): Promise<UploadedFile> => {
      const response = await apiClient.post<UploadedFile>(
        '/files/upload',
        formData,
        {
          // Content-Type снимаем: браузер сам выставит multipart/form-data
          // с корректным boundary. Ручное значение ломает парсинг на backend.
          headers: { 'Content-Type': undefined },
        },
      );

      return response.data;
    },
    onSuccess: () => showSuccess('Файл успешно загружен'),
    onError: (error) => showError(getErrorMessage(error)),
  });
}
