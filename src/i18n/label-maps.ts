import { getActiveMessages } from './active-messages';
import type { Messages } from './types';
import type { RoleName } from '@/hooks/use-users';
import type { LeadStatus } from '@/hooks/use-leads';
import type { DealStage } from '@/hooks/use-deals';
import type { QuoteStatus } from '@/types/hpl';
import type { SupplierCode } from '@/types/hpl';

export function createLabelMaps(messages: Messages = getActiveMessages()) {
  return {
    roleLabels: messages.roles as Record<RoleName, string>,
    leadStatusLabels: messages.statuses.lead as Record<LeadStatus, string>,
    dealStageLabels: messages.statuses.dealStage as Record<DealStage, string>,
    quoteStatusLabels: messages.statuses.quote as Record<QuoteStatus, string>,
    calculationRequestStatusLabels: messages.statuses.calculationRequest,
    taskStatusLabels: messages.statuses.task,
    taskComputedStatusLabels: messages.statuses.taskComputed,
    taskPriorityLabels: messages.statuses.taskPriority,
    taskTypeLabels: messages.statuses.taskType,
    orderStatusLabels: messages.statuses.order,
    paymentStatusLabels: messages.statuses.payment,
    paymentRecordStatusLabels: messages.statuses.paymentRecord,
    deliveryStatusLabels: messages.statuses.delivery,
    clientStatusLabels: messages.statuses.client,
    clientTypeLabels: messages.statuses.clientType,
    clientSegmentLabels: messages.statuses.clientSegment,
    productStatusLabels: messages.statuses.product,
    expectedReceiptStatusLabels: messages.statuses.expectedReceipt,
    installationStatusLabels: messages.statuses.installation,
    supplierOrderStatusLabels: messages.statuses.supplierOrder,
    supplierDisplayNames: {
      wuya: messages.suppliers.wuya,
      tianran: messages.suppliers.tianran,
      polybet: messages.suppliers.polybet,
    } as Record<SupplierCode, string>,
    hplApplicationLabels: messages.hpl.applications,
    qualityLineLabels: {
      economy: messages.hpl.qualityLines.economy,
      econom: messages.hpl.qualityLines.economy,
      medium: messages.hpl.qualityLines.medium,
      premium: messages.hpl.qualityLines.premium,
    },
    lossReasonLabels: messages.lossReasons,
    relatedTypeLabels: {
      lead: messages.relatedTypes.lead,
      Lead: messages.relatedTypes.lead,
      deal: messages.relatedTypes.deal,
      Deal: messages.relatedTypes.deal,
      client: messages.relatedTypes.client,
      Client: messages.relatedTypes.client,
      order: messages.relatedTypes.order,
      Order: messages.relatedTypes.order,
      supplierOrder: messages.relatedTypes.supplierOrder,
      SupplierOrder: messages.relatedTypes.supplierOrder,
      DealInstallation: messages.relatedTypes.dealInstallation,
      dealInstallation: messages.relatedTypes.dealInstallation,
      LeadRecovery: messages.relatedTypes.leadRecovery,
      DealRecovery: messages.relatedTypes.dealRecovery,
      task: messages.relatedTypes.task,
    } as Record<string, string>,
  };
}

export type LabelMaps = ReturnType<typeof createLabelMaps>;
