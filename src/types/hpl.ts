export type PanelTypeCode = 'exterior' | 'interior' | 'laboratory';

export type SupplierCode = 'wuya' | 'tianran' | 'polybet';

export type QuoteStatus = 'draft' | 'sent' | 'approved' | 'rejected';

export type SupplierOrderStatus =
  | 'DRAFT'
  | 'SENT_TO_PRODUCTION'
  | 'IN_PRODUCTION'
  | 'SHIPPED'
  | 'DELIVERED';

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
  thickness: number;
  thicknessMm?: number;
  panelSizeId: string;
  colorId?: string | null;
  sheetCount: number;
  areaM2: number | string;
  purchasePricePerM2: number | string;
  clientPricePerM2: number | string;
  pricePerSheet: number | string;
  totalPrice: number | string;
  panelType?: { id?: string; code?: string; name?: string } | null;
  supplier?: { id?: string; code?: string; name?: string } | null;
  panelSize?: {
    id?: string;
    width?: number;
    length?: number;
    label?: string | null;
  } | null;
};

export type CalculationSession = {
  id: string;
  leadId: string;
  items: CalculationItem[];
  sheetCount: number;
  areaM2: number | string;
  purchasePricePerM2?: number | string | null;
  clientPricePerM2?: number | string | null;
  pricePerSheet?: number | string | null;
  totalAmount: number | string;
  margin?: number | string | null;
  createdAt: string;
  updatedAt: string;
};

export type CalculationPreview = {
  sheetCount: number;
  areaM2: number | string;
  purchasePricePerM2: number | string;
  clientPricePerM2: number | string;
  pricePerSheet: number | string;
  totalAmount: number | string;
  margin?: number | string | null;
  items?: CalculationItem[];
};

export type QuoteItem = {
  id: string;
  quoteId?: string;
  name?: string | null;
  sheetCount: number;
  areaM2: number | string;
  purchasePricePerM2: number | string;
  clientPricePerM2: number | string;
  pricePerSheet: number | string;
  totalPrice: number | string;
};

export type Quote = {
  id: string;
  number?: string | null;
  leadId: string;
  dealId?: string | null;
  calculationId?: string | null;
  status: QuoteStatus;
  items: QuoteItem[];
  subtotal?: number | string | null;
  deliveryAmount?: number | string | null;
  totalAmount: number | string;
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
  deliveryAmount?: number | string | null;
  comment?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Notification = {
  id: string;
  title: string;
  message?: string | null;
  type?: string | null;
  isRead: boolean;
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
  calls?: LeadCall[];
  notes?: LeadNote[];
  activities?: LeadActivity[];
  timeline?: LeadActivity[];
};
