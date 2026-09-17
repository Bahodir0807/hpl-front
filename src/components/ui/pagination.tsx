'use client';

import { Button } from '@/components/ui/button';
import { useI18n } from '@/i18n/provider';

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
  const { t } = useI18n();

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-2 py-4">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
      >
        {t('common.back')}
      </Button>
      <span className="text-sm text-slate-600">
        {t('common.pageOf', { page, totalPages })}
        {typeof total === 'number'
          ? ` · ${t('common.totalRecords', { total })}`
          : ''}
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
      >
        {t('common.forward')}
      </Button>
    </div>
  );
}
