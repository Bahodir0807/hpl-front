import type {
  HplApplication,
  PanelTypeCode,
  StoredHplApplication,
} from '@/lib/hpl-domain';

export type { HplApplication, PanelTypeCode, StoredHplApplication };

export type SupplierCode = 'wuya' | 'tianran' | 'polybet';

export type QuoteStatus =
  | 'draft'
  | 'sent'
  | 'approved'
  | 'rejected'
  | 'converted';

export type PatchableQuoteStatus = 'sent' | 'approved' | 'rejected';

export type SupplierOrderStatus =
  | 'DRAFT'
  | 'SENT_TO_PRODUCTION'
  | 'IN_PRODUCTION'
  | 'READY_FOR_SHIPMENT'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED';

export type HplListResponse<T> = T[] | { items: T[]; total?: number };

export function unwrapHplList<T>(data: HplListResponse<T> | undefined): T[] {
  if (!data) {
    return [];
  }

  return Array.isArray(data) ? data : (data.items ?? []);
}

export type PanelType = {
  id: string;
  code: PanelTypeCode | string;
  displayNameRu: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type PanelSize = {
  id: string;
  widthMm: number;
  heightMm: number;
  displayName: string;
  areaM2?: number | string | null;
  sortOrder?: number;
  isActive?: boolean;
};

export type PanelColor = {
  id: string;
  supplierId: string;
  name: string;
  code?: string | null;
  colorName?: string | null;
  colorCode?: string | null;
  hex?: string | null;
};

export type Supplier = {
  id: string;
  code: SupplierCode;
  name: string;
  deliveryDays?: number | null;
  marginPercent?: number | string | null;
};

export type QualityClass = {
  id: string;
  code?: string | null;
  name?: string | null;
  nameRu?: string | null;
  displayName?: string | null;
  title?: string | null;
  label?: string | null;
  slug?: string | null;
  supplierCode?: string | null;
  panelType?: PanelTypeCode | null;
};

export type CommercialCurrencyCode = 'USD' | 'UZS';

export type CalculationRequestStatus =
  | 'draft'
  | 'submitted'
  | 'processing'
  | 'quoted';

export type CalculationItem = {
  id?: string;
  panelTypeId: string;
  supplierId?: string | null;
  qualityClassId?: string | null;
  thicknessMm: number | string;
  panelSizeId?: string | null;
  customWidthMm?: number | string | null;
  customHeightMm?: number | string | null;
  colorId?: string | null;
  colorName?: string | null;
  requiredAreaM2?: number | string;
  sheetsCount?: number | string | null;
  areaM2?: number | string | null;
  coating?: string | null;
  texture?: string | null;
  decor?: string | null;
  note?: string | null;
  customTypeDescription?: string | null;
  color?: {
    id?: string | null;
    colorCode?: string | null;
    colorName?: string | null;
    name?: string | null;
  } | null;
  supplierPricePerM2?: number | string;
  clientPricePerM2?: number | string;
  pricePerM2?: number | string;
  pricePerSheet?: number | string;
  totalPrice?: number | string;
  wastePercent?: number | string;
  panelType?: {
    id?: string;
    code?: string;
    displayNameRu?: string | null;
    name?: string | null;
  } | null;
  supplier?: { id?: string; code?: string; name?: string } | null;
  qualityClass?: {
    id?: string;
    code?: string | null;
    nameRu?: string | null;
    name?: string | null;
  } | null;
  panelSize?: {
    id?: string;
    widthMm?: number;
    heightMm?: number;
    displayName?: string | null;
    areaM2?: number | string | null;
    width?: number;
    length?: number;
    label?: string | null;
  } | null;
};

export type CalculationSession = {
  id: string;
  leadId?: string | null;
  requestId?: string | null;
  title?: string | null;
  sortOrder?: number | null;
  status?: 'draft' | 'finalized';
  items: CalculationItem[];
  totalAmount?: number | string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  displayCurrency?: string | null;
};

export type CalculationRequestPerson = {
  id?: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
};

export type CalculationRequest = {
  id: string;
  leadId?: string | null;
  dealId?: string | null;
  clientId?: string | null;
  createdById?: string | null;
  status: CalculationRequestStatus | string;
  notes?: string | null;
  submittedAt?: string | null;
  quotedAt?: string | null;
  quoteId?: string | null;
  calculations?: CalculationSession[];
  /** Legacy alias; GET /calculations/requests/:id returns `calculations`. */
  quotes?: Array<{
    id: string;
    status?: string;
    totalAmount?: number | string | null;
    displayCurrency?: string | null;
    finalizedAt?: string | null;
    createdAt?: string;
  }>;
  createdBy?: CalculationRequestPerson | null;
  lead?: { id: string; title?: string | null } | null;
  client?: { id: string; name?: string | null } | null;
  deal?: { id: string; title?: string | null } | null;
  createdAt: string;
  updatedAt: string;
};

export type CalculationPreview = {
  sheetsCount: number;
  areaM2: number | string;
  wastePercent?: number | string;
  supplierPricePerM2?: number | string;
  purchasePricePerM2Cny?: number | string;
  clientPricePerM2?: number | string;
  pricePerSheet?: number | string;
  total?: number | string;
  cnyUsdRate?: number | string;
  sellingCoefficient?: number | string;
};

export type LeadQualification = {
  id: string;
  leadId: string;
  application?: StoredHplApplication | null;
  panelTypeId?: string | null;
  thicknessMm?: number | string | null;
  panelSizeId?: string | null;
  customWidthMm?: number | null;
  customHeightMm?: number | null;
  colorCode?: string | null;
  colorName?: string | null;
  requiredAreaM2?: number | string | null;
  installationRequired?: boolean | null;
  stockOnly?: boolean | null;
  urgent?: boolean | null;
  willingToWait?: boolean | null;
  customerRequirements?: string | null;
  panelType?: { id: string; code: string; displayNameRu?: string | null } | null;
  panelSize?: {
    id: string;
    displayName?: string | null;
    widthMm?: number;
    heightMm?: number;
    areaM2?: number | string | null;
  } | null;
};

export type LeadCommercialQualification = {
  id: string;
  leadId: string;
  supplierId: string;
  qualityClassId: string;
  mappingId: string;
  status: 'CONFIRMED';
  targetDate?: string | null;
  decisionComment?: string | null;
  confirmedById: string;
  confirmedAt: string;
  supplier?: { id: string; code: string; name: string } | null;
  qualityClass?: { id: string; code: string; nameRu: string } | null;
};

export type QuoteItem = {
  id: string;
  quoteId?: string;
  calculationId?: string | null;
  calculationGroupTitle?: string | null;
  calculationTitle?: string | null;
  name?: string | null;
  application?: StoredHplApplication | string | null;
  panelTypeCode?: string;
  panelTypeName?: string;
  panelSizeName?: string;
  thicknessMm?: number | string;
  supplierCode?: string;
  supplierName?: string;
  qualityClassCode?: string;
  qualityClassName?: string;
  colorCode?: string | null;
  colorName?: string | null;
  coating?: string | null;
  texture?: string | null;
  decor?: string | null;
  note?: string | null;
  customTypeDescription?: string | null;
  customWidthMm?: number | string | null;
  customHeightMm?: number | string | null;
  requiredAreaM2?: number | string;
  sheetsCount?: number;
  areaM2: number | string;
  supplierPricePerM2?: number | string | null;
  pricePerM2?: number | string | null;
  clientPricePerM2?: number | string | null;
  currencyCode?: CommercialCurrencyCode | string | null;
  priceApprovedAt?: string | null;
  priceApprovedById?: string | null;
  pricePerSheet?: number | string | null;
  totalPrice?: number | string | null;
  wastePercent?: number | string;
};

export type Quote = {
  id: string;
  number?: string | null;
  leadId?: string | null;
  clientId?: string | null;
  dealId?: string | null;
  calculationId?: string | null;
  requestId?: string | null;
  calculationRequestId?: string | null;
  managerId: string;
  status: QuoteStatus;
  items: QuoteItem[];
  subtotal?: number | string | null;
  deliveryCost?: number | string | null;
  deliveryAmount?: number | string | null;
  totalAmount?: number | string | null;
  displayCurrency?: string | null;
  cnyUsdRate?: number | string | null;
  sellingCoefficient?: number | string | null;
  clientComment?: string | null;
  commercialNote?: string | null;
  internalCommercialNote?: string | null;
  productionTerms?: string | null;
  deliveryTerms?: string | null;
  productionDaysFrom?: number | null;
  productionDaysTo?: number | null;
  deliveryDaysFrom?: number | null;
  deliveryDaysTo?: number | null;
  rejectionReason?: string | null;
  clientAcceptedAt?: string | null;
  clientAcceptedById?: string | null;
  margin?: number | string | null;
  validUntil?: string | null;
  documentDate?: string | null;
  finalizedAt?: string | null;
  pdfFileId?: string | null;
  documentAvailability?: 'AVAILABLE' | 'LEGACY_MISSING' | 'NOT_FINALIZED';
  versionNumber?: number;
  previousVersionId?: string | null;
  previousVersion?: { id: string; versionNumber: number } | null;
  nextVersion?: { id: string; versionNumber: number } | null;
  approverId?: string | null;
  finalizedById?: string | null;
  createdAt: string;
  updatedAt: string;
  manager?: {
    id?: string;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
  } | null;
  approvedBy?: {
    id?: string;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
  } | null;
};

export type QuotePricingPreview = {
  cnyUsdRate: number | string;
  sellingCoefficient: number | string;
  currencyCode: 'USD';
  items: Array<{
    id: string;
    calculationId?: string | null;
    purchasePricePerM2Cny: number | string;
    pricePerM2: number | string;
    pricePerSheet: number | string;
    totalPrice: number | string;
  }>;
};

export type SupplierOrderSupplier = {
  id: string;
  code?: string | null;
  name?: string | null;
};

export type SupplierOrder = {
  id: string;
  dealId: string;
  supplierId: string;
  status: SupplierOrderStatus;
  orderedAt?: string | null;
  expectedReadyAt?: string | null;
  expectedShipmentAt?: string | null;
  expectedArrivalAt?: string | null;
  comment?: string | null;
  createdById?: string | null;
  readyConfirmedAt?: string | null;
  readyConfirmedById?: string | null;
  estimatedDate?: string | null;
  deliveryAddress?: string | null;
  deliveryCost?: number | string | null;
  deliveryAmount?: number | string | null;
  trackingNumber?: string | null;
  deliveredAt?: string | null;
  deliveredById?: string | null;
  supplier?: SupplierOrderSupplier | null;
  createdAt: string;
  updatedAt: string;
};

export type Notification = {
  id: string;
  userId: string;
  title: string;
  message?: string | null;
  type: string;
  isRead: boolean;
  readAt?: string | null;
  taskId?: string | null;
  relatedType?: string | null;
  relatedId?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type LeadCall = {
  id: string;
  leadId: string;
  dialUri: string;
  createdAt: string;
  actorName?: string | null;
  createdBy?: {
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
  } | null;
};

export type LeadNote = {
  id: string;
  leadId: string;
  text: string;
  createdAt: string;
  actorName?: string | null;
  createdBy?: {
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
  } | null;
};

export type LeadActivity = {
  id: string;
  type: string;
  createdAt: string;
  description?: string | null;
  actorName?: string | null;
  actor?: {
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
  } | null;
};

export type LeadWorkspaceContact = {
  firstName: string;
  lastName?: string | null;
  phone?: string | null;
  email?: string | null;
};

export type LeadWorkspaceClient = {
  id?: string;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  contacts?: Array<{
    firstName?: string | null;
    lastName?: string | null;
    phone?: string | null;
    email?: string | null;
    isPrimary?: boolean;
  }> | null;
};

export type LeadWorkspace = {
  leadId?: string;
  lead: {
    id: string;
    title: string;
    source: string;
    status: string;
    ownerId?: string | null;
    managerCommercialNote?: string | null;
    managerCommercialInputReadyAt?: string | null;
    contact?: LeadWorkspaceContact | null;
    client?: LeadWorkspaceClient | null;
  };
  calculations?: CalculationSession[];
  quotes?: Quote[];
  qualification?: LeadQualification | null;
  requirementPrefill?: Partial<LeadQualification> | null;
  commercialQualification?: LeadCommercialQualification | null;
  commercialPrefill?: {
    supplierId: string;
    qualityClassId: string;
    status: 'CONFIRMED';
  } | null;
  calls?: LeadCall[];
  notes?: LeadNote[];
  activities?: LeadActivity[];
  timeline?: LeadActivity[];
  catalog?: {
    panelTypes?: PanelType[];
    panelSizes?: PanelSize[];
    suppliers?: Array<
      Supplier & {
        qualityMappings?: Array<{
          qualityClass?: QualityClass | null;
        }>;
      }
    >;
    recentColors?: PanelColor[];
  };
};
