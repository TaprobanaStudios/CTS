"use client";

import * as React from "react";
import { useState, useEffect, useMemo } from "react";
import {
  Box,
  Typography,
  TextField,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  MenuItem,
  Chip,
  Card,
  Grid,
  Tooltip,
  IconButton,
  Avatar,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import RefreshIcon from "@mui/icons-material/Refresh";
import FilterAltOffOutlinedIcon from "@mui/icons-material/FilterAltOffOutlined";
import Link from "next/link";
import CustomTable, {
  CustomTableColumn,
  CustomTableSort,
} from "@/components/table/CustomTable";
import SearchBar from "../../components/search/SearchBar";
import useDebouncedValue from "@/hooks/useDebouncedValue";
import { formatDateTime } from "@/utils/datetime";

type StockStatus = "HEALTHY" | "LOW" | "DEPLETED";
type StatusFilter = "ALL" | StockStatus;

interface InventoryItem {
  itemId: string;
  itemName: string;
  unitOfMeasure: string;
  currentStock: number;
  status: StockStatus;
  updatedAt?: string;
}

interface InventorySummary {
  total: number;
  healthy: number;
  low: number;
  depleted: number;
}

interface InventoryPage {
  key: string;
  rows: InventoryItem[];
  total: number;
}

// Status is decided by the backend: <= 0 => Depleted, up to 10 => Low Stock, above => Healthy
const STATUS_META: Record<
  StockStatus,
  {
    label: string;
    color: string;
    bg: string;
    border: string;
    Icon: typeof CheckCircleOutlineRoundedIcon;
  }
> = {
  HEALTHY: {
    label: "In Stock",
    color: "#059669",
    bg: "#ECFDF5",
    border: "rgba(16, 185, 129, 0.2)",
    Icon: CheckCircleOutlineRoundedIcon,
  },
  LOW: {
    label: "Low Stock",
    color: "#D97706",
    bg: "#FFFBEB",
    border: "rgba(217, 119, 6, 0.2)",
    Icon: WarningAmberRoundedIcon,
  },
  DEPLETED: {
    label: "Out of Stock",
    color: "#DC2626",
    bg: "#FEF2F2",
    border: "rgba(239, 68, 68, 0.2)",
    Icon: ErrorOutlineRoundedIcon,
  },
};

const KPI_CARDS: {
  filter: StatusFilter;
  summaryKey: keyof InventorySummary;
  label: string;
  color: string;
  valueColor: string;
  bg: string;
  Icon: typeof CheckCircleOutlineRoundedIcon;
}[] = [
  {
    filter: "ALL",
    summaryKey: "total",
    label: "Total Items",
    color: "#2563EB",
    valueColor: "#0F172A",
    bg: "#EFF6FF",
    Icon: Inventory2OutlinedIcon,
  },
  {
    filter: "HEALTHY",
    summaryKey: "healthy",
    label: "Healthy Stock",
    color: STATUS_META.HEALTHY.color,
    valueColor: STATUS_META.HEALTHY.color,
    bg: STATUS_META.HEALTHY.bg,
    Icon: STATUS_META.HEALTHY.Icon,
  },
  {
    filter: "LOW",
    summaryKey: "low",
    label: "Low Level Warning",
    color: STATUS_META.LOW.color,
    valueColor: STATUS_META.LOW.color,
    bg: STATUS_META.LOW.bg,
    Icon: STATUS_META.LOW.Icon,
  },
  {
    filter: "DEPLETED",
    summaryKey: "depleted",
    label: "Depleted / Out",
    color: STATUS_META.DEPLETED.color,
    valueColor: STATUS_META.DEPLETED.color,
    bg: STATUS_META.DEPLETED.bg,
    Icon: STATUS_META.DEPLETED.Icon,
  },
];

// Most recently updated items first
const DEFAULT_SORT: CustomTableSort = { field: "updatedAt", direction: "desc" };
const DEFAULT_ROWS_PER_PAGE = 10;
const FILTER_DEBOUNCE_MS = 350;

// Matches the SearchBar so the filter row reads as one control group
const filterFieldSx = {
  "& .MuiOutlinedInput-root": {
    bgcolor: "#FFFFFF",
    borderRadius: "12px",
    fontSize: "0.825rem",
    fontWeight: 500,
    height: 38,
    "& fieldset": { borderColor: "#E2E8F0", borderWidth: "1.5px" },
    "&:hover fieldset": { borderColor: "#93C5FD", borderWidth: "1.5px" },
    "&.Mui-focused fieldset": { borderColor: "#2563EB", borderWidth: "1.5px" },
  },
  "& .MuiOutlinedInput-input": {
    py: 0,
    px: 1.5,
    fontSize: "0.825rem",
    "&::placeholder": { color: "#94A3B8", opacity: 1, fontWeight: 400 },
  },
};

export default function InventoryView() {
  const [inventory, setInventory] = useState<InventoryPage>({
    key: "",
    rows: [],
    total: 0,
  });
  const [summary, setSummary] = useState<InventorySummary | null>(null);
  const [error, setError] = useState("");

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_ROWS_PER_PAGE);
  const [sort, setSort] = useState<CustomTableSort>(DEFAULT_SORT);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  // Bumped to re-run the current query (refresh button, after adding an item)
  const [reloadToken, setReloadToken] = useState(0);

  const [open, setOpen] = useState(false);
  const [newItem, setNewItem] = useState({ name: "", unitOfMeasure: "" });
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const debouncedSearch = useDebouncedValue(searchQuery, FILTER_DEBOUNCE_MS);

  const query = useMemo(() => {
    const params = new URLSearchParams({
      page: String(page),
      size: String(rowsPerPage),
      sort: `${sort.field},${sort.direction}`,
    });
    if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
    if (statusFilter !== "ALL") params.set("status", statusFilter);
    return params.toString();
  }, [page, rowsPerPage, sort, debouncedSearch, statusFilter]);

  const requestKey = `${query}#${reloadToken}`;
  // Loading is derived: the page on screen belongs to an older request
  const loading = inventory.key !== requestKey;

  useEffect(() => {
    const controller = new AbortController();

    fetch(`/api/inventory/current?${query}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch inventory data");
        return res.json();
      })
      .then((data) => {
        const rows: InventoryItem[] = data.content ?? [];
        const total: number = data.totalElements ?? 0;
        const lastPage = Math.max(0, (data.totalPages ?? 1) - 1);
        setInventory({ key: requestKey, rows, total });
        // The result set shrank underneath us: step back to the last page that exists
        if (rows.length === 0 && total > 0) setPage((prev) => Math.min(prev, lastPage));
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : "An error occurred");
        setInventory((prev) => ({ ...prev, key: requestKey }));
      });

    return () => controller.abort();
  }, [query, requestKey]);

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/inventory/summary", { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch inventory summary");
        return res.json();
      })
      .then((data: InventorySummary) => setSummary(data))
      .catch((err) => {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : "An error occurred");
      });

    return () => controller.abort();
  }, [reloadToken]);

  const reloadInventory = () => setReloadToken((token) => token + 1);

  // Every filter change starts again from the first page
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setPage(0);
  };

  const handleStatusChange = (value: StatusFilter) => {
    setStatusFilter(value);
    setPage(0);
  };

  const handleSortChange = (next: CustomTableSort) => {
    setSort(next);
    setPage(0);
  };

  const handleRowsPerPageChange = (next: number) => {
    setRowsPerPage(next);
    setPage(0);
  };

  const hasActiveFilters = searchQuery !== "" || statusFilter !== "ALL";

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("ALL");
    setPage(0);
  };

  const handleAddItem = async () => {
    if (!newItem.name || !newItem.unitOfMeasure) {
      setError("Please fill in all fields");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      const res = await fetch("/api/inventory/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newItem.name,
          unitOfMeasure: newItem.unitOfMeasure,
        }),
      });
      if (!res.ok) throw new Error("Failed to add item");

      setSuccessMsg("Item added successfully!");
      setOpen(false);
      setNewItem({ name: "", unitOfMeasure: "" });
      setPage(0);
      reloadInventory();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add item");
    } finally {
      setSubmitting(false);
    }
  };

  const columns: CustomTableColumn[] = [
    {
      field: "itemName",
      headerName: "Item Name",
      flex: 1.5,
      minWidth: 200,
      renderCell: (params) => (
        <Typography
          sx={{
            fontSize: "0.875rem",
            fontWeight: 700,
            color: "#0F172A",
            lineHeight: 1.2,
          }}
        >
          {params.value}
        </Typography>
      ),
    },
    {
      field: "unitOfMeasure",
      headerName: "Unit",
      flex: 0.6,
      minWidth: 100,
      renderCell: (params) => (
        <Chip
          label={params.value}
          size="small"
          sx={{
            bgcolor: "#F8FAFC",
            color: "#334155",
            fontWeight: 700,
            fontSize: "0.725rem",
            height: 24,
            borderRadius: "6px",
            border: "1px solid #E2E8F0",
            boxShadow: "none",
          }}
        />
      ),
    },
    {
      field: "currentStock",
      headerName: "Current Stock",
      flex: 1,
      minWidth: 140,
      align: "right",
      renderCell: (params) => (
        <Typography
          sx={{
            fontWeight: 800,
            fontSize: "0.925rem",
            color: STATUS_META[params.row.status as StockStatus]?.color,
            lineHeight: 1.2,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {Number(params.value).toLocaleString("en-US", {
            maximumFractionDigits: 2,
          })}
        </Typography>
      ),
    },
    {
      field: "status",
      headerName: "Status",
      flex: 0.9,
      minWidth: 130,
      sortable: false,
      mobileSlot: "badge",
      renderCell: (params) => {
        const meta = STATUS_META[params.value as StockStatus];
        if (!meta) return <Typography sx={{ color: "#94A3B8" }}>-</Typography>;
        return (
          <Chip
            icon={<meta.Icon style={{ fontSize: 14, color: meta.color }} />}
            label={meta.label}
            size="small"
            sx={{
              bgcolor: meta.bg,
              color: meta.color,
              fontWeight: 700,
              fontSize: "0.75rem",
              height: 24,
              border: `1px solid ${meta.border}`,
              boxShadow: "none",
            }}
          />
        );
      },
    },
    {
      field: "updatedAt",
      headerName: "Last Updated",
      flex: 1.2,
      minWidth: 170,
      renderCell: (params) => {
        if (!params.value)
          return <Typography sx={{ color: "#94A3B8" }}>-</Typography>;
        return (
          <Typography
            sx={{ fontSize: "0.825rem", color: "#64748B", fontWeight: 500 }}
          >
            {formatDateTime(params.value)}
          </Typography>
        );
      },
    },
    {
      field: "actions",
      headerName: "Bin Card",
      sortable: false,
      width: 110,
      align: "center",
      mobileSlot: "footer",
      renderCell: (params) => (
        <Tooltip title={`View Bin Card ledger for ${params.row.itemName}`}>
          <Button
            component={Link}
            href={`/dashboard/bin-cards/material?materialId=${params.row.itemId}`}
            size="small"
            variant="outlined"
            sx={{
              borderRadius: "8px",
              borderColor: "#CBD5E1",
              color: "#2563EB",
              textTransform: "none",
              fontWeight: 700,
              fontSize: "0.75rem",
              py: 0.3,
              px: 1.2,
              boxShadow: "none",
              "&:hover": {
                borderColor: "#2563EB",
                bgcolor: "#EFF6FF",
                boxShadow: "none",
              },
            }}
          >
            View
          </Button>
        </Tooltip>
      ),
    },
  ];

  const filterToolbar = (
    <Box
      sx={{
        display: "grid",
        gap: 1.25,
        alignItems: "center",
        gridTemplateColumns: {
          xs: "minmax(0, 1fr) 38px",
          md: "minmax(0, 1fr) 180px 38px",
        },
        gridTemplateAreas: {
          xs: `"search search" "status clear"`,
          md: `"search status clear"`,
        },
      }}
    >
      <Box sx={{ gridArea: "search", display: "flex" }}>
        <SearchBar
          placeholder="Search by material name..."
          value={searchQuery}
          onChange={handleSearchChange}
          maxWidth="100%"
        />
      </Box>

      <TextField
        select
        size="small"
        value={statusFilter}
        onChange={(e) => handleStatusChange(e.target.value as StatusFilter)}
        slotProps={{ htmlInput: { "aria-label": "Filter by status" } }}
        sx={{
          ...filterFieldSx,
          gridArea: "status",
          "& .MuiSelect-select": { display: "flex", alignItems: "center" },
        }}
      >
        <MenuItem value="ALL" sx={{ fontSize: "0.825rem" }}>
          All statuses
        </MenuItem>
        {(Object.keys(STATUS_META) as StockStatus[]).map((status) => (
          <MenuItem key={status} value={status} sx={{ fontSize: "0.825rem" }}>
            <Box
              component="span"
              sx={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                bgcolor: STATUS_META[status].color,
                mr: 1,
                flexShrink: 0,
              }}
            />
            {STATUS_META[status].label}
          </MenuItem>
        ))}
      </TextField>

      <Tooltip title="Clear filters">
        {/* span keeps the tooltip working while the button is disabled */}
        <Box component="span" sx={{ gridArea: "clear", display: "flex" }}>
          <IconButton
            aria-label="Clear filters"
            onClick={clearFilters}
            disabled={!hasActiveFilters}
            sx={{
              width: 38,
              height: 38,
              border: "1.5px solid #E2E8F0",
              borderRadius: "12px",
              color: "#2563EB",
              "&:hover": { bgcolor: "#EFF6FF", borderColor: "#93C5FD" },
            }}
          >
            <FilterAltOffOutlinedIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>
      </Tooltip>
    </Box>
  );

  return (
    <Box
      sx={{
        width: "100%",
        // One screen tall on laptops, so the table scrolls instead of the page
        height: { xs: "auto", md: "calc(100vh - 48px)" },
        display: "flex",
        flexDirection: "column",
        gap: 2.5,
      }}
    >
      {/* Top Header */}
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          justifyContent: "space-between",
          alignItems: { xs: "stretch", sm: "center" },
          gap: 1.5,
        }}
      >
        <Box>
          <Typography
            sx={{
              fontWeight: 800,
              color: "#0F172A",
              letterSpacing: "-0.02em",
              lineHeight: 1.2,
              fontSize: { xs: "1.5rem", sm: "2.125rem" },
            }}
            variant="h4"
          >
            Inventory Storage
          </Typography>
          <Typography
            variant="body2"
            sx={{ color: "#64748B", mt: 0.5, fontWeight: 500 }}
          >
            Real-time material stock levels, reorder thresholds & warehouse bin
            tracking.
          </Typography>
        </Box>

        <Box
          sx={{ display: "flex", alignItems: "center", gap: 1.5, flexShrink: 0 }}
        >
          <Tooltip title="Refresh Inventory">
            <IconButton
              onClick={reloadInventory}
              sx={{
                bgcolor: "#FFFFFF",
                border: "1px solid #E2E8F0",
                borderRadius: "10px",
                width: 40,
                height: 40,
                color: "#475569",
                boxShadow: "none",
                "&:hover": { bgcolor: "#F8FAFC", color: "#0F172A" },
              }}
            >
              <RefreshIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </Tooltip>

          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => setOpen(true)}
            sx={{
              borderRadius: "10px",
              bgcolor: "#2563EB",
              fontWeight: 700,
              textTransform: "none",
              px: 2.25,
              height: 40,
              flexGrow: { xs: 1, sm: 0 },
              boxShadow: "none",
              "&:hover": {
                bgcolor: "#1D4ED8",
                boxShadow: "none",
              },
            }}
          >
            Add New Item
          </Button>
        </Box>
      </Box>

      {/* Global Alert */}
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError("")}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert severity="error" variant="filled" onClose={() => setError("")}>
          {error}
        </Alert>
      </Snackbar>

      {/* KPI Overview Cards (click to filter by status) */}
      <Grid container spacing={{ xs: 1.5, md: 2 }}>
        {KPI_CARDS.map((card) => (
          <Grid key={card.filter} size={{ xs: 6, md: 3 }}>
            <Card
              elevation={0}
              onClick={() => handleStatusChange(card.filter)}
              sx={{
                p: { xs: 1.5, sm: 2 },
                height: "100%",
                borderRadius: "16px",
                border:
                  statusFilter === card.filter
                    ? `2px solid ${card.color}`
                    : "1px solid #E2E8F0",
                bgcolor: "#FFFFFF",
                cursor: "pointer",
                boxShadow: "none",
                transition: "border-color 0.15s ease",
                "&:hover": {
                  borderColor: card.color,
                  boxShadow: "none",
                },
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <Box>
                  <Typography
                    variant="caption"
                    sx={{
                      color: card.color,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                    }}
                  >
                    {card.label}
                  </Typography>
                  <Typography
                    variant="h4"
                    sx={{
                      fontWeight: 800,
                      color: card.valueColor,
                      mt: 0.5,
                      fontSize: { xs: "1.5rem", sm: "2.125rem" },
                    }}
                  >
                    {summary ? summary[card.summaryKey] : "–"}
                  </Typography>
                </Box>
                <Avatar
                  sx={{
                    display: { xs: "none", sm: "flex" },
                    bgcolor: card.bg,
                    color: card.color,
                    width: 42,
                    height: 42,
                    borderRadius: "12px",
                    boxShadow: "none",
                  }}
                >
                  <card.Icon sx={{ fontSize: 22 }} />
                </Avatar>
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Main Table Container: takes the rest of the screen on laptops, grows with its cards on mobile */}
      <Box
        sx={{
          flex: { md: "1 1 0" },
          minHeight: { md: 240 },
        }}
      >
        <CustomTable
          rows={inventory.rows}
          columns={columns}
          loading={loading}
          getRowId={(row) => row.itemId}
          toolbar={filterToolbar}
          emptyMessage={hasActiveFilters ? "No items match these filters" : "No Records Found"}
          pagination={{
            page,
            rowsPerPage,
            totalRows: inventory.total,
            onPageChange: setPage,
            onRowsPerPageChange: handleRowsPerPageChange,
          }}
          sort={sort}
          onSortChange={handleSortChange}
        />
      </Box>

      {/* Add Item Dialog */}
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: "16px",
              boxShadow: "none",
              border: "1px solid #E2E8F0",
            },
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: "#0F172A" }}>
          Add New Item
        </DialogTitle>
        <DialogContent>
          <Box
            sx={{ mt: 1, display: "flex", flexDirection: "column", gap: 2.5 }}
          >
            <TextField
              label="Item Name"
              variant="outlined"
              fullWidth
              value={newItem.name}
              onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
              placeholder="e.g. Aluminum Sheets, Quarry Dust"
            />
            <TextField
              select
              label="Unit of Measure"
              variant="outlined"
              fullWidth
              value={newItem.unitOfMeasure}
              onChange={(e) =>
                setNewItem({ ...newItem, unitOfMeasure: e.target.value })
              }
            >
              {[
                "KG",
                "GRAMS",
                "LITERS",
                "MILLILITERS",
                "PIECES",
                "METERS",
                "CENTIMETERS",
                "UNITS",
                "BOXES",
                "PACKS",
                "ROLLS",
                "BAGS",
                "CUBES",
              ].map((unit) => (
                <MenuItem key={unit} value={unit}>
                  {unit}
                </MenuItem>
              ))}
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button
            onClick={() => setOpen(false)}
            color="inherit"
            sx={{ fontWeight: 600, textTransform: "none", boxShadow: "none" }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAddItem}
            variant="contained"
            disabled={submitting || !newItem.name || !newItem.unitOfMeasure}
            sx={{
              fontWeight: 700,
              textTransform: "none",
              bgcolor: "#2563EB",
              borderRadius: "8px",
              boxShadow: "none",
              "&:hover": { bgcolor: "#1D4ED8", boxShadow: "none" },
            }}
          >
            {submitting ? "Adding..." : "Add Item"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!successMsg}
        autoHideDuration={4000}
        onClose={() => setSuccessMsg("")}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          severity="success"
          variant="filled"
          onClose={() => setSuccessMsg("")}
        >
          {successMsg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
