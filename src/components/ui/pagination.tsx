'use client';

import { Button } from '@/components/ui/button';

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  total?: number;
}

export function Pagination({
  page,
  totalPages,
  onPageChange,
  total,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-2 py-4">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
      >
        Назад
      </Button>
      <span className="text-sm text-slate-600">
        Страница {page} из {totalPages}
        {typeof total === 'number' ? ` · всего записей: ${total}` : ''}
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
      >
        Вперёд
      </Button>
    </div>
  );
}
