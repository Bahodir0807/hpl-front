'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import { getErrorMessage } from '../lib/errors';
import { showError, showSuccess } from '../lib/toast';

export type FileRelatedType =
  | 'DEAL'
  | 'ORDER'
  | 'CLIENT'
  | 'PRODUCT'
  | 'TASK';

export type UploadedFile = {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
};

export function useEntityFiles(
  relatedType: FileRelatedType,
  relatedId: string,
  enabled = true,
) {
  return useQuery({
    queryKey: ['files', relatedType, relatedId],
    queryFn: async (): Promise<UploadedFile[]> => {
      const response = await apiClient.get<UploadedFile[]>('/files', {
        params: { relatedType, relatedId },
      });

      return response.data;
    },
    enabled: enabled && Boolean(relatedId),
  });
}

export function useUploadFile() {
  const queryClient = useQueryClient();

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
    onSuccess: (_file, formData) => {
      showSuccess('Файл успешно загружен');

      const relatedType = formData.get('relatedType');
      const relatedId = formData.get('relatedId');
      if (typeof relatedType === 'string' && typeof relatedId === 'string') {
        void queryClient.invalidateQueries({
          queryKey: ['files', relatedType, relatedId],
        });
      }
    },
    onError: (error) => showError(getErrorMessage(error)),
  });
}

export function useDownloadFile() {
  return useMutation({
    mutationFn: async (file: UploadedFile): Promise<void> => {
      const response = await apiClient.get<Blob>(
        `/files/${file.id}/download`,
        { responseType: 'blob' },
      );
      const objectUrl = URL.createObjectURL(response.data);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = file.originalName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
    },
    onError: (error) => showError(getErrorMessage(error)),
  });
}
