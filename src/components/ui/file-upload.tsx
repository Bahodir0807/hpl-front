'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileRelatedType, useUploadFile } from '@/hooks/use-upload';

interface FileUploadProps {
  relatedType: FileRelatedType;
  relatedId: string;
  onSuccess?: (fileId: string) => void;
}

export function FileUpload({
  relatedType,
  relatedId,
  onSuccess,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const upload = useUploadFile();

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('relatedType', relatedType);
    formData.append('relatedId', relatedId);

    try {
      const result = await upload.mutateAsync(formData);
      onSuccess?.(result.id);
    } catch {
      // Текст ошибки уже показан toast-уведомлением.
    } finally {
      setFileName(null);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="flex items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp,.pdf,.xlsx"
        className="hidden"
        onChange={(event) => {
          void handleFileChange(event);
        }}
      />
      <Button
        variant="outline"
        size="sm"
        onClick={() => inputRef.current?.click()}
        disabled={upload.isPending}
      >
        {upload.isPending ? 'Загрузка…' : 'Прикрепить файл'}
      </Button>
      {fileName ? (
        <span className="max-w-48 truncate text-sm text-slate-600">
          {fileName}
        </span>
      ) : null}
    </div>
  );
}
