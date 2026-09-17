"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo } from "react";
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
import { enumLabel } from "../../lib/labels";
import { useI18n } from "@/i18n/provider";
import { useLabelMaps } from "@/i18n/use-label-maps";

type StageExceptionModalProps = {
  dealId: string | null;
  newStage: DealStage | null;
  serverMessage?: string;
  onClose: () => void;
};

type StageExceptionFormValues = {
  reason: string;
};

export function StageExceptionModal({
  dealId,
  newStage,
  serverMessage,
  onClose,
}: StageExceptionModalProps) {
  const { t } = useI18n();
  const { dealStageLabels } = useLabelMaps();
  const { user } = useAuth();
  const dealQuery = useDeal(dealId);
  const changeStage = useChangeDealStage();
  const canApprove =
    hasApproverRole(user?.roles ?? []) ||
    dealQuery.data?._permissions?.canBypassStageValidation === true;
  const localizedMessage = localizeStageRequirementMessage(serverMessage);
  const isOpen = Boolean(dealId && newStage);
  const stageExceptionSchema = useMemo(
    () =>
      z.object({
        reason: z.string().trim().min(5, t("validation.skipStageReason")),
      }),
    [t],
  );
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
            {t("deals.stageException.title")}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            {t("deals.stageException.rejected", {
              stage: enumLabel(dealStageLabels, newStage),
            })}
          </p>
          {canApprove && localizedMessage ? (
            <p className="mt-2 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              {localizedMessage}
            </p>
          ) : null}
        </div>

        {dealQuery.isLoading ? (
          <div className="text-sm text-slate-600">
            {t("deals.stageException.loading")}
          </div>
        ) : null}

        {!dealQuery.isLoading && !canApprove ? (
          <div className="rounded border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-900">
            {t("deals.stageException.needApprover")}
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
                {t("deals.stageException.reason")}
              </span>
              <textarea
                rows={4}
                {...register("reason")}
                placeholder={t("deals.stageException.reasonPlaceholder")}
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
                {t("deals.stageException.failed")}
              </p>
            ) : null}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                {t("common.cancel")}
              </button>
              <button
                type="submit"
                disabled={!isValid || changeStage.isPending || isSubmitting}
                className="rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:bg-slate-500"
              >
                {t("deals.stageException.approveAndMove")}
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
              {t("common.close")}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
