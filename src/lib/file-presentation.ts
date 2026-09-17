import { getActiveMessages } from '@/i18n/active-messages';
import type { Messages } from '@/i18n/types';
import { interpolate } from '@/i18n/translate';

type FilePresentationInput = {
  mimeType: string;
};

export function fileTypeLabel(
  file: FilePresentationInput,
  messages: Messages = getActiveMessages(),
): string {
  if (file.mimeType === 'application/pdf') {
    return 'PDF';
  }

  if (file.mimeType.startsWith('image/')) {
    return messages.files.image;
  }

  if (file.mimeType.includes('spreadsheet')) {
    return messages.files.spreadsheet;
  }

  return messages.files.file;
}

export function formatFileSize(
  size: number,
  messages: Messages = getActiveMessages(),
): string {
  if (size < 1024) {
    return interpolate(messages.files.bytes, { size });
  }

  if (size < 1024 * 1024) {
    return interpolate(messages.files.kilobytes, {
      size: Math.round(size / 1024),
    });
  }

  return interpolate(messages.files.megabytes, {
    size: (size / (1024 * 1024)).toFixed(1),
  });
}
