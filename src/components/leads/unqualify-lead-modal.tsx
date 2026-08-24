'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Lead, useUnqualifyLead } from '../../hooks/use-leads';

const unqualifySchema = z.object({
  reason: z.string().trim().min(5, 'Причина должна быть не короче 5 символов'),
});

type UnqualifyFormValues = z.infer<typeof unqualifySchema>;

type UnqualifyLeadModalProps = {
  lead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
};

export function UnqualifyLeadModal({
  lead,
  isOpen,
  onClose,
}: UnqualifyLeadModalProps) {
  const unqualifyLead = useUnqualifyLead();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isValid },
  } = useForm<UnqualifyFormValues>({
    resolver: zodResolver(unqualifySchema),
    mode: 'onChange',
    defaultValues: {
      reason: '',
    },
  });

  useEffect(() => {
    if (!isOpen) {
      reset();
    }
  }, [isOpen, reset]);

  if (!isOpen || !lead) {
    return null;
  }

  const onSubmit = async (values: UnqualifyFormValues): Promise<void> => {
    await unqualifyLead.mutateAsync({
      id: lead.id,
      reason: values.reason,
    });

    reset();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4">
      <div className="w-full max-w-md rounded border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-slate-950">
            Дисквалифицировать лид
          </h2>
          <p className="mt-1 text-sm text-slate-600">{lead.title}</p>
        </div>

        <form
          onSubmit={(event) => {
            void handleSubmit(onSubmit)(event);
          }}
          className="space-y-4"
        >
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Причина
            </span>
            <textarea
              rows={4}
              className="w-full resize-none rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
              {...register('reason')}
            />
            {errors.reason ? (
              <span className="mt-1 block text-sm text-red-600">
                {errors.reason.message}
              </span>
            ) : null}
          </label>

          {unqualifyLead.isError ? (
            <p className="text-sm text-red-600">
              Не удалось дисквалифицировать лид.
            </p>
          ) : null}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={!isValid || unqualifyLead.isPending}
              className="rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:bg-slate-500"
            >
              Сохранить
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
