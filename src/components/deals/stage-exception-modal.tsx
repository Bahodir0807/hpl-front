"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useAuth } from "../../context/auth-context";
import {
  ChangeDealStagePayload,
  DealStage,
  useChangeDealStage,
  useDeal,
} from "../../hooks/use-deals";
import {
  hasApproverRole,
  localizeStageRequirementMessage,
} from "../../lib/display-names";
import { dealStageLabels, enumLabel } from "../../lib/labels";

type StageExceptionModalProps = {
  dealId: string | null;
  newStage: DealStage | null;
  serverMessage?: string;
  onClose: () => void;
};

const stageExceptionSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(5, "Укажите причину пропуска этапа"),
});

type StageExceptionFormValues = z.infer<typeof stageExceptionSchema>;

export function StageExceptionModal({
  dealId,
  newStage,
  serverMessage,
  onClose,
}: StageExceptionModalProps) {
  const { user } = useAuth();
  const dealQuery = useDeal(dealId);
  const changeStage = useChangeDealStage();
  const canApprove =
    hasApproverRole(user?.roles ?? []) ||
    dealQuery.data?._permissions?.canBypassStageValidation === true;
  const localizedMessage = localizeStageRequirementMessage(serverMessage);
  const isOpen = Boolean(dealId && newStage);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isValid },
  } = useForm<StageExceptionFormValues>({
    resolver: zodResolver(stageExceptionSchema),
    mode: "onChange",
    defaultValues: {
      reason: "",
    },
  });

  useEffect(() => {
    if (!isOpen) {
      reset({
        reason: "",
      });
    }
  }, [isOpen, reset]);

  if (!isOpen || !dealId || !newStage) {
    return null;
  }

  const onSubmit = async (
    values: StageExceptionFormValues,
  ): Promise<void> => {
    if (!canApprove) {
      return;
    }

    const payload: ChangeDealStagePayload = {
      id: dealId,
      newStage,
      reason: values.reason.trim(),
      isException: true,
    };

    await changeStage.mutateAsync(payload);
    reset({
      reason: "",
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4">
      <div className="w-full max-w-lg rounded border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-slate-950">
            Требуется согласование руководителя
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Переход на этап «{enumLabel(dealStageLabels, newStage)}» отклонён
            бизнес-правилами сделки.
          </p>
          {canApprove && localizedMessage ? (
            <p className="mt-2 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              {localizedMessage}
            </p>
          ) : null}
        </div>

        {dealQuery.isLoading ? (
          <div className="text-sm text-slate-600">Загрузка данных сделки...</div>
        ) : null}

        {!dealQuery.isLoading && !canApprove ? (
          <div className="rounded border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-900">
            Для пропуска требований этапа требуется согласование РОПа или
            Администратора. Обратитесь к руководителю отдела продаж.
          </div>
        ) : null}

        {canApprove && !dealQuery.isLoading ? (
          <form
            onSubmit={(event) => {
              void handleSubmit(onSubmit)(event);
            }}
            className="space-y-4"
          >
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Причина исключения
              </span>
              <textarea
                rows={4}
                {...register("reason")}
                placeholder="Опишите, почему этап можно перевести досрочно"
                className="w-full resize-none rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
              />
              {errors.reason ? (
                <span className="mt-1 block text-sm text-red-600">
                  {errors.reason.message}
                </span>
              ) : null}
            </label>

            {changeStage.isError ? (
              <p className="text-sm text-red-600">
                Не удалось согласовать переход этапа.
              </p>
            ) : null}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={!isValid || changeStage.isPending || isSubmitting}
                className="rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:bg-slate-500"
              >
                Согласовать и перевести
              </button>
            </div>
          </form>
        ) : null}

        {!canApprove && !dealQuery.isLoading ? (
          <div className="mt-5 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Закрыть
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
