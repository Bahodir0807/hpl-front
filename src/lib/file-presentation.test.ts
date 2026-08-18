import { describe, expect, it } from 'vitest';
import { fileTypeLabel, formatFileSize } from './file-presentation';

describe('file presentation', () => {
  it.each([
    ['application/pdf', 'PDF'],
    ['image/png', 'Изображение'],
    [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Таблица',
    ],
    ['application/octet-stream', 'Файл'],
  ])('derives a safe label from %s without inventing a category', (mimeType, label) => {
    expect(fileTypeLabel({ mimeType })).toBe(label);
  });

  it('formats available size metadata without requiring richer document fields', () => {
    expect(formatFileSize(512)).toBe('512 Б');
    expect(formatFileSize(2048)).toBe('2 КБ');
  });
});
