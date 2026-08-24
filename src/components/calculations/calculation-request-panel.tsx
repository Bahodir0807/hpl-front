'use client';

import { useMemo, useState } from 'react';
import { CalculationRequestForm } from '@/components/calculations/calculation-request-form';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/auth-context';
import {
  useCalculationRequests,
  useConvertCalculationRequestToQuote,
  useCreateCalculationRequest,
  useSubmitCalculationRequest,
  useUpdateCalculationRequest,
} from '@/hooks/use-calculation-requests';
import { useLeadWorkspace } from '@/hooks/use-lead-workspace';
import {
  unwrapSupplierQualityClasses,
  usePanelColors,
  usePanelSizes,
  usePanelTypes,
  useSuppliers,
} from '@/hooks/use-panels';
import {
  ADD_CALCULATION_LABEL,
  CONVERT_REQUEST_TO_QUOTE_LABEL,
  CREATE_CALCULATION_REQUEST_LABEL,
  SUBMIT_TO_HEAD_LABEL,
  canConvertCalculationRequestToQuote,
  canConvertRequestToQuote,
  canCreateCalculationRequest,
  calculationRequestStatusLabel,
  createEmptyRequestForm,
  isDraftCalculationRequest,
  requestFormFromApi,
  serializeCalculationRequest,
  unwrapRequestCalculations,
  validateRequestForm,
  type CalculationRequestFormValues,
  type CalculationRequestItemErrors,
} from '@/lib/calculation-request';
import { showError } from '@/lib/toast';
import { getErrorMessage } from '@/lib/errors';
import {
  getApiErrorCode,
  QUOTE_SUPPLIER_REQUIRED,
  QUOTE_SUPPLIER_REQUIRED_MESSAGE,
} from '@/lib/hpl-errors';
import { formatDateTime } from '@/lib/format';
import { formatPersonName } from '@/lib/display-names';
import { formatSupplierName } from '@/lib/labels';
import type { CalculationRequest, Supplier } from '@/types/hpl';

type CalculationRequestPanelProps = {
  leadId?: string | null;
  dealId?: string | null;
  clientId?: string | null;
};

function HeadConvertControls({
  requestId,
  suppliers,
  supplierId,
  error,
  pending,
  onSupplierChange,
  onConvert,
}: {
  requestId: string;
  suppliers: Supplier[];
  supplierId: string;
  error?: string;
  pending: boolean;
  onSupplierChange: (supplierId: string) => void;
  onConvert: () => void;
}) {
  const errorId = error ? `convert-supplier-${requestId}-error` : undefined;

  return (
    <div className="flex flex-wrap items-end justify-end gap-2 text-left">
      <label className="min-w-48">
        <span className="mb-1 block text-xs font-medium text-slate-700">
          Поставщик
        </span>
        <select
          aria-label={`Поставщик для расчёта ${requestId}`}
          aria-invalid={Boolean(error)}
          aria-describedby={errorId}
          className={`w-full rounded border bg-white px-2 py-1.5 text-sm outline-none ${
            error
              ? 'border-red-500 focus:border-red-600'
              : 'border-slate-300 focus:border-slate-500'
          }`}
          disabled={pending}
          value={supplierId}
          onChange={(event) => onSupplierChange(event.target.value)}
        >
          <option value="">Выберите</option>
          {suppliers.map((supplier) => (
            <option key={supplier.id} value={supplier.id}>
              {formatSupplierName(supplier.code, supplier.name)}
            </option>
          ))}
        </select>
        {error ? (
          <span id={errorId} className="mt-1 block text-xs text-red-600">
            {error}
          </span>
        ) : null}
      </label>
      <Button
        type="button"
        size="sm"
        disabled={pending || !supplierId}
        onClick={onConvert}
      >
        {pending ? 'Создание КП...' : CONVERT_REQUEST_TO_QUOTE_LABEL}
      </Button>
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
  const canConvert = canConvertCalculationRequestToQuote(permissions);
  const requestsQuery = useCalculationRequests({
    ...(leadId ? { leadId } : {}),
    ...(clientId && !leadId ? { clientId } : {}),
  });
  const suppliersQuery = useSuppliers(canConvert);
  const typesQuery = usePanelTypes();
  const sizesQuery = usePanelSizes();
  const colorsQuery = usePanelColors();
  const workspaceQuery = useLeadWorkspace(leadId ?? '');
  const createRequest = useCreateCalculationRequest();
  const updateRequest = useUpdateCalculationRequest();
  const submitRequest = useSubmitCalculationRequest();
  const convertRequest = useConvertCalculationRequestToQuote();

  const [editingId, setEditingId] = useState<string | 'new' | null>(null);
  const [form, setForm] = useState<CalculationRequestFormValues>(
    createEmptyRequestForm(),
  );
  const [itemErrors, setItemErrors] = useState<
    Record<string, CalculationRequestItemErrors>
  >({});
  const [convertSupplierIds, setConvertSupplierIds] = useState<
    Record<string, string>
  >({});
  const [convertErrors, setConvertErrors] = useState<Record<string, string>>({});

  const requests = useMemo(() => requestsQuery.data ?? [], [requestsQuery.data]);
  const editingRequest =
    editingId && editingId !== 'new'
      ? requests.find((item) => item.id === editingId)
      : null;
  const readOnly = Boolean(
    editingRequest && !isDraftCalculationRequest(editingRequest.status),
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
    }),
    [colorsQuery.data, qualityClasses, sizesQuery.data, typesQuery.data],
  );
  const catalogError =
    typesQuery.isError ||
    sizesQuery.isError ||
    colorsQuery.isError ||
    (Boolean(leadId) && workspaceQuery.isError)
      ? 'Не удалось загрузить справочник линеек, типов, размеров или декоров.'
      : null;

  const openNew = (): void => {
    setEditingId('new');
    setForm(createEmptyRequestForm());
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
    const isNew = !editingId || editingId === 'new';
    if (isNew && !leadId) {
      showError('Запрос расчёта создаётся из карточки лида: нужен leadId.');
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

  const validate = (current: CalculationRequestFormValues): boolean => {
    const result = validateRequestForm(current, catalogs.panelTypes);
    setItemErrors(result.itemErrors);
    return result.valid;
  };

  const onSaveDraft = async (): Promise<void> => {
    if (!validate(form)) {
      return;
    }
    await persist(form);
  };

  const onSubmitToHead = async (): Promise<void> => {
    if (createRequest.isPending || updateRequest.isPending || submitRequest.isPending) {
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

  const setConvertSupplier = (id: string, supplierId: string): void => {
    setConvertSupplierIds((current) => ({ ...current, [id]: supplierId }));
    setConvertErrors((current) => ({ ...current, [id]: '' }));
  };

  const onConvert = async (id: string): Promise<void> => {
    const supplierId = convertSupplierIds[id]?.trim() ?? '';
    if (!supplierId) {
      setConvertErrors((current) => ({
        ...current,
        [id]: QUOTE_SUPPLIER_REQUIRED_MESSAGE,
      }));
      return;
    }

    setConvertErrors((current) => ({ ...current, [id]: '' }));
    try {
      await convertRequest.mutateAsync({ id, supplierId });
    } catch (error) {
      setConvertErrors((current) => ({
        ...current,
        [id]:
          getApiErrorCode(error) === QUOTE_SUPPLIER_REQUIRED
            ? QUOTE_SUPPLIER_REQUIRED_MESSAGE
            : getErrorMessage(error, 'Не удалось выполнить коммерческий расчёт.'),
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
          {canCreate && !leadId ? (
            <p className="mt-1 text-sm text-slate-600">
              Новый запрос создаётся из карточки лида — здесь можно открыть уже
              существующие.
            </p>
          ) : null}
        </div>
        {canCreate && leadId ? (
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
                      : '—'}
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
                          suppliers={suppliersQuery.data ?? []}
                          supplierId={convertSupplierIds[request.id] ?? ''}
                          error={
                            convertErrors[request.id] ||
                            (suppliersQuery.isError
                              ? 'Не удалось загрузить поставщиков.'
                              : undefined)
                          }
                          pending={convertRequest.isPending}
                          onSupplierChange={(supplierId) =>
                            setConvertSupplier(request.id, supplierId)
                          }
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
                Клиент: {editingRequest.client?.name ?? clientId ?? '—'}
              </div>
              <div>Лид: {editingRequest.lead?.title ?? leadId ?? '—'}</div>
              <div>
                Автор:{' '}
                {editingRequest.createdBy
                  ? formatPersonName(
                      editingRequest.createdBy,
                    )
                  : '—'}
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
            canSubmitToHead={canCreate && !readOnly}
            pending={createRequest.isPending || updateRequest.isPending}
            submitPending={submitRequest.isPending}
            onSaveDraft={
              canCreate && !readOnly ? () => void onSaveDraft() : undefined
            }
            onSubmitToHead={
              canCreate && !readOnly ? () => void onSubmitToHead() : undefined
            }
          />
          {readOnly && canConvert ? (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">
                Примечание запроса доступно только для просмотра. Коммерческие
                условия задаются в КП после создания черновика.
              </p>
              {editingId !== 'new' &&
              editingRequest &&
              canConvertRequestToQuote(editingRequest) ? (
                <HeadConvertControls
                  requestId={editingId}
                  suppliers={suppliersQuery.data ?? []}
                  supplierId={convertSupplierIds[editingId] ?? ''}
                  error={
                    convertErrors[editingId] ||
                    (suppliersQuery.isError
                      ? 'Не удалось загрузить поставщиков.'
                      : undefined)
                  }
                  pending={convertRequest.isPending}
                  onSupplierChange={(supplierId) =>
                    setConvertSupplier(editingId, supplierId)
                  }
                  onConvert={() => void onConvert(editingId)}
                />
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      <span className="sr-only">{ADD_CALCULATION_LABEL}</span>
      <span className="sr-only">{SUBMIT_TO_HEAD_LABEL}</span>
    </div>
  );
}
