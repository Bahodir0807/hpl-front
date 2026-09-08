"use client";

import { useMemo, useState } from "react";
import { CalculationRequestForm } from "@/components/calculations/calculation-request-form";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth-context";
import {
  useCalculationRequests,
  useConvertCalculationRequestToQuote,
  useCreateCalculationRequest,
  useSubmitCalculationRequest,
  useUpdateCalculationRequest,
} from "@/hooks/use-calculation-requests";
import { useLeadWorkspace } from "@/hooks/use-lead-workspace";
import {
  unwrapSupplierQualityClasses,
  usePanelColors,
  usePanelSizes,
  usePanelTypes,
  useSuppliers,
} from "@/hooks/use-panels";
import {
  ADD_CALCULATION_LABEL,
  CONVERT_REQUEST_TO_QUOTE_LABEL,
  CREATE_CALCULATION_REQUEST_LABEL,
  canConvertCalculationRequestToQuote,
  canConvertRequestToQuote,
  canCreateCalculationRequest,
  canShowCreateCalculationRequestAction,
  canShowSubmitCalculationRequestToHead,
  calculationRequestStatusLabel,
  createEmptyRequestForm,
  isDraftCalculationRequest,
  isSubmittedCalculationRequest,
  requestFormFromQualification,
  requestFormFromApi,
  serializeCalculationRequest,
  unwrapRequestCalculations,
  validateRequestForm,
  type CalculationRequestFormValues,
  type CalculationRequestItemErrors,
} from "@/lib/calculation-request";
import { showError } from "@/lib/toast";
import { getErrorMessage } from "@/lib/errors";
import {
  getApiErrorCode,
  QUOTE_SUPPLIER_REQUIRED,
  QUOTE_SUPPLIER_REQUIRED_MESSAGE,
} from "@/lib/hpl-errors";
import { formatDateTime } from "@/lib/format";
import { formatPersonName } from "@/lib/display-names";
import {
  MANAGER_CUSTOMER_NOTE_HEAD_LABEL,
  MANAGER_CUSTOMER_NOTE_LABEL,
} from "@/lib/manager-commercial-note";
import type { CalculationRequest } from "@/types/hpl";

type CalculationRequestPanelProps = {
  leadId?: string | null;
  dealId?: string | null;
  clientId?: string | null;
};

function HeadConvertControls({
  requestId,
  error,
  pending,
  onConvert,
}: {
  requestId: string;
  error?: string;
  pending: boolean;
  onConvert: () => void;
}) {
  const errorId = error ? `convert-quote-${requestId}-error` : undefined;

  return (
    <div className="flex flex-wrap items-end justify-end gap-2 text-left">
      <div>
        <Button
          type="button"
          size="sm"
          disabled={pending}
          aria-describedby={errorId}
          onClick={onConvert}
        >
          {pending ? "Создание КП..." : CONVERT_REQUEST_TO_QUOTE_LABEL}
        </Button>
        {error ? (
          <span id={errorId} className="mt-1 block text-xs text-red-600">
            {error}
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function CalculationRequestPanel({
  leadId,
  clientId,
}: CalculationRequestPanelProps) {
  const { user } = useAuth();
  const permissions = user?.permissions ?? [];
  const canCreate = canCreateCalculationRequest(permissions);
  const canShowCreate = canShowCreateCalculationRequestAction(permissions);
  const canSubmitToHead = canShowSubmitCalculationRequestToHead(permissions);
  const canConvert = canConvertCalculationRequestToQuote(permissions);
  const requestsQuery = useCalculationRequests({
    ...(leadId ? { leadId } : {}),
    ...(clientId && !leadId ? { clientId } : {}),
  });
  const suppliersQuery = useSuppliers(canCreate || canConvert);
  const typesQuery = usePanelTypes();
  const sizesQuery = usePanelSizes();
  const colorsQuery = usePanelColors();
  const workspaceQuery = useLeadWorkspace(leadId ?? "");
  const createRequest = useCreateCalculationRequest();
  const updateRequest = useUpdateCalculationRequest();
  const submitRequest = useSubmitCalculationRequest();
  const convertRequest = useConvertCalculationRequestToQuote();

  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [form, setForm] = useState<CalculationRequestFormValues>(
    createEmptyRequestForm(),
  );
  const [itemErrors, setItemErrors] = useState<
    Record<string, CalculationRequestItemErrors>
  >({});
  const [convertErrors, setConvertErrors] = useState<Record<string, string>>(
    {},
  );

  const requests = useMemo(
    () => requestsQuery.data ?? [],
    [requestsQuery.data],
  );
  const editingRequest =
    editingId && editingId !== "new"
      ? requests.find((item) => item.id === editingId)
      : null;
  const headReviewEditable = Boolean(
    editingRequest &&
    isSubmittedCalculationRequest(editingRequest.status) &&
    permissions.includes("quotes:approve"),
  );
  const readOnly = Boolean(
    editingRequest &&
    !isDraftCalculationRequest(editingRequest.status) &&
    !headReviewEditable,
  );
  const qualityClasses = useMemo(() => {
    const mappings = (workspaceQuery.data?.catalog.suppliers ?? []).flatMap(
      (supplier) => supplier.qualityMappings ?? [],
    );
    const requestClasses = requests.flatMap((request) =>
      unwrapRequestCalculations(request).flatMap((calculation) =>
        calculation.items.map((item) => item.qualityClass).filter(Boolean),
      ),
    );

    return unwrapSupplierQualityClasses([...mappings, ...requestClasses]);
  }, [requests, workspaceQuery.data?.catalog.suppliers]);
  const catalogs = useMemo(
    () => ({
      panelTypes: typesQuery.data ?? [],
      panelSizes: sizesQuery.data ?? [],
      qualityClasses,
      panelColors: colorsQuery.data ?? [],
      suppliers:
        suppliersQuery.data ?? workspaceQuery.data?.catalog.suppliers ?? [],
    }),
    [
      colorsQuery.data,
      qualityClasses,
      sizesQuery.data,
      suppliersQuery.data,
      typesQuery.data,
      workspaceQuery.data?.catalog.suppliers,
    ],
  );
  const catalogError =
    typesQuery.isError ||
    sizesQuery.isError ||
    colorsQuery.isError ||
    (canConvert && suppliersQuery.isError) ||
    (Boolean(leadId) && workspaceQuery.isError)
      ? "Не удалось загрузить справочник линеек, типов, размеров или декоров."
      : null;

  const openNew = (): void => {
    setEditingId("new");
    setForm(requestFormFromQualification(workspaceQuery.data?.qualification));
    setItemErrors({});
  };

  const openExisting = (request: CalculationRequest): void => {
    setEditingId(request.id);
    setForm(requestFormFromApi(request));
    setItemErrors({});
  };

  const persist = async (
    current: CalculationRequestFormValues,
  ): Promise<CalculationRequest | null> => {
    const isNew = !editingId || editingId === "new";
    if (isNew && !leadId) {
      showError("Запрос расчёта создаётся из карточки лида: нужен leadId.");
      return null;
    }
    const payload = serializeCalculationRequest(
      current,
      isNew && leadId ? { leadId } : {},
    );
    if (!isNew) {
      const updated = await updateRequest.mutateAsync({
        id: editingId,
        body: payload,
      });
      setForm(requestFormFromApi(updated));
      return updated;
    }
    const created = await createRequest.mutateAsync(payload);
    setEditingId(created.id);
    setForm(requestFormFromApi(created));
    return created;
  };

  const validate = (
    current: CalculationRequestFormValues,
    options?: { requireCompleteTechnicalFields?: boolean },
  ): boolean => {
    const result = validateRequestForm(current, catalogs.panelTypes, options);
    setItemErrors(result.itemErrors);
    return result.valid;
  };

  const onSaveDraft = async (): Promise<void> => {
    if (
      !validate(form, {
        requireCompleteTechnicalFields: false,
      })
    ) {
      return;
    }
    await persist(form);
  };

  const onSubmitToHead = async (): Promise<void> => {
    if (
      createRequest.isPending ||
      updateRequest.isPending ||
      submitRequest.isPending
    ) {
      return;
    }
    if (!validate(form)) {
      return;
    }
    const saved = await persist(form);
    if (!saved) {
      return;
    }
    const submitted = await submitRequest.mutateAsync(saved.id);
    setForm(requestFormFromApi(submitted));
    setEditingId(submitted.id);
  };

  const onConvert = async (id: string): Promise<void> => {
    setConvertErrors((current) => ({ ...current, [id]: "" }));
    try {
      await convertRequest.mutateAsync({ id });
    } catch (error) {
      setConvertErrors((current) => ({
        ...current,
        [id]:
          getApiErrorCode(error) === QUOTE_SUPPLIER_REQUIRED
            ? QUOTE_SUPPLIER_REQUIRED_MESSAGE
            : getErrorMessage(
                error,
                "Не удалось выполнить коммерческий расчёт.",
              ),
      }));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-950">
            Запросы расчёта
          </h3>
          {canShowCreate && !leadId ? (
            <p className="mt-1 text-sm text-slate-600">
              Новый запрос создаётся из карточки лида — здесь можно открыть уже
              существующие.
            </p>
          ) : null}
        </div>
        {canShowCreate && leadId ? (
          <Button type="button" size="sm" onClick={openNew}>
            {CREATE_CALCULATION_REQUEST_LABEL}
          </Button>
        ) : null}
      </div>

      {requestsQuery.isLoading ? (
        <p className="text-sm text-slate-600">Загрузка запросов...</p>
      ) : null}
      {requestsQuery.isError ? (
        <div className="flex items-center justify-between gap-3 border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <span>Не удалось загрузить запросы расчёта.</span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => void requestsQuery.refetch()}
          >
            Повторить
          </Button>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-left font-semibold text-slate-700">
                Дата
              </th>
              <th className="px-3 py-2 text-left font-semibold text-slate-700">
                Статус
              </th>
              <th className="px-3 py-2 text-left font-semibold text-slate-700">
                Автор
              </th>
              <th className="px-3 py-2 text-left font-semibold text-slate-700">
                Расчёты
              </th>
              <th className="px-3 py-2 text-right font-semibold text-slate-700">
                Действия
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {requests.map((request) => {
              const groups = unwrapRequestCalculations(request);
              return (
                <tr key={request.id}>
                  <td className="whitespace-nowrap px-3 py-2 text-slate-700">
                    {formatDateTime(request.createdAt)}
                  </td>
                  <td className="px-3 py-2 text-slate-700">
                    {calculationRequestStatusLabel(request.status)}
                  </td>
                  <td className="px-3 py-2 text-slate-700">
                    {request.createdBy
                      ? formatPersonName(request.createdBy)
                      : "—"}
                  </td>
                  <td className="px-3 py-2 text-slate-700">{groups.length}</td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => openExisting(request)}
                      >
                        Открыть
                      </Button>
                      {canConvert && canConvertRequestToQuote(request) ? (
                        <HeadConvertControls
                          requestId={request.id}
                          error={convertErrors[request.id]}
                          pending={convertRequest.isPending}
                          onConvert={() => void onConvert(request.id)}
                        />
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!requestsQuery.isLoading && requests.length === 0 ? (
          <p className="p-6 text-center text-sm text-slate-500">
            Запросов расчёта пока нет.
          </p>
        ) : null}
      </div>

      {editingId ? (
        <div className="space-y-3 rounded border border-slate-200 p-4">
          {editingRequest ? (
            <div className="grid gap-2 text-sm text-slate-700 md:grid-cols-3">
              <div>
                Клиент: {editingRequest.client?.name ?? clientId ?? "—"}
              </div>
              <div>Лид: {editingRequest.lead?.title ?? leadId ?? "—"}</div>
              <div>
                Автор:{" "}
                {editingRequest.createdBy
                  ? formatPersonName(editingRequest.createdBy)
                  : "—"}
              </div>
            </div>
          ) : null}
          <CalculationRequestForm
            value={form}
            onChange={setForm}
            itemErrors={itemErrors}
            catalogs={catalogs}
            catalogError={catalogError}
            readOnly={readOnly}
            canEditSupplier={!readOnly || headReviewEditable}
            notesReadOnly={
              editingRequest
                ? !isDraftCalculationRequest(editingRequest.status)
                : false
            }
            notesLabel={
              headReviewEditable || readOnly
                ? MANAGER_CUSTOMER_NOTE_HEAD_LABEL
                : MANAGER_CUSTOMER_NOTE_LABEL
            }
            saveLabel={headReviewEditable ? "Сохранить изменения" : undefined}
            canSubmitToHead={
              canSubmitToHead && !readOnly && !headReviewEditable
            }
            pending={createRequest.isPending || updateRequest.isPending}
            submitPending={submitRequest.isPending}
            onSaveDraft={
              canCreate && (!readOnly || headReviewEditable)
                ? () => void onSaveDraft()
                : undefined
            }
            onSubmitToHead={
              canSubmitToHead && !readOnly && !headReviewEditable
                ? () => void onSubmitToHead()
                : undefined
            }
          />
          {canConvert &&
          editingId !== "new" &&
          editingRequest &&
          canConvertRequestToQuote(editingRequest) ? (
            <HeadConvertControls
              requestId={editingId}
              error={convertErrors[editingId]}
              pending={convertRequest.isPending}
              onConvert={() => void onConvert(editingId)}
            />
          ) : null}
        </div>
      ) : null}

      <span className="sr-only">{ADD_CALCULATION_LABEL}</span>
    </div>
  );
}
