"use client";

import { useState } from "react";
import { useAuth } from "../../context/auth-context";
import {
  ChangeDealStagePayload,
  DealStage,
  useChangeDealStage,
} from "../../hooks/use-deals";

type StageExceptionModalProps = {
  dealId: string | null;
  newStage: DealStage | null;
  serverMessage?: string;
  onClose: () => void;
};

export function StageExceptionModal({
  dealId,
  newStage,
  serverMessage,
  onClose,
}: StageExceptionModalProps) {
  const { hasPermission } = useAuth();
  const changeStage = useChangeDealStage();
  const [isException, setIsException] = useState(false);
  const [reason, setReason] = useState("");
  const canApprove = hasPermission("deals:stage_exception");
  const isOpen = Boolean(dealId && newStage);
  const canSubmit = canApprove && isException && reason.trim().length >= 5;

  if (!isOpen || !dealId || !newStage) {
    return null;
  }

  const submitException = async (): Promise<void> => {
    if (!canSubmit) {
      return;
    }

    const payload: ChangeDealStagePayload = {
      id: dealId,
      newStage,
      reason: reason.trim(),
      isException: true,
    };

    await changeStage.mutateAsync(payload);
    setIsException(false);
    setReason("");
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
            Переход на этап {newStage} отклонен бизнес-правилами сделки.
          </p>
          {serverMessage ? (
            <p className="mt-2 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {serverMessage}
            </p>
          ) : null}
        </div>

        {!canApprove ? (
          <div className="rounded border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-900">
            У пользователя нет права deals:stage_exception.
          </div>
        ) : (
          <div className="space-y-4">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-800">
              <input
                type="checkbox"
                checked={isException}
                onChange={(event) => setIsException(event.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              Оформить как исключение
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Причина исключения
              </span>
              <textarea
                rows={4}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                className="w-full resize-none rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
              />
              {isException &&
              reason.trim().length > 0 &&
              reason.trim().length < 5 ? (
                <span className="mt-1 block text-sm text-red-600">
                  Причина должна быть не короче 5 символов
                </span>
              ) : null}
            </label>

            {changeStage.isError ? (
              <p className="text-sm text-red-600">
                Не удалось оформить исключение.
              </p>
            ) : null}
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={() => {
              void submitException();
            }}
            disabled={!canSubmit || changeStage.isPending}
            className="rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:bg-slate-500"
          >
            Согласовать
          </button>
        </div>
      </div>
    </div>
  );
}
