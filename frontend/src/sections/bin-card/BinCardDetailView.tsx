import * as React from "react";
import { useState, useEffect, useMemo } from "react";
import {
  Box,
  Typography,
  Button,
  IconButton,
  Tooltip,
  Tab,
  Tabs,
  Paper,
  Chip,
  Stack,
} from "@mui/material";

import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import SearchBar from "../../components/search/SearchBar";
import CustomTable, {
  CustomTableColumn,
  CustomTableSort,
} from "@/components/table/CustomTable";
import useDebouncedValue from "@/hooks/useDebouncedValue";
import EditRecordDialog, { EditRecordField } from "@/components/dialog/EditRecordDialog";
import EditedNote from "@/components/table/EditedNote";
import { formatDate } from "@/utils/datetime";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import RefreshIcon from "@mui/icons-material/Refresh";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import FactoryOutlinedIcon from "@mui/icons-material/FactoryOutlined";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import { Item, InventoryLog } from "./BinCardView";

interface BinCardDetailViewProps {
  selectedItemId: string;
  activeItem: Item | null;
  /** Bumped by the parent to re-run the current query (e.g. after a transaction) */
  reloadToken: number;
  onBack: () => void;
  onTransaction: (type: "load" | "deduct", itemId: string) => void;
  onError: (message: string) => void;
  /** An entry was edited: stock figures held by the parent are out of date */
  onChanged: () => void;
}

type MovementTab = "all" | "in" | "out";

interface LedgerPage {
  key: string;
  rows: InventoryLog[];
  total: number;
}

// Latest transactions first
const DEFAULT_SORT: CustomTableSort = { field: "transactionDate", direction: "desc" };
const DEFAULT_ROWS_PER_PAGE = 10;
const SEARCH_DEBOUNCE_MS = 350;

const getRemarkBadge = (remarks: string) => {
  if (!remarks) return null;
  const isProduction = remarks.toLowerCase().includes("production");
  const isSupplier =
    remarks.toLowerCase().includes("supplier") ||
    remarks.toLowerCase().includes("delivery");

  if (isProduction) {
    return (
      <Chip
        icon={<FactoryOutlinedIcon style={{ fontSize: 13 }} />}
        label="Production"
        size="small"
        sx={{
          height: 20,
          fontSize: "0.7rem",
          fontWeight: 600,
          bgcolor: "#EEF2FF",
          color: "#4F46E5",
          border: "1px solid rgba(99, 102, 241, 0.2)",
          mr: 1,
        }}
      />
    );
  }

  if (isSupplier) {
    return (
      <Chip
        icon={<LocalShippingOutlinedIcon style={{ fontSize: 13 }} />}
        label="Inbound"
        size="small"
        sx={{
          height: 20,
          fontSize: "0.7rem",
          fontWeight: 600,
          bgcolor: "#ECFDF5",
          color: "#059669",
          border: "1px solid rgba(16, 185, 129, 0.2)",
          mr: 1,
        }}
      />
    );
  }

  return null;
};

const emptyDash = (
  <Typography variant="body2" sx={{ color: "#94A3B8" }}>
    -
  </Typography>
);

export default function BinCardDetailView({
  selectedItemId,
  activeItem,
  reloadToken,
  onBack,
  onTransaction,
  onError,
  onChanged,
}: BinCardDetailViewProps) {
  const isAllMaterials = selectedItemId === "all";

  const [ledger, setLedger] = useState<LedgerPage>({ key: "", rows: [], total: 0 });
  const [detailSearchQuery, setDetailSearchQuery] = useState("");
  const [movementTab, setMovementTab] = useState<MovementTab>("all");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_ROWS_PER_PAGE);
  const [sort, setSort] = useState<CustomTableSort>(DEFAULT_SORT);
  const [refreshToken, setRefreshToken] = useState(0);
  const [editingLog, setEditingLog] = useState<InventoryLog | null>(null);

  const debouncedSearch = useDebouncedValue(detailSearchQuery, SEARCH_DEBOUNCE_MS);

  const query = useMemo(() => {
    const params = new URLSearchParams({
      page: String(page),
      size: String(rowsPerPage),
      sort: `${sort.field},${sort.direction}`,
    });
    if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
    if (movementTab !== "all") params.set("movement", movementTab.toUpperCase());
    return params.toString();
  }, [page, rowsPerPage, sort, debouncedSearch, movementTab]);

  const requestKey = `${selectedItemId}?${query}#${reloadToken}.${refreshToken}`;
  // Loading is derived: the page on screen belongs to an older request
  const loading = ledger.key !== requestKey;

  useEffect(() => {
    const controller = new AbortController();

    fetch(`/api/inventory/bin/${selectedItemId}?${query}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch bin logs");
        return res.json();
      })
      .then((data) => {
        const rows: InventoryLog[] = data.content ?? [];
        const total: number = data.totalElements ?? 0;
        const lastPage = Math.max(0, (data.totalPages ?? 1) - 1);
        setLedger({ key: requestKey, rows, total });
        // The result set shrank underneath us: step back to the last page that exists
        if (rows.length === 0 && total > 0) setPage((prev) => Math.min(prev, lastPage));
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        onError(err instanceof Error ? err.message : "Failed to fetch bin logs");
        setLedger((prev) => ({ ...prev, key: requestKey }));
      });

    return () => controller.abort();
    // onError is a fresh closure on every parent render and must not retrigger the fetch
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedItemId, query, requestKey]);

  const logs = ledger.rows;

  // Item fallback helpers
  const currentItemName = isAllMaterials
    ? "All Materials Combined Ledger"
    : activeItem?.itemName || logs[0]?.item?.name || "Material Ledger";
  const currentItemSku =
    activeItem?.itemId ||
    (logs.length > 0 && logs[0]?.item?.id ? logs[0].item.id : selectedItemId);
  const currentItemUnit =
    activeItem?.unitOfMeasure ||
    (logs.length > 0 && logs[0]?.item?.unitOfMeasure ? logs[0].item.unitOfMeasure : "UNITS");
  const currentStock = activeItem?.currentStock ?? 0;

  const hasActiveFilters = detailSearchQuery !== "" || movementTab !== "all";

  const columns: CustomTableColumn[] = [
    {
      field: "transactionDate",
      headerName: "Date",
      minWidth: 105,
      renderCell: (params) => (
        <Typography
          sx={{
            fontSize: "0.875rem",
            color: "#0F172A",
            fontWeight: 600,
            whiteSpace: "nowrap",
          }}
        >
          {formatDate(params.value)}
        </Typography>
      ),
    },
    // Item Name (Only in Combined Ledger)
    ...(isAllMaterials
      ? [
          {
            field: "item",
            headerName: "Item",
            minWidth: 110,
            sortable: false,
            renderCell: (params) => (
              <Typography variant="body2" sx={{ fontWeight: 600, color: "#1E293B" }}>
                {params.value?.name || "-"}
              </Typography>
            ),
          } satisfies CustomTableColumn,
        ]
      : []),
    {
      // Stock ID with its buying cost underneath
      field: "batchCode",
      headerName: "Stock",
      minWidth: 130,
      sortable: false,
      renderCell: (params) =>
        params.value ? (
          <Box>
            <Typography
              variant="body2"
              sx={{ color: "#334155", fontWeight: 600, whiteSpace: "nowrap", fontSize: "0.8rem" }}
            >
              {params.value}
            </Typography>
            {params.row.unitCost != null && (
              <Typography sx={{ color: "#64748B", fontSize: "0.72rem", whiteSpace: "nowrap" }}>
                Rs.{" "}
                {Number(params.row.unitCost).toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                / unit
              </Typography>
            )}
          </Box>
        ) : (
          emptyDash
        ),
    },
    {
      field: "openingStock",
      headerName: "O/S",
      minWidth: 70,
      align: "right",
      sortable: false,
      renderCell: (params) => (
        <Typography
          variant="body2"
          sx={{ color: "#64748B", fontWeight: 500, fontVariantNumeric: "tabular-nums" }}
        >
          {params.value != null ? params.value : "-"}
        </Typography>
      ),
    },
    {
      // Stock in (+) or out (-); an entry is always one or the other
      field: "qtyIn",
      headerName: "Movement",
      minWidth: 95,
      sortable: false,
      renderCell: (params) => {
        const isInflow = Number(params.row.qtyIn) > 0;
        const isOutflow = Number(params.row.qtyOut) > 0;
        if (!isInflow && !isOutflow) return emptyDash;
        return (
          <Chip
            icon={
              isInflow ? (
                <TrendingUpIcon style={{ color: "#059669", fontSize: 15 }} />
              ) : (
                <TrendingDownIcon style={{ color: "#DC2626", fontSize: 15 }} />
              )
            }
            label={isInflow ? `+${params.row.qtyIn}` : `-${params.row.qtyOut}`}
            size="small"
            sx={{
              bgcolor: isInflow ? "#ECFDF5" : "#FEF2F2",
              color: isInflow ? "#059669" : "#DC2626",
              fontWeight: 700,
              fontSize: "0.8rem",
              border: isInflow
                ? "1px solid rgba(16, 185, 129, 0.2)"
                : "1px solid rgba(239, 68, 68, 0.2)",
              height: 24,
            }}
          />
        );
      },
    },
    {
      field: "closingStock",
      headerName: "Balance",
      minWidth: 90,
      align: "right",
      sortable: false,
      renderCell: (params) => (
        <Typography
          variant="body2"
          sx={{
            fontWeight: 800,
            color: "#0F172A",
            fontSize: "0.9rem",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {params.value != null ? params.value : "-"}
        </Typography>
      ),
    },
    {
      field: "authorizedBy",
      headerName: "Authorized By",
      minWidth: 100,
      sortable: false,
      renderCell: (params) => (
        <Typography
          variant="body2"
          sx={{ color: "#334155", fontWeight: 600, whiteSpace: "nowrap" }}
        >
          {params.value || "System"}
        </Typography>
      ),
    },
    {
      field: "remarks",
      headerName: "Remarks / Reference",
      minWidth: 120,
      sortable: false,
      renderCell: (params) => (
        <Box>
          <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap" }}>
            {getRemarkBadge(params.value)}
            <Typography variant="body2" sx={{ color: "#475569", fontSize: "0.85rem" }}>
              {params.value}
            </Typography>
          </Box>
          {/* Shown once someone has corrected the entry */}
          <EditedNote
            editedBy={params.row.editedBy}
            editedAt={params.row.editedAt}
            editCount={params.row.editCount}
            editNote={params.row.editNote}
          />
        </Box>
      ),
    },
    {
      field: "actions",
      headerName: "Edit",
      width: 64,
      minWidth: 64,
      align: "center",
      sortable: false,
      mobileSlot: "footer",
      renderCell: (params) =>
        // Deductions made automatically by a production entry are locked
        params.row.productionDeduction ? (
          <Tooltip title="Added automatically by a production entry; it cannot be edited">
            <LockOutlinedIcon aria-label="Locked entry" sx={{ fontSize: 16, color: "#CBD5E1", display: "block", mx: "auto" }} />
          </Tooltip>
        ) : (
          <Tooltip title="Edit this entry">
            <IconButton
              size="small"
              aria-label="Edit entry"
              onClick={() => setEditingLog(params.row as InventoryLog)}
              sx={{ color: "#64748B", "&:hover": { color: "#2563EB", bgcolor: "#EFF6FF" } }}
            >
              <EditOutlinedIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        ),
    },
  ];

  // What can be corrected depends on the kind of entry
  const editingIsLoad = Number(editingLog?.qtyIn) > 0;
  const editingUnit = editingLog?.item?.unitOfMeasure || currentItemUnit;
  const editFields: EditRecordField[] = editingLog
    ? [
        { name: "transactionDate", label: "Date", type: "date", required: true, half: true },
        {
          name: "quantity",
          label: editingIsLoad ? "Quantity loaded" : "Quantity deducted",
          type: "number",
          required: true,
          half: true,
          endAdornment: editingUnit,
        },
        ...(editingIsLoad
          ? [
              {
                name: "unitCost",
                label: "Unit Cost (optional)",
                type: "number",
                startAdornment: "Rs.",
                helperText: "Also applied to what was already taken from this stock",
              } satisfies EditRecordField,
            ]
          : []),
        { name: "authorizedBy", label: "Authorized By", type: "text", required: true },
        { name: "remarks", label: "Remarks / Reference Note", type: "multiline" },
      ]
    : [];

  const saveEditedLog = async (values: Record<string, string>) => {
    if (!editingLog) return;
    const res = await fetch(`/api/inventory/bin/${editingLog.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        transactionDate: values.transactionDate,
        quantity: Number(values.quantity),
        unitCost: values.unitCost?.trim() ? Number(values.unitCost) : null,
        authorizedBy: values.authorizedBy.trim(),
        remarks: values.remarks,
        editedBy: values.editedBy.trim(),
        editRemark: values.editRemark,
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.message || "Failed to save the change");
    }
    setRefreshToken((token) => token + 1);
    onChanged();
  };

  const ledgerToolbar = (
    <Box
      sx={{
        display: "flex",
        flexDirection: { xs: "column", sm: "row" },
        justifyContent: "space-between",
        alignItems: { xs: "stretch", sm: "center" },
        gap: 1.5,
      }}
    >
      {/* Movement Tabs */}
      <Tabs
        value={movementTab}
        onChange={(_, val) => {
          setMovementTab(val);
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
        <Tab label="Stock In (+)" value="in" />
        <Tab label="Stock Out (-)" value="out" />
      </Tabs>

      {/* Search Log Records */}
      <SearchBar
        value={detailSearchQuery}
        onChange={(value) => {
          setDetailSearchQuery(value);
          setPage(0);
        }}
        placeholder="Search remarks, item or authorizer"
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
        No Bin Card Records Found
      </Typography>
      <Typography variant="body2" sx={{ color: "#94A3B8", maxWidth: 360 }}>
        {hasActiveFilters
          ? "No ledger movements match these filters."
          : activeItem
            ? `There are no recorded transactions for ${activeItem.itemName} yet.`
            : "No inventory movements recorded."}
      </Typography>
      {activeItem && !hasActiveFilters && (
        <Button
          variant="outlined"
          size="small"
          startIcon={<AddIcon />}
          onClick={() => onTransaction("load", selectedItemId)}
          sx={{
            mt: 1,
            borderRadius: "8px",
            textTransform: "none",
          }}
        >
          Load Initial Stock
        </Button>
      )}
    </Box>
  );

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 2.5,
        // One screen tall on laptops, so the table scrolls instead of the page
        height: { md: "calc(100vh - 48px)" },
      }}
    >
      {/* Back Navigation Bar */}
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          justifyContent: "space-between",
          alignItems: { xs: "flex-start", sm: "center" },
          gap: 2,
        }}
      >
        <Button
          variant="outlined"
          disableElevation
          startIcon={<ArrowBackIcon sx={{ fontSize: 18 }} />}
          onClick={onBack}
          sx={{
            borderRadius: "8px",
            borderColor: "#CBD5E1",
            color: "#334155",
            fontWeight: 600,
            fontSize: "0.825rem",
            textTransform: "none",
            px: 1.75,
            height: 36,
            bgcolor: "#FFFFFF",
            "&:hover": { bgcolor: "#F8FAFC", borderColor: "#2563EB" },
          }}
        >
          Back to All Bin Cards
        </Button>

        {/* In-Detail Action Buttons */}
        <Stack direction="row" spacing={1.5}>
          <Tooltip title="Refresh ledger">
            <IconButton
              onClick={() => setRefreshToken((token) => token + 1)}
              size="small"
              sx={{
                bgcolor: "#FFFFFF",
                border: "1px solid #E2E8F0",
                borderRadius: "8px",
                width: 36,
                height: 36,
                color: "#475569",
                "&:hover": {
                  bgcolor: "#F8FAFC",
                  borderColor: "#CBD5E1",
                  color: "#0F172A",
                },
              }}
            >
              <RefreshIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>

          <Button
            variant="contained"
            disableElevation
            startIcon={<AddIcon sx={{ fontSize: 18 }} />}
            onClick={() => onTransaction("load", selectedItemId)}
            sx={{
              borderRadius: "8px",
              bgcolor: "#10B981",
              color: "#FFFFFF",
              fontWeight: 600,
              fontSize: "0.825rem",
              textTransform: "none",
              px: 1.75,
              height: 36,
              boxShadow: "none",
              "&:hover": { bgcolor: "#059669", boxShadow: "none" },
            }}
          >
            Load Stock
          </Button>

          <Button
            variant="contained"
            disableElevation
            startIcon={<RemoveIcon sx={{ fontSize: 18 }} />}
            onClick={() => onTransaction("deduct", selectedItemId)}
            sx={{
              borderRadius: "8px",
              bgcolor: "#EF4444",
              color: "#FFFFFF",
              fontWeight: 600,
              fontSize: "0.825rem",
              textTransform: "none",
              px: 1.75,
              height: 36,
              boxShadow: "none",
              "&:hover": { bgcolor: "#DC2626", boxShadow: "none" },
            }}
          >
            Deduct Stock
          </Button>
        </Stack>
      </Box>

      {/* Active Material Header */}
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
          flexDirection: { xs: "column", md: "row" },
          justifyContent: "space-between",
          alignItems: { xs: "stretch", md: "center" },
          gap: { xs: 2, md: 3 },
        }}
      >
        {/* Left Side: Material Info */}
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
              {currentItemName}
            </Typography>
            {!isAllMaterials && (
              <Chip
                icon={
                  currentStock > 0 ? (
                    <CheckCircleIcon
                      style={{ color: "#10B981", fontSize: 12 }}
                    />
                  ) : (
                    <ErrorIcon style={{ color: "#EF4444", fontSize: 12 }} />
                  )
                }
                label={currentStock > 0 ? "In Stock" : "Out of Stock"}
                sx={{
                  bgcolor: currentStock > 0 ? "#ECFDF5" : "#FEF2F2",
                  color: currentStock > 0 ? "#065F46" : "#991B1B",
                  fontWeight: 700,
                  fontSize: "0.65rem",
                  height: 24,
                  border: "1px solid",
                  borderColor: currentStock > 0 ? "#A7F3D0" : "#FECACA",
                  boxShadow: "none",
                }}
              />
            )}
          </Box>
          <Typography
            variant="body2"
            sx={{ color: "#64748B", fontSize: "0.85rem", overflowWrap: "anywhere" }}
          >
            {!isAllMaterials
              ? `Material ID: ${currentItemSku}`
              : "Aggregated transaction log for all warehouse materials"}
          </Typography>
        </Box>

        {/* Right Side: Current Balance inline (hidden for combined ledger) */}
        {!isAllMaterials && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              p: 1.5,
              px: 2.5,
              bgcolor: "#F8FAFC",
              borderRadius: "12px",
              border: "1px solid #E2E8F0",
              minWidth: 160,
              flexShrink: 0,
              boxShadow: "none",
            }}
          >
            <Box sx={{ display: "flex", flexDirection: "column" }}>
              <Typography
                variant="caption"
                sx={{
                  color: "#64748B",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  mb: 0.25,
                }}
              >
                Current Balance
              </Typography>
              <Box sx={{ display: "flex", alignItems: "baseline", gap: 0.75 }}>
                <Typography
                  variant="h4"
                  sx={{ fontWeight: 800, color: "#0F172A", lineHeight: 1 }}
                >
                  {currentStock}
                </Typography>
                <Typography
                  variant="subtitle2"
                  sx={{ color: "#64748B", fontWeight: 700 }}
                >
                  {currentItemUnit}
                </Typography>
              </Box>
            </Box>
          </Box>
        )}
      </Paper>

      {/* Ledger Table: takes the rest of the screen on laptops, grows with its cards on mobile */}
      <Box
        sx={{
          flex: { md: "1 1 0" },
          minHeight: { md: 240 },
        }}
      >
        <CustomTable
          rows={logs}
          columns={columns}
          loading={loading}
          toolbar={ledgerToolbar}
          emptyState={ledgerEmptyState}
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
          sort={sort}
          onSortChange={(next) => {
            setSort(next);
            setPage(0);
          }}
        />
      </Box>

      {editingLog && (
        <EditRecordDialog
          key={editingLog.id}
          title={editingIsLoad ? "Edit Stock Load" : "Edit Stock Deduction"}
          subtitle={`${editingLog.item?.name || currentItemName}${editingLog.batchCode ? ` · stock ${editingLog.batchCode}` : ""}`}
          fields={editFields}
          initialValues={{
            transactionDate: editingLog.transactionDate,
            quantity: String(editingIsLoad ? editingLog.qtyIn : editingLog.qtyOut),
            unitCost: editingLog.unitCost != null ? String(editingLog.unitCost) : "",
            authorizedBy: editingLog.authorizedBy || "",
            remarks: editingLog.remarks || "",
          }}
          onClose={() => setEditingLog(null)}
          onSubmit={saveEditedLog}
        />
      )}
    </Box>
  );
}
