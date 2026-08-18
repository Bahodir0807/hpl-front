'use client';

import { Download, FileText, RefreshCcw } from 'lucide-react';
import type { ReactNode } from 'react';
import { useAuth } from '@/context/auth-context';
import { useDownloadFile, useEntityFiles } from '@/hooks/use-upload';
import { fileTypeLabel, formatFileSize } from '@/lib/file-presentation';
import { Button } from '../ui/button';
import { FileUpload } from '../ui/file-upload';

type ClientDocumentsProps = {
  clientId: string;
};

export function ClientDocuments({ clientId }: ClientDocumentsProps) {
  const { user } = useAuth();
  const canRead = user?.permissions.includes('files:read') ?? false;
  const canUpload = user?.permissions.includes('files:upload') ?? false;
  const filesQuery = useEntityFiles('CLIENT', clientId, canRead);
  const download = useDownloadFile();
  const files = filesQuery.data ?? [];

  if (!canRead) {
    return (
      <SectionMessage>Недостаточно прав для просмотра документов.</SectionMessage>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-950">Документы клиента</h3>
          <p className="mt-1 text-xs text-slate-500">
            Файлы, прикреплённые непосредственно к карточке клиента.
          </p>
        </div>
        {canUpload ? (
          <FileUpload relatedType="CLIENT" relatedId={clientId} />
        ) : null}
      </div>

      {filesQuery.isLoading ? (
        <SectionMessage>Загрузка документов...</SectionMessage>
      ) : null}

      {filesQuery.isError ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <span>Не удалось загрузить документы клиента.</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void filesQuery.refetch()}
          >
            <RefreshCcw className="h-3.5 w-3.5" aria-hidden="true" />
            Повторить
          </Button>
        </div>
      ) : null}

      {!filesQuery.isLoading && !filesQuery.isError && files.length === 0 ? (
        <SectionMessage>Документов пока нет.</SectionMessage>
      ) : null}

      {!filesQuery.isLoading && !filesQuery.isError && files.length > 0 ? (
        <div className="overflow-x-auto border border-slate-200">
          <table className="min-w-[680px] w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <ColumnHeader>Документ</ColumnHeader>
                <ColumnHeader>Тип</ColumnHeader>
                <ColumnHeader>Размер</ColumnHeader>
                <ColumnHeader>Контекст</ColumnHeader>
                <ColumnHeader className="text-right">Действие</ColumnHeader>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {files.map((file) => {
                const isDownloading =
                  download.isPending && download.variables?.id === file.id;

                return (
                  <tr key={file.id} className="hover:bg-slate-50/60">
                    <td className="px-3 py-3">
                      <span className="flex min-w-0 items-center gap-2 font-medium text-slate-950">
                        <FileText
                          className="h-4 w-4 shrink-0 text-slate-500"
                          aria-hidden="true"
                        />
                        <span className="truncate">{file.originalName}</span>
                      </span>
                    </td>
                    <td className="px-3 py-3 text-slate-700">
                      {fileTypeLabel(file)}
                    </td>
                    <td className="px-3 py-3 text-slate-700">
                      {formatFileSize(file.size)}
                    </td>
                    <td className="px-3 py-3 text-slate-700">Клиент</td>
                    <td className="px-3 py-3 text-right">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={download.isPending}
                        onClick={() => download.mutate(file)}
                      >
                        <Download className="h-3.5 w-3.5" aria-hidden="true" />
                        {isDownloading ? 'Скачивание...' : 'Скачать'}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

function ColumnHeader({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <th className={`px-3 py-2 text-left font-semibold text-slate-700 ${className}`}>
      {children}
    </th>
  );
}

function SectionMessage({ children }: { children: ReactNode }) {
  return (
    <div className="border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
      {children}
    </div>
  );
}
