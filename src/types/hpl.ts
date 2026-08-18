export type PanelTypeCode = 'exterior' | 'interior' | 'laboratory';

export type SupplierCode = 'wuya' | 'tianran' | 'polybet';

export type HplApplication = 'INTERIOR' | 'EXTERIOR';

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
  code: PanelTypeCode;
  name: string;
};

export type PanelSize = {
  id: string;
  length: number;
  width: number;
  areaM2?: number | string | null;
  label?: string | null;
};

export type PanelColor = {
  id: string;
  supplierId: string;
  name: string;
  code?: string | null;
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

export type CalculationItem = {
  id?: string;
  panelTypeId: string;
  supplierId: string;
  qualityClassId?: string | null;
  thicknessMm: number;
  panelSizeId: string;
  colorId?: string | null;
  requiredAreaM2?: number | string;
  sheetsCount: number;
  areaM2?: number | string | null;
  supplierPricePerM2?: number | string;
  clientPricePerM2: number | string;
  pricePerM2?: number | string;
  pricePerSheet: number | string;
  totalPrice: number | string;
  wastePercent?: number | string;
  panelType?: {
    id?: string;
    code?: string;
    name?: string;
    displayNameRu?: string | null;
  } | null;
  supplier?: { id?: string; code?: string; name?: string } | null;
  panelSize?: {
    id?: string;
    width?: number;
    length?: number;
    label?: string | null;
    displayName?: string | null;
    areaM2?: number | string | null;
  } | null;
};

export type CalculationSession = {
  id: string;
  leadId: string;
  status?: 'draft' | 'finalized';
  items: CalculationItem[];
  totalAmount?: number | string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  displayCurrency?: string | null;
};

export type CalculationPreview = {
  sheetsCount: number;
  areaM2: number | string;
  wastePercent?: number | string;
  supplierPricePerM2?: number | string;
  clientPricePerM2: number | string;
  pricePerSheet: number | string;
  total: number | string;
};

export type LeadQualification = {
  id: string;
  leadId: string;
  application?: HplApplication | null;
  panelTypeId?: string | null;
  thicknessMm?: number | null;
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
  decisionComment?: string | null;
  confirmedById: string;
  confirmedAt: string;
  supplier?: { id: string; code: string; name: string } | null;
  qualityClass?: { id: string; code: string; nameRu: string } | null;
};

export type QuoteItem = {
  id: string;
  quoteId?: string;
  name?: string | null;
  panelTypeCode?: string;
  panelTypeName?: string;
  panelSizeName?: string;
  thicknessMm?: number;
  qualityClassCode?: string;
  qualityClassName?: string;
  colorCode?: string | null;
  colorName?: string | null;
  requiredAreaM2?: number | string;
  sheetsCount?: number;
  areaM2: number | string;
  supplierPricePerM2?: number | string;
  pricePerM2?: number | string;
  clientPricePerM2?: number | string;
  pricePerSheet: number | string;
  totalPrice: number | string;
  wastePercent?: number | string;
};

export type Quote = {
  id: string;
  number?: string | null;
  leadId: string;
  dealId?: string | null;
  calculationId?: string | null;
  managerId?: string | null;
  status: QuoteStatus;
  items: QuoteItem[];
  subtotal?: number | string | null;
  deliveryCost?: number | string | null;
  deliveryAmount?: number | string | null;
  totalAmount: number | string;
  displayCurrency?: string | null;
  clientComment?: string | null;
  rejectionReason?: string | null;
  margin?: number | string | null;
  validUntil?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SupplierOrder = {
  id: string;
  dealId: string;
  supplierId: string;
  status: SupplierOrderStatus;
  trackingNumber?: string | null;
  estimatedDate?: string | null;
  deliveryDays?: number | null;
  deliveryAddress?: string | null;
  deliveryCost?: number | string | null;
  deliveryAmount?: number | string | null;
  comment?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Notification = {
  id: string;
  userId?: string;
  title: string;
  message?: string | null;
  type?: string | null;
  isRead: boolean;
  readAt?: string | null;
  taskId?: string | null;
  relatedType?: string | null;
  relatedId?: string | null;
  leadId?: string | null;
  createdAt: string;
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

export type LeadWorkspace = {
  leadId?: string;
  lead: {
    id: string;
    title: string;
    source: string;
    status: string;
    ownerId?: string | null;
    contact?: LeadWorkspaceContact | null;
    client?: { id?: string; name?: string | null } | null;
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
};
