"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo } from "react";
import { Resolver, useForm } from "react-hook-form";
import { z } from "zod";
import { useAddProjectObject } from "../../hooks/use-clients";
import { useI18n } from "@/i18n/provider";

type AddObjectFormInput = {
  name: string;
  address?: string;
  type?: string;
  stage?: string;
  approximateArea?: number | "";
  expectedDate?: string;
};

type AddObjectFormValues = {
  name: string;
  address?: string;
  type?: string;
  stage?: string;
  approximateArea?: number | "";
  expectedDate?: string;
};

type AddObjectModalProps = {
  clientId: string | null;
  isOpen: boolean;
  onClose: () => void;
};

export function AddObjectModal({
  clientId,
  isOpen,
  onClose,
}: AddObjectModalProps) {
  const addObject = useAddProjectObject();
  const { t } = useI18n();
  const addObjectSchema = useMemo(
    () =>
      z.object({
        name: z.string().trim().min(2, t("validation.objectNameRequired")),
        address: z.string().trim().optional(),
        type: z.string().trim().optional(),
        stage: z.string().trim().optional(),
        approximateArea: z.coerce
          .number()
          .positive(t("validation.areaPositive"))
          .optional()
          .or(z.literal("")),
        expectedDate: z.string().trim().optional(),
      }),
    [t],
  );
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isValid },
  } = useForm<AddObjectFormInput, unknown, AddObjectFormValues>({
    resolver: zodResolver(addObjectSchema) as Resolver<
      AddObjectFormInput,
      unknown,
      AddObjectFormValues
    >,
    mode: "onChange",
    defaultValues: {
      name: "",
      address: "",
      type: "",
      stage: "",
      approximateArea: "",
      expectedDate: "",
    },
  });

  useEffect(() => {
    if (!isOpen) {
      reset();
    }
  }, [isOpen, reset]);

  if (!isOpen || !clientId) {
    return null;
  }

  const onSubmit = async (values: AddObjectFormValues): Promise<void> => {
    await addObject.mutateAsync({
      clientId,
      name: values.name,
      address: values.address || undefined,
      type: values.type || undefined,
      stage: values.stage || undefined,
      approximateArea:
        typeof values.approximateArea === "number"
          ? values.approximateArea
          : undefined,
      expectedDate: values.expectedDate
        ? new Date(values.expectedDate).toISOString()
        : undefined,
    });

    reset();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/30 p-4">
      <div className="w-full max-w-xl rounded border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-slate-950">
            {t("clients.objectModal.title")}
          </h2>
        </div>

        <form
          onSubmit={(event) => {
            void handleSubmit(onSubmit)(event);
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="md:col-span-2">
              <span className="mb-1 block text-sm font-medium text-slate-700">
                {t("common.titleField")}
              </span>
              <input
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
                {...register("name")}
              />
              {errors.name ? (
                <span className="mt-1 block text-sm text-red-600">
                  {errors.name.message}
                </span>
              ) : null}
            </label>

            <label className="md:col-span-2">
              <span className="mb-1 block text-sm font-medium text-slate-700">
                {t("common.address")}
              </span>
              <input
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
                {...register("address")}
              />
            </label>

            <label>
              <span className="mb-1 block text-sm font-medium text-slate-700">
                {t("clients.objectType")}
              </span>
              <input
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
                {...register("type")}
              />
            </label>

            <label>
              <span className="mb-1 block text-sm font-medium text-slate-700">
                {t("clients.objectStage")}
              </span>
              <input
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
                {...register("stage")}
              />
            </label>

            <label>
              <span className="mb-1 block text-sm font-medium text-slate-700">
                {t("clients.areaM2")}
              </span>
              <input
                type="number"
                step="0.01"
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
                {...register("approximateArea")}
              />
              {errors.approximateArea ? (
                <span className="mt-1 block text-sm text-red-600">
                  {errors.approximateArea.message}
                </span>
              ) : null}
            </label>

            <label>
              <span className="mb-1 block text-sm font-medium text-slate-700">
                {t("clients.objectDeadline")}
              </span>
              <input
                type="date"
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
                {...register("expectedDate")}
              />
            </label>
          </div>

          {addObject.isError ? (
            <p className="text-sm text-red-600">{t("clients.objectModal.createFailed")}</p>
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
              disabled={!isValid || addObject.isPending}
              className="rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:bg-slate-500"
            >
              {t("common.add")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
