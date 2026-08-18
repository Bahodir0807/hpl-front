type FilePresentationInput = {
  mimeType: string;
};

export function fileTypeLabel(file: FilePresentationInput): string {
  if (file.mimeType === 'application/pdf') {
    return 'PDF';
  }

  if (file.mimeType.startsWith('image/')) {
    return 'Изображение';
  }

  if (file.mimeType.includes('spreadsheet')) {
    return 'Таблица';
  }

  return 'Файл';
}

export function formatFileSize(size: number): string {
  if (size < 1024) {
    return `${size} Б`;
  }

  if (size < 1024 * 1024) {
    return `${Math.round(size / 1024)} КБ`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} МБ`;
}
