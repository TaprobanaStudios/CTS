"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Box,
  Typography,
  Paper,
  Chip,
  Button,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import AddIcon from "@mui/icons-material/Add";
import SearchBar from "../../components/search/SearchBar";
import CustomTable, {
  CustomTableColumn,
  CustomTableSort,
} from "@/components/table/CustomTable";
import BackLink from "@/components/nav/BackLink";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import ReportProblemOutlinedIcon from "@mui/icons-material/ReportProblemOutlined";
import {
  MaterialUsageDto,
  ProductUsageDto,
  formatMoney,
  formatQty,
} from "../production/types";
import EditRecordDialog, { EditRecordField } from "@/components/dialog/EditRecordDialog";
import EditedNote from "@/components/table/EditedNote";
import { currentMonthInSriLanka, formatDate } from "@/utils/datetime";
import { useAuth } from "@/auth/AuthContext";
import useDebouncedValue from "@/hooks/useDebouncedValue";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";

export type ProductionStatusType =
  | "STORED"
  | "SOLD"
  | "CURING"
  | "DISPATCHED"
  | "CONSUMED";

export const STATUS_CONFIG: Record<
  ProductionStatusType,
  { label: string; bg: string; color: string; border: string }
> = {
  STORED: {
    label: "Stored",
    bg: "#ECFDF5",
    color: "#059669",
    border: "rgba(16, 185, 129, 0.2)",
  },
  SOLD: {
    label: "Sold",
    bg: "#EFF6FF",
    color: "#2563EB",
    border: "rgba(37, 99, 235, 0.2)",
  },
  CURING: {
    label: "Curing",
    bg: "#FFFBEB",
    color: "#D97706",
    border: "rgba(217, 119, 6, 0.2)",
  },
  DISPATCHED: {
    label: "Dispatched",
    bg: "#F5F3FF",
    color: "#7C3AED",
    border: "rgba(124, 58, 237, 0.2)",
  },
  CONSUMED: {
    label: "Consumed",
    bg: "#FFF7ED",
    color: "#C2410C",
    border: "rgba(234, 88, 12, 0.2)",
  },
};

export interface ProductionLedgerRow {
  id: string;
  // Position in chronological order; dates alone cannot order two entries of the same day
  seq: number;
  date: string;
  productName: string;
  openingStock: number;
  qtyIn: number;
  qtyOut: number;
  damage: number;
  closingStock: number;
  status: ProductionStatusType;
  materials?: MaterialUsageDto[];
  productUsages?: ProductUsageDto[];
  // Cost of the materials that have a buying cost recorded; null when none do
  materialCost: number | null;
  // true when some materials had no cost and are missing from materialCost
  materialCostPartial: boolean;
  workerName?: string;
  remarks: string;
  type: "PRODUCTION" | "CONSUMPTION" | "SALE";
  // The production entry or sale behind the row, for editing it; absent on "used in" rows
  sourceId?: string;
  // Sales only: selling price per piece
  unitPrice?: number;
  editedBy?: string | null;
  editedAt?: string | null;
  editCount?: number | null;
  editNote?: string | null;
}

export interface ProductItem {
  productId: string;
  productName: string;
  unitOfMeasure: string;
  currentStock: number;
  produced: number;
  damages: number;
  used: number;
  sold: number;
  // The same four figures for the current month only
  thisMonth: { produced: number; damages: number; used: number; sold: number };
}

interface ProductionBinCardDetailViewProps {
  // The product whose ledger is shown; null for every product together
  productName: string | null;
  onBack: () => void;
}

// A product's figures as the server sends them
export interface ProductSummaryDto {
  productName: string | null;
  currentStock: number;
  produced: number;
  damages: number;
  used: number;
  sold: number;
  thisMonth: {
    produced: number;
    damages: number;
    used: number;
    sold: number;
    materialCost?: number | null;
    materialCostPartial?: boolean;
  };
}

export const toProductItem = (summary: ProductSummaryDto, fallbackName = ""): ProductItem => {
  const productName = summary.productName ?? fallbackName;
  return {
    productId: productName.toLowerCase().replace(/[^a-z0-9]/g, "-"),
    productName,
    unitOfMeasure: "PCS",
    currentStock: summary.currentStock,
    produced: summary.produced,
    damages: summary.damages,
    used: summary.used,
    sold: summary.sold,
    thisMonth: summary.thisMonth,
  };
};

// One ledger line as the server sends it
interface LedgerRowDto {
  id: string;
  seq: number;
  type: ProductionLedgerRow["type"];
  date: string;
  productName: string;
  openingStock: number;
  qtyIn: number;
  qtyOut: number;
  damage: number;
  closingStock: number;
  sourceId?: string | null;
  workerName?: string | null;
  usedFor?: string | null;
  status?: ProductionStatusType | null;
  materials?: MaterialUsageDto[] | null;
  productUsages?: ProductUsageDto[] | null;
  // Missing for clerks, who do not see prices
  unitPrice?: number | null;
  editedBy?: string | null;
  editedAt?: string | null;
  editCount?: number | null;
  editNote?: string | null;
}

const toLedgerRow = (dto: LedgerRowDto): ProductionLedgerRow => {
  const materials = dto.materials ?? [];
  const costed = materials.filter((m) => m.unitCost != null);
  const unitPrice = dto.unitPrice != null ? Number(dto.unitPrice) : undefined;

  let status: ProductionStatusType = dto.status || "STORED";
  let remarks = dto.damage > 0 ? `Produced ${dto.qtyIn} (${dto.damage} damaged)` : `Manufactured ${dto.qtyIn} usable units`;
  if (dto.type === "CONSUMPTION") {
    status = "CONSUMED";
    remarks = `Used to produce ${dto.usedFor ?? "another product"}`;
  } else if (dto.type === "SALE") {
    status = "SOLD";
    remarks =
      unitPrice != null
        ? `Sold at ${formatMoney(unitPrice)} per piece · ${formatMoney(unitPrice * dto.qtyOut)} total`
        : "Sold";
  }

  return {
    id: dto.id,
    seq: dto.seq,
    date: dto.date,
    productName: dto.productName,
    openingStock: dto.openingStock,
    qtyIn: dto.qtyIn,
    qtyOut: dto.qtyOut,
    damage: dto.damage,
    closingStock: dto.closingStock,
    status,
    materials: dto.materials ?? undefined,
    productUsages: dto.productUsages ?? undefined,
    materialCost: costed.length > 0 ? costed.reduce((sum, m) => sum + Number(m.amount) * Number(m.unitCost), 0) : null,
    materialCostPartial: costed.length > 0 && costed.length < materials.length,
    workerName: dto.workerName ?? undefined,
    remarks,
    type: dto.type,
    sourceId: dto.sourceId ?? undefined,
    unitPrice,
    editedBy: dto.editedBy,
    editedAt: dto.editedAt,
    editCount: dto.editCount,
    editNote: dto.editNote,
  };
};

interface LedgerPage {
  // The request this page of rows answers
  key: string;
  rows: ProductionLedgerRow[];
  total: number;
}

const DEFAULT_ROWS_PER_PAGE = 10;
const SEARCH_DEBOUNCE_MS = 350;

type MovementTab = "all" | "in" | "out" | "damage";

// Latest entries first
const DEFAULT_SORT: CustomTableSort = { field: "date", direction: "desc" };

const usageChipSx = {
  height: 22,
  fontSize: "0.72rem",
  fontWeight: 600,
  borderRadius: "6px",
  bgcolor: "#F8FAFC",
  color: "#334155",
  border: "1px solid #E2E8F0",
  "& .MuiChip-label": { px: 0.9 },
};

const movementChipSx = (color: string, bg: string, border: string) => ({
  bgcolor: bg,
  color,
  fontWeight: 700,
  fontSize: "0.8rem",
  border: `1px solid ${border}`,
  height: 24,
  boxShadow: "none",
});

const statLabelSx = {
  fontSize: "0.68rem",
  fontWeight: 700,
  color: "#94A3B8",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
};

const emptyDash = <Typography sx={{ color: "#94A3B8", fontSize: "0.875rem" }}>-</Typography>;

const materialTooltip = (m: MaterialUsageDto) =>
  [
    m.batchCode ? `Stock ${m.batchCode}` : "Taken from several stocks",
    m.unitCost != null
      ? `${formatMoney(m.unitCost)} per ${m.unitOfMeasure ?? "unit"}`
      : "no buying cost recorded",
  ].join(" · ");

export default function ProductionBinCardDetailView({ productName, onBack }: ProductionBinCardDetailViewProps) {
  const isAllProducts = productName === null;

  const { isAdmin } = useAuth();
  const [ledger, setLedger] = useState<LedgerPage>({ key: "", rows: [], total: 0 });
  const [summary, setSummary] = useState<ProductSummaryDto | null>(null);
  const [detailSearchQuery, setDetailSearchQuery] = useState("");
  const [movementTab, setMovementTab] = useState<MovementTab>("all");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_ROWS_PER_PAGE);
  const [sort, setSort] = useState<CustomTableSort>(DEFAULT_SORT);
  const [refreshToken, setRefreshToken] = useState(0);
  const [editingRow, setEditingRow] = useState<ProductionLedgerRow | null>(null);

  const debouncedSearch = useDebouncedValue(detailSearchQuery, SEARCH_DEBOUNCE_MS);
  const refresh = () => setRefreshToken((token) => token + 1);

  const query = useMemo(() => {
    const params = new URLSearchParams({
      page: String(page),
      size: String(rowsPerPage),
      direction: sort.direction,
    });
    if (productName !== null) params.set("product", productName);
    if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
    if (movementTab !== "all") params.set("movement", movementTab);
    return params.toString();
  }, [page, rowsPerPage, sort.direction, productName, debouncedSearch, movementTab]);

  const requestKey = `${query}#${refreshToken}`;
  // Loading is derived: the page on screen belongs to an older request
  const loading = ledger.key !== requestKey;

  // One page of the ledger; the server works out the balances, filters and order
  useEffect(() => {
    const controller = new AbortController();

    fetch(`/api/production/bin/ledger?${query}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load the ledger");
        return res.json();
      })
      .then((data) => {
        const rows: ProductionLedgerRow[] = (data.content ?? []).map(toLedgerRow);
        const total: number = data.totalElements ?? 0;
        const lastPage = Math.max(0, (data.totalPages ?? 1) - 1);
        setLedger({ key: requestKey, rows, total });
        // The result set shrank underneath us: step back to the last page that exists
        if (rows.length === 0 && total > 0) setPage((prev) => Math.min(prev, lastPage));
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        console.error("Failed to load the production ledger:", err);
        setLedger((prev) => ({ ...prev, key: requestKey }));
      });

    return () => controller.abort();
  }, [query, requestKey]);

  // Stock on hand and this month's totals, which do not depend on the tab, search or page
  useEffect(() => {
    const controller = new AbortController();
    const params = productName !== null ? `?${new URLSearchParams({ product: productName })}` : "";

    fetch(`/api/production/bin/summary${params}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load the product summary");
        return res.json();
      })
      .then((data: ProductSummaryDto) => setSummary(data))
      .catch((err) => {
        if (!controller.signal.aborted) console.error("Failed to load the product summary:", err);
      });

    return () => controller.abort();
  }, [productName, refreshToken]);

  const activeProduct: ProductItem | null = useMemo(() => {
    if (productName === null) return null;
    return summary
      ? toProductItem(summary, productName)
      : toProductItem(
          { productName, currentStock: 0, produced: 0, damages: 0, used: 0, sold: 0, thisMonth: { produced: 0, damages: 0, used: 0, sold: 0 } },
          productName,
        );
  }, [productName, summary]);

  // Totals for the product(s) on screen for the current month, before any tab or search
  // filter. All-time figures would only ever grow; the running balance covers the long view.
  const totals = useMemo(() => {
    const { label: monthLabel } = currentMonthInSriLanka();
    const month = summary?.thisMonth;
    return {
      produced: month?.produced ?? 0,
      damaged: month?.damages ?? 0,
      used: month?.used ?? 0,
      sold: month?.sold ?? 0,
      materialCost: Number(month?.materialCost ?? 0),
      hasCost: month?.materialCost != null,
      costPartial: month?.materialCostPartial ?? false,
      monthLabel,
    };
  }, [summary]);

  const hasActiveFilters = detailSearchQuery !== "" || movementTab !== "all";

  const allColumns: CustomTableColumn[] = [
    {
      field: "date",
      headerName: "Date",
      minWidth: 100,
      renderCell: (params) => (
        <Typography sx={{ fontSize: "0.875rem", color: "#0F172A", fontWeight: 600, whiteSpace: "nowrap" }}>
          {formatDate(params.value)}
        </Typography>
      ),
    },
    // Product name (only in the combined ledger)
    ...(isAllProducts
      ? [
          {
            field: "productName",
            headerName: "Product",
            minWidth: 110,
            sortable: false,
            renderCell: (params) => (
              <Typography variant="body2" sx={{ fontWeight: 600, color: "#1E293B" }}>
                {params.value}
              </Typography>
            ),
          } satisfies CustomTableColumn,
        ]
      : []),
    {
      // Produced (+), used in another product (-) and damaged units of one entry
      field: "qtyIn",
      headerName: "Movement",
      minWidth: 100,
      sortable: false,
      renderCell: (params) => {
        const row = params.row as ProductionLedgerRow;
        return (
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
            {row.qtyIn > 0 && (
              <Tooltip title="Produced">
                <Chip
                  icon={<TrendingUpIcon style={{ color: "#059669", fontSize: 15 }} />}
                  label={`+${formatQty(row.qtyIn)}`}
                  size="small"
                  sx={movementChipSx("#059669", "#ECFDF5", "rgba(16, 185, 129, 0.2)")}
                />
              </Tooltip>
            )}
            {row.qtyOut > 0 && (
              <Tooltip title={row.type === "SALE" ? "Sold" : "Used in another product"}>
                <Chip
                  icon={
                    <TrendingDownIcon
                      style={{ color: row.type === "SALE" ? "#2563EB" : "#C2410C", fontSize: 15 }}
                    />
                  }
                  label={`-${formatQty(row.qtyOut)}`}
                  size="small"
                  sx={
                    row.type === "SALE"
                      ? movementChipSx("#2563EB", "#EFF6FF", "rgba(37, 99, 235, 0.2)")
                      : movementChipSx("#C2410C", "#FFF7ED", "rgba(234, 88, 12, 0.2)")
                  }
                />
              </Tooltip>
            )}
            {row.damage > 0 && (
              <Tooltip title="Damaged units">
                <Chip
                  icon={<ReportProblemOutlinedIcon style={{ color: "#DC2626", fontSize: 15 }} />}
                  label={`-${formatQty(row.damage)}`}
                  size="small"
                  sx={movementChipSx("#DC2626", "#FEF2F2", "rgba(239, 68, 68, 0.2)")}
                />
              </Tooltip>
            )}
          </Box>
        );
      },
    },
    {
      field: "openingStock",
      headerName: "O/S",
      minWidth: 60,
      align: "right",
      sortable: false,
      renderCell: (params) => (
        <Typography
          variant="body2"
          sx={{ color: "#64748B", fontWeight: 500, fontVariantNumeric: "tabular-nums" }}
        >
          {formatQty(params.value)}
        </Typography>
      ),
    },
    {
      field: "closingStock",
      headerName: "Balance",
      minWidth: 75,
      align: "right",
      sortable: false,
      renderCell: (params) => (
        <Typography
          sx={{ fontWeight: 800, color: "#0F172A", fontSize: "0.9rem", fontVariantNumeric: "tabular-nums" }}
        >
          {formatQty(params.value)}
        </Typography>
      ),
    },
    {
      field: "status",
      headerName: "Status",
      minWidth: 95,
      sortable: false,
      mobileSlot: "badge",
      renderCell: (params) => {
        const cfg = STATUS_CONFIG[params.value as ProductionStatusType] || STATUS_CONFIG.STORED;
        return (
          <Chip
            label={cfg.label}
            size="small"
            sx={{
              bgcolor: cfg.bg,
              color: cfg.color,
              fontWeight: 700,
              fontSize: "0.75rem",
              border: `1px solid ${cfg.border}`,
              height: 24,
              boxShadow: "none",
            }}
          />
        );
      },
    },
    {
      field: "materials",
      headerName: "Inputs Used",
      minWidth: 150,
      sortable: false,
      renderCell: (params) => {
        const row = params.row as ProductionLedgerRow;
        // A consumption or sale has no inputs of its own; say where the product went
        const edited = row.editedAt && (
          <EditedNote
            editedBy={row.editedBy}
            editedAt={row.editedAt}
            editCount={row.editCount}
            editNote={row.editNote}
          />
        );
        if (row.type !== "PRODUCTION") {
          return (
            <Box>
              <Typography variant="body2" sx={{ color: "#475569", fontSize: "0.85rem" }}>
                {row.remarks}
              </Typography>
              {edited}
            </Box>
          );
        }
        const materials = row.materials ?? [];
        const usages = row.productUsages ?? [];
        if (materials.length === 0 && usages.length === 0) return edited || emptyDash;
        return (
          <Box>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
            {materials.map((m, index) => (
              <Tooltip key={`${m.itemId}-${index}`} title={materialTooltip(m)}>
                <Chip
                  size="small"
                  label={`${m.itemName} · ${formatQty(m.amount)}${m.unitOfMeasure ? ` ${m.unitOfMeasure}` : ""}`}
                  sx={usageChipSx}
                />
              </Tooltip>
            ))}
            {/* Manufactured products consumed, in blue */}
            {usages.map((pu, index) => (
              <Tooltip key={`${pu.productName}-${index}`} title="Manufactured product used">
                <Chip
                  size="small"
                  label={`${pu.productName} · ${formatQty(pu.amount)} PCS`}
                  sx={{ ...usageChipSx, bgcolor: "#EFF6FF", color: "#1D4ED8", border: "1px solid #BFDBFE" }}
                />
              </Tooltip>
            ))}
          </Box>
          {edited}
          </Box>
        );
      },
    },
    {
      field: "materialCost",
      headerName: "Material Cost",
      minWidth: 115,
      align: "right",
      sortable: false,
      renderCell: (params) => {
        const row = params.row as ProductionLedgerRow;
        if (row.materialCost == null) return emptyDash;
        return (
          <Tooltip
            title={row.materialCostPartial ? "Some materials have no buying cost recorded and are not included" : ""}
          >
            <Typography
              sx={{
                fontSize: "0.875rem",
                fontWeight: 700,
                color: "#0F172A",
                whiteSpace: "nowrap",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {formatMoney(row.materialCost)}
              {row.materialCostPartial ? " *" : ""}
            </Typography>
          </Tooltip>
        );
      },
    },
    {
      field: "actions",
      headerName: "Edit",
      width: 64,
      minWidth: 64,
      align: "center",
      sortable: false,
      mobileSlot: "footer",
      renderCell: (params) => {
        const row = params.row as ProductionLedgerRow;
        // "Used in" rows come from another production entry and are corrected there
        if (!row.sourceId) return null;
        return (
          <Tooltip title={row.type === "SALE" ? "Edit this sale" : "Edit this production entry"}>
            <IconButton
              size="small"
              aria-label="Edit entry"
              onClick={() => setEditingRow(row)}
              sx={{ color: "#64748B", "&:hover": { color: "#2563EB", bgcolor: "#EFF6FF" } }}
            >
              <EditOutlinedIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        );
      },
    },
  ];
  // Only admins can correct saved entries
  const columns = isAdmin ? allColumns : allColumns.filter((column) => column.field !== "actions");

  const editingSale = editingRow?.type === "SALE";
  const editFields: EditRecordField[] = editingSale
    ? [
        { name: "date", label: "Sale Date", type: "date", required: true },
        { name: "quantity", label: "Quantity", type: "number", integer: true, required: true, half: true, endAdornment: "PCS" },
        {
          name: "unitPrice",
          label: "Selling Price",
          type: "number",
          required: true,
          half: true,
          startAdornment: "Rs.",
          helperText: "per piece",
        },
      ]
    : [
        { name: "date", label: "Report Date", type: "date", required: true },
        { name: "qtyProduced", label: "Qty Produced", type: "number", integer: true, required: true, half: true, endAdornment: "PCS" },
        { name: "damages", label: "Damages", type: "number", integer: true, required: true, half: true, endAdornment: "PCS" },
      ];

  const saveEditedRow = async (values: Record<string, string>) => {
    if (!editingRow?.sourceId) return;
    const res = await fetch(
      editingSale ? `/api/sales/${editingRow.sourceId}` : `/api/production/items/${editingRow.sourceId}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          editingSale
            ? {
                saleDate: values.date,
                quantity: Number(values.quantity),
                unitPrice: Number(values.unitPrice),
                editedBy: values.editedBy.trim(),
                editRemark: values.editRemark,
              }
            : {
                reportDate: values.date,
                qtyProduced: Number(values.qtyProduced),
                damages: Number(values.damages),
                editedBy: values.editedBy.trim(),
                editRemark: values.editRemark,
              },
        ),
      },
    );
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.message || "Failed to save the change");
    }
    refresh();
  };

  const stats = [
    { label: "Produced", value: formatQty(totals.produced), unit: "PCS", color: "#059669" },
    { label: "Damaged", value: formatQty(totals.damaged), unit: "PCS", color: totals.damaged > 0 ? "#DC2626" : "#0F172A" },
    { label: "Used in other products", value: formatQty(totals.used), unit: "PCS", color: "#0F172A" },
    { label: "Sold", value: formatQty(totals.sold), unit: "PCS", color: totals.sold > 0 ? "#2563EB" : "#0F172A" },
    {
      label: "Material cost",
      value: totals.hasCost ? `${formatMoney(totals.materialCost)}${totals.costPartial ? " *" : ""}` : "-",
      unit: "",
      color: "#0F172A",
      hint: totals.costPartial ? "* materials without a recorded cost are not included" : undefined,
    },
  ];

  const ledgerToolbar = (
    <Box
      sx={{
        display: "flex",
        flexDirection: { xs: "column", sm: "row" },
        justifyContent: "space-between",
        alignItems: { xs: "stretch", sm: "center" },
        gap: 1.5,
        minWidth: 0,
      }}
    >
      <Tabs
        value={movementTab}
        onChange={(_, value) => {
          setMovementTab(value);
          setPage(0);
        }}
        variant="scrollable"
        scrollButtons={false}
        sx={{
          // 32px tabs + 3px padding = 38px, the height of the search box beside it
          minHeight: 38,
          bgcolor: "#F1F5F9",
          borderRadius: "999px",
          p: "3px",
          flexShrink: 0,
          // Four tabs are wider than a phone: scroll inside the bar instead of widening the page
          width: { xs: "100%", sm: "auto" },
          contain: { xs: "inline-size", sm: "none" },
          // The chosen filter is a solid blue pill, so it is obvious which one is on
          "& .MuiTabs-indicator": {
            bgcolor: "#2563EB",
            height: "100%",
            borderRadius: "999px",
            boxShadow: "0 1px 3px rgba(37, 99, 235, 0.35)",
            zIndex: 1,
          },
          "& .MuiTab-root": {
            minHeight: 32,
            py: 0.5,
            px: { xs: 1.25, sm: 2 },
            fontSize: "0.85rem",
            fontWeight: 600,
            color: "#475569",
            textTransform: "none",
            borderRadius: "999px",
            transition: "color 0.2s ease",
            zIndex: 2,
            "&.Mui-selected": { color: "#FFFFFF", fontWeight: 700 },
          },
        }}
      >
        <Tab label="All Movements" value="all" />
        <Tab label="Produced (+)" value="in" />
        <Tab label="Used / Sold (-)" value="out" />
        <Tab label="Damaged" value="damage" />
      </Tabs>

      <SearchBar
        value={detailSearchQuery}
        onChange={(value) => {
          setDetailSearchQuery(value);
          setPage(0);
        }}
        placeholder="Search product, material or worker"
        maxWidth={{ xs: "100%", sm: 320 }}
      />
    </Box>
  );

  const ledgerEmptyState = (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        gap: 1,
        py: 8,
        px: 2,
      }}
    >
      <ReceiptLongIcon sx={{ fontSize: 40, color: "#CBD5E1" }} />
      <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "#334155" }}>
        No Production Records Found
      </Typography>
      <Typography variant="body2" sx={{ color: "#94A3B8", maxWidth: 360 }}>
        {hasActiveFilters
          ? "No ledger movements match these filters."
          : "Production recorded on the Production page shows up here."}
      </Typography>
    </Box>
  );

  return (
    <Box
      // This view shows its own breadcrumb, so the clerk layout hides the shorter one
      data-own-back
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 2.5,
        // One screen tall on laptops, so the table scrolls instead of the page
        height: { md: "calc(100vh - var(--page-chrome, 48px))" },
      }}
    >
      {/* Back Navigation Bar */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2 }}>
        <BackLink
          // Clerks come here from their home page; admins use the sidebar
          trail={[
            ...(isAdmin ? [] : [{ label: "Home", href: "/dashboard" }]),
            { label: "Production Bin Card", onClick: onBack },
          ]}
          current={activeProduct ? activeProduct.productName : "All Products Combined Ledger"}
        />

        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          {/* Straight to the production form with this product filled in */}
          {activeProduct && (
            <Button
              component={Link}
              href={`/dashboard/production?product=${encodeURIComponent(activeProduct.productName)}`}
              variant="contained"
              disableElevation
              startIcon={<AddIcon sx={{ fontSize: 18 }} />}
              sx={{
                borderRadius: "8px",
                bgcolor: "#2563EB",
                color: "#FFFFFF",
                fontWeight: 600,
                fontSize: "0.825rem",
                textTransform: "none",
                px: 1.75,
                height: 36,
                boxShadow: "none",
                "&:hover": { bgcolor: "#1D4ED8", boxShadow: "none" },
              }}
            >
              Record Production
            </Button>
          )}
        <Tooltip title="Refresh ledger">
          <IconButton
            onClick={refresh}
            size="small"
            sx={{
              bgcolor: "#FFFFFF",
              border: "1px solid #E2E8F0",
              borderRadius: "8px",
              width: 36,
              height: 36,
              color: "#475569",
              "&:hover": { bgcolor: "#F8FAFC", borderColor: "#CBD5E1", color: "#0F172A" },
            }}
          >
            <RefreshIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
        </Box>
      </Box>

      {/* Product header with its totals */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, md: 2.5 },
          px: { xs: 2, md: 3 },
          bgcolor: "#FFFFFF",
          border: "1px solid #E2E8F0",
          borderRadius: "16px",
          boxShadow: "none",
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            justifyContent: "space-between",
            alignItems: { xs: "stretch", md: "center" },
            gap: { xs: 2, md: 3 },
          }}
        >
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75, minWidth: 0 }}>
            <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: { xs: 1, md: 2 } }}>
              <Typography
                variant="h4"
                sx={{
                  color: "#0F172A",
                  m: 0,
                  lineHeight: 1.1,
                  fontWeight: 800,
                  fontSize: { xs: "1.5rem", sm: "2.125rem" },
                  overflowWrap: "anywhere",
                }}
              >
                {activeProduct ? activeProduct.productName : "All Products Combined Ledger"}
              </Typography>
              {activeProduct && (
                <Chip
                  icon={
                    activeProduct.currentStock > 0 ? (
                      <CheckCircleIcon style={{ color: "#10B981", fontSize: 13 }} />
                    ) : (
                      <ErrorIcon style={{ color: "#EF4444", fontSize: 13 }} />
                    )
                  }
                  label={activeProduct.currentStock > 0 ? "In Stock" : "Out of Stock"}
                  sx={{
                    bgcolor: activeProduct.currentStock > 0 ? "#ECFDF5" : "#FEF2F2",
                    color: activeProduct.currentStock > 0 ? "#065F46" : "#991B1B",
                    fontWeight: 700,
                    fontSize: "0.7rem",
                    height: 24,
                    border: "1px solid",
                    borderColor: activeProduct.currentStock > 0 ? "#A7F3D0" : "#FECACA",
                    boxShadow: "none",
                  }}
                />
              )}
            </Box>
            <Typography variant="body2" sx={{ color: "#64748B", fontSize: "0.85rem" }}>
              {activeProduct
                ? "Every production, use and damage of this product, with the materials and stocks it consumed."
                : "Every production, use and damage across all products, with the materials and stocks consumed."}
            </Typography>
          </Box>

          {/* Current Balance widget */}
          {activeProduct && (
            <Box
              sx={{
                p: 1.5,
                px: 2.5,
                bgcolor: "#F8FAFC",
                borderRadius: "12px",
                border: "1px solid #E2E8F0",
                minWidth: 160,
                flexShrink: 0,
              }}
            >
              <Typography sx={statLabelSx}>Current Balance</Typography>
              <Box sx={{ display: "flex", alignItems: "baseline", gap: 0.75 }}>
                <Typography
                  variant="h4"
                  sx={{
                    fontWeight: 800,
                    color: activeProduct.currentStock <= 0 ? "#EF4444" : "#0F172A",
                    lineHeight: 1.2,
                  }}
                >
                  {formatQty(activeProduct.currentStock)}
                </Typography>
                <Typography variant="subtitle2" sx={{ color: "#64748B", fontWeight: 700 }}>
                  {activeProduct.unitOfMeasure}
                </Typography>
              </Box>
            </Box>
          )}
        </Box>

        <Typography sx={{ ...statLabelSx, mb: -1 }}>This month · {totals.monthLabel}</Typography>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", md: "repeat(5, minmax(0, 1fr))" },
            gap: 1.5,
          }}
        >
          {stats.map((stat) => (
            <Tooltip key={stat.label} title={stat.hint ?? ""}>
              <Box
                sx={{
                  p: 1.5,
                  bgcolor: "#F8FAFC",
                  borderRadius: "12px",
                  border: "1px solid #E2E8F0",
                  minWidth: 0,
                }}
              >
                <Typography sx={statLabelSx}>{stat.label}</Typography>
                <Typography
                  sx={{
                    fontSize: { xs: "1rem", sm: "1.15rem" },
                    fontWeight: 800,
                    color: stat.color,
                    lineHeight: 1.4,
                    overflowWrap: "anywhere",
                  }}
                >
                  {stat.value}{" "}
                  {stat.unit && (
                    <Box component="span" sx={{ fontSize: "0.72rem", color: "#64748B", fontWeight: 700 }}>
                      {stat.unit}
                    </Box>
                  )}
                </Typography>
              </Box>
            </Tooltip>
          ))}
        </Box>
      </Paper>

      {/* Ledger Table: takes the rest of the screen on laptops, grows with its cards on mobile */}
      <Box
        sx={{
          flex: { md: "1 1 0" },
          minHeight: { md: 240 },
        }}
      >
        <CustomTable
          rows={ledger.rows}
          pagination={{
            page,
            rowsPerPage,
            totalRows: ledger.total,
            onPageChange: setPage,
            onRowsPerPageChange: (next) => {
              setRowsPerPage(next);
              setPage(0);
            },
          }}
          columns={columns}
          loading={loading}
          toolbar={ledgerToolbar}
          emptyState={ledgerEmptyState}
          sort={sort}
          onSortChange={(next) => {
            setSort(next);
            setPage(0);
          }}
        />
      </Box>

      {editingRow && (
        <EditRecordDialog
          key={editingRow.id}
          title={editingSale ? "Edit Sale" : "Edit Production Entry"}
          subtitle={
            editingSale
              ? editingRow.productName
              : `${editingRow.productName} · materials used are not changed here`
          }
          fields={editFields}
          initialValues={
            editingSale
              ? {
                  date: editingRow.date,
                  quantity: String(editingRow.qtyOut),
                  unitPrice: String(editingRow.unitPrice ?? ""),
                }
              : {
                  date: editingRow.date,
                  qtyProduced: String(editingRow.qtyIn),
                  damages: String(editingRow.damage),
                }
          }
          onClose={() => setEditingRow(null)}
          onSubmit={saveEditedRow}
        />
      )}
    </Box>
  );
}
