// Only STORED can be chosen for now; the others still exist on older records
export type ProductionStatusType = "STORED" | "SOLD" | "CURING" | "DISPATCHED";

export const SELECTABLE_STATUSES = ["STORED"] as const;
export type SelectableProductionStatus = (typeof SELECTABLE_STATUSES)[number];

export const STATUS_CONFIG: Record<
  ProductionStatusType,
  { label: string; bg: string; color: string; border: string; desc: string }
> = {
  STORED: {
    label: "Stored",
    bg: "#ECFDF5",
    color: "#059669",
    border: "rgba(16, 185, 129, 0.2)",
    desc: "Added to warehouse inventory",
  },
  SOLD: {
    label: "Sold",
    bg: "#EFF6FF",
    color: "#2563EB",
    border: "rgba(37, 99, 235, 0.2)",
    desc: "Direct sale to customer",
  },
  CURING: {
    label: "Curing",
    bg: "#FFFBEB",
    color: "#D97706",
    border: "rgba(217, 119, 6, 0.2)",
    desc: "Undergoing curing process",
  },
  DISPATCHED: {
    label: "Dispatched",
    bg: "#F5F3FF",
    color: "#7C3AED",
    border: "rgba(124, 58, 237, 0.2)",
    desc: "Dispatched for delivery",
  },
};

export interface InventoryItem {
  itemId: string;
  itemName: string;
  unitOfMeasure: string;
  currentStock?: number;
}

// One loaded stock of a material that still has quantity left
export interface StockBatch {
  batchId: string;
  batchCode: string;
  itemId: string;
  itemName: string;
  unitOfMeasure: string;
  receivedDate: string;
  qtyReceived: number;
  remainingQty: number;
  unitCost: number | null;
}

export interface MaterialUsageDto {
  itemId: string;
  itemName: string;
  amount: number;
  unitOfMeasure?: string;
  batchId?: string | null;
  batchCode?: string | null;
  unitCost?: number | null;
}

export interface ProductUsageDto {
  productName: string;
  amount: number;
}

export interface ProductionItemResponseDto {
  id: string;
  reportDate: string;
  workerName?: string;
  productType: string;
  qtyProduced: number;
  status?: ProductionStatusType;
  materials: MaterialUsageDto[];
  productUsages?: ProductUsageDto[];
  damages: number;
  editedBy?: string | null;
  editedAt?: string | null;
  editCount?: number | null;
  editNote?: string | null;
}

// Stock of a manufactured product: produced - damaged - used in other products - sold
export interface ProductStock {
  productName: string;
  produced: number;
  damages: number;
  used: number;
  sold: number;
  currentStock: number;
  // Average material cost per usable piece; null when no production of it had costed materials
  unitMaterialCost: number | null;
}

export interface ProductSale {
  id: string;
  saleDate: string;
  productName: string;
  quantity: number;
  // Selling price per piece
  // Missing for clerks, who do not see prices
  unitPrice: number | null;
  unitMaterialCost: number | null;
  editedBy?: string | null;
  editedAt?: string | null;
  editCount?: number | null;
  editNote?: string | null;
}

export const CURRENCY = "Rs.";

export const formatMoney = (value: number) =>
  `${CURRENCY} ${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export const formatQty = (value: number) =>
  Number(value).toLocaleString("en-US", { maximumFractionDigits: 2 });
