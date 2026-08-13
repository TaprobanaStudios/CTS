"use client";

import React, { useState, useMemo } from "react";
import {
  Box,
  Typography,
  Paper,
  Chip,
  Button,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  TableSortLabel,
  Pagination,
  Tabs,
  Tab,
  CircularProgress,
  IconButton,
  Tooltip,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import SearchBar from "../../components/search/SearchBar";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import ReportProblemOutlinedIcon from "@mui/icons-material/ReportProblemOutlined";

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

export interface MaterialUsageDto {
  itemId: string;
  itemName: string;
  amount: number;
}

export interface ProductUsageDto {
  productName: string;
  amount: number;
}

export interface ProductionLedgerRow {
  id: string;
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
  workerName?: string;
  remarks: string;
  type: "PRODUCTION" | "CONSUMPTION";
}

export interface ProductItem {
  productId: string;
  productName: string;
  unitOfMeasure: string;
  currentStock: number;
}

interface ProductionBinCardDetailViewProps {
  selectedProductId: string;
  activeProduct: ProductItem | null;
  ledgerRows: ProductionLedgerRow[];
  loading: boolean;
  onBack: () => void;
  onRefresh: () => void;
}

export default function ProductionBinCardDetailView({
  selectedProductId,
  activeProduct,
  ledgerRows,
  loading,
  onBack,
  onRefresh,
}: ProductionBinCardDetailViewProps) {
  const isAllProducts = selectedProductId === "all" || !activeProduct;

  // Detail view search & filters
  const [detailSearchQuery, setDetailSearchQuery] = useState("");
  const [movementTab, setMovementTab] = useState<
    "all" | "in" | "out" | "damage"
  >("all");

  // Table pagination & sorting
  const [page, setPage] = useState(1);
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [orderBy, setOrderBy] = useState<string>("date");

  const handleRequestSort = (property: string) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  // Helper to extract structured list of inputs for a row
  const getRowInputs = (row: ProductionLedgerRow) => {
    if (row.type === "CONSUMPTION") {
      return [];
    }
    const items: { name: string; amount: number | string; isProduct: boolean }[] = [];
    if (row.materials && Array.isArray(row.materials)) {
      row.materials.forEach((m) => {
        if (m.itemName && m.amount !== undefined && m.amount !== null) {
          items.push({
            name: m.itemName,
            amount: m.amount,
            isProduct: false,
          });
        }
      });
    }
    if (row.productUsages && Array.isArray(row.productUsages)) {
      row.productUsages.forEach((pu) => {
        if (pu.productName && pu.amount !== undefined && pu.amount !== null) {
          items.push({
            name: pu.productName,
            amount: pu.amount,
            isProduct: true,
          });
        }
      });
    }
    return items;
  };

  // Helper for inputs summary text (for search query filtering)
  const getInputsSummary = (row: ProductionLedgerRow) => {
    if (row.type === "CONSUMPTION") {
      return "-";
    }
    const inputs = getRowInputs(row);
    if (inputs.length === 0) return "-";
    return inputs.map((i) => `${i.name}: ${i.amount}`).join(", ");
  };

  // Filtered & sorted ledger rows
  const filteredLedgerRows = useMemo(() => {
    return ledgerRows
      .filter((row) => {
        if (movementTab === "in" && (!row.qtyIn || row.qtyIn <= 0))
          return false;
        if (movementTab === "out" && (!row.qtyOut || row.qtyOut <= 0))
          return false;
        if (movementTab === "damage" && (!row.damage || row.damage <= 0))
          return false;

        if (detailSearchQuery.trim()) {
          const q = detailSearchQuery.toLowerCase();
          const matchesProd = row.productName.toLowerCase().includes(q);
          const matchesStatus = row.status?.toLowerCase().includes(q);
          const matchesRemarks = row.remarks?.toLowerCase().includes(q);
          const matchesWorker = row.workerName?.toLowerCase().includes(q);
          const matchesInputs = getInputsSummary(row).toLowerCase().includes(q);
          if (
            !matchesProd &&
            !matchesStatus &&
            !matchesRemarks &&
            !matchesWorker &&
            !matchesInputs
          )
            return false;
        }

        return true;
      })
      .sort((a, b) => {
        let valA: any = a[orderBy as keyof ProductionLedgerRow];
        let valB: any = b[orderBy as keyof ProductionLedgerRow];

        if (orderBy === "date") {
          valA = new Date(a.date).getTime();
          valB = new Date(b.date).getTime();
        }

        if (valA < valB) return order === "asc" ? -1 : 1;
        if (valA > valB) return order === "asc" ? 1 : -1;
        return 0;
      });
  }, [ledgerRows, movementTab, detailSearchQuery, order, orderBy]);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
      {/* Back Navigation Bar */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 2,
        }}
      >
        <Button
          variant="outlined"
          disableElevation
          startIcon={<ArrowBackIcon sx={{ fontSize: 18 }} />}
          onClick={onBack}
          sx={{
            borderRadius: "10px",
            borderColor: "#CBD5E1",
            color: "#334155",
            fontWeight: 700,
            fontSize: "0.825rem",
            textTransform: "none",
            px: 2,
            height: 38,
            bgcolor: "#FFFFFF",
            boxShadow: "none",
            "&:hover": {
              bgcolor: "#F8FAFC",
              borderColor: "#2563EB",
              boxShadow: "none",
            },
          }}
        >
          Back to All Bin Cards
        </Button>

        <Tooltip title="Refresh ledger">
          <IconButton
            onClick={onRefresh}
            size="small"
            sx={{
              bgcolor: "#FFFFFF",
              border: "1px solid #E2E8F0",
              borderRadius: "10px",
              width: 38,
              height: 38,
              color: "#475569",
              boxShadow: "none",
              "&:hover": {
                bgcolor: "#F8FAFC",
                borderColor: "#CBD5E1",
                color: "#0F172A",
                boxShadow: "none",
              },
            }}
          >
            <RefreshIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Active Product Header Paper */}
      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          px: 3,
          bgcolor: "#FFFFFF",
          border: "1px solid #E2E8F0",
          borderRadius: "16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 3,
          boxShadow: "none",
        }}
      >
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Typography
              variant="h4"
              sx={{ color: "#0F172A", m: 0, lineHeight: 1.1, fontWeight: 800 }}
            >
              {activeProduct
                ? activeProduct.productName
                : "All Products Combined Ledger"}
            </Typography>
            {activeProduct && (
              <Chip
                icon={
                  activeProduct.currentStock > 0 ? (
                    <CheckCircleIcon
                      style={{ color: "#10B981", fontSize: 13 }}
                    />
                  ) : (
                    <ErrorIcon style={{ color: "#EF4444", fontSize: 13 }} />
                  )
                }
                label={
                  activeProduct.currentStock > 0 ? "In Stock" : "Out of Stock"
                }
                sx={{
                  bgcolor:
                    activeProduct.currentStock > 0 ? "#ECFDF5" : "#FEF2F2",
                  color: activeProduct.currentStock > 0 ? "#065F46" : "#991B1B",
                  fontWeight: 700,
                  fontSize: "0.7rem",
                  height: 24,
                  border: "1px solid",
                  borderColor:
                    activeProduct.currentStock > 0 ? "#A7F3D0" : "#FECACA",
                  boxShadow: "none",
                }}
              />
            )}
          </Box>
          <Typography
            variant="body2"
            sx={{ color: "#64748B", fontSize: "0.85rem" }}
          >
            {activeProduct
              ? `SKU ID: PROD-${activeProduct.productId.toUpperCase()}`
              : "Unified record of all manufacturing output, material deductions, component usage, and scrap"}
          </Typography>
        </Box>

        {/* Current Balance widget */}
        {!isAllProducts && activeProduct && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              p: 1.5,
              px: 2.5,
              bgcolor: "#F8FAFC",
              borderRadius: "14px",
              border: "1px solid #E2E8F0",
              minWidth: 160,
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
                  sx={{
                    fontWeight: 800,
                    color:
                      activeProduct.currentStock <= 0 ? "#EF4444" : "#0F172A",
                    lineHeight: 1,
                  }}
                >
                  {activeProduct.currentStock}
                </Typography>
                <Typography
                  variant="subtitle2"
                  sx={{ color: "#64748B", fontWeight: 700 }}
                >
                  {activeProduct.unitOfMeasure}
                </Typography>
              </Box>
            </Box>
          </Box>
        )}
      </Paper>

      {/* Ledger Table Container */}
      <Paper
        elevation={0}
        sx={{
          display: "flex",
          flexDirection: "column",
          bgcolor: "#FFFFFF",
          border: "1px solid #E2E8F0",
          borderRadius: "16px",
          overflow: "hidden",
          boxShadow: "none",
        }}
      >
        {/* Toolbar: Tabs & Search */}
        <Box
          sx={{
            p: 2,
            px: 2.5,
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            justifyContent: "space-between",
            alignItems: { xs: "stretch", sm: "center" },
            gap: 2,
            borderBottom: "1px solid #F1F5F9",
          }}
        >
          <Tabs
            value={movementTab}
            onChange={(_, v) => setMovementTab(v)}
            sx={{
              minHeight: 36,
              bgcolor: "#F1F5F9",
              borderRadius: "10px",
              p: 0.5,
              "& .MuiTabs-indicator": {
                bgcolor: "#FFFFFF",
                height: "100%",
                borderRadius: "8px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                zIndex: 0,
              },
            }}
          >
            <Tab
              value="all"
              label="All Movements"
              sx={{
                minHeight: 32,
                py: 0,
                px: 2,
                zIndex: 1,
                fontSize: "0.8rem",
                fontWeight: 600,
                textTransform: "none",
                color: "#64748B",
                "&.Mui-selected": { color: "#0F172A", fontWeight: 700 },
              }}
            />
            <Tab
              value="in"
              label="Production In (+)"
              sx={{
                minHeight: 32,
                py: 0,
                px: 2,
                zIndex: 1,
                fontSize: "0.8rem",
                fontWeight: 600,
                textTransform: "none",
                color: "#64748B",
                "&.Mui-selected": { color: "#059669", fontWeight: 700 },
              }}
            />
            <Tab
              value="out"
              label="Consumed / Out (-)"
              sx={{
                minHeight: 32,
                py: 0,
                px: 2,
                zIndex: 1,
                fontSize: "0.8rem",
                fontWeight: 600,
                textTransform: "none",
                color: "#64748B",
                "&.Mui-selected": { color: "#EA580C", fontWeight: 700 },
              }}
            />
            <Tab
              value="damage"
              label="Damages (-)"
              sx={{
                minHeight: 32,
                py: 0,
                px: 2,
                zIndex: 1,
                fontSize: "0.8rem",
                fontWeight: 600,
                textTransform: "none",
                color: "#64748B",
                "&.Mui-selected": { color: "#DC2626", fontWeight: 700 },
              }}
            />
          </Tabs>

          <SearchBar
            value={detailSearchQuery}
            onChange={setDetailSearchQuery}
            placeholder="Search date, product, status, inputs..."
            maxWidth={{ xs: "100%", sm: 320 }}
          />
        </Box>

        {/* Table */}
        <TableContainer sx={{ minHeight: 300 }}>
          <Table
            stickyHeader
            aria-label="production bin card table"
            sx={{
              "& .MuiTableCell-root": {
                borderRight: "1px solid #dfe2e6ff",
                borderBottom: "1px solid #dfe2e6ff !important",
                px: 1,
              },
              "& .MuiTableHead-root .MuiTableCell-root": {
                borderRight: "1px solid #dfe2e6ff",
                borderBottom: "1px solid #dfe2e6ff !important",
                borderTop: "1px solid #dfe2e6ff",
                bgcolor: "#F8FAFC",
                color: "#475569",
                fontWeight: 700,
                fontSize: "0.75rem",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                whiteSpace: "nowrap",
                py: 1.2,
              },
              "& .MuiTableHead-root .MuiTableRow-root:first-of-type .MuiTableCell-root": {
                top: 0,
                zIndex: 3,
              },
              "& .MuiTableHead-root .MuiTableRow-root:nth-of-type(2) .MuiTableCell-root": {
                top: "37px",
                zIndex: 2,
                bgcolor: "#F8FAFC",
                fontSize: "0.7rem",
                py: 0.8,
              },
            }}
          >
            <TableHead>
              <TableRow>
                <TableCell align="center" rowSpan={2}>
                  <TableSortLabel
                    active={orderBy === "date"}
                    direction={orderBy === "date" ? order : "asc"}
                    onClick={() => handleRequestSort("date")}
                  >
                    Date
                  </TableSortLabel>
                </TableCell>

                {isAllProducts && (
                  <TableCell align="center" rowSpan={2}>
                    Product
                  </TableCell>
                )}

                <TableCell align="center" rowSpan={2}>
                  Status
                </TableCell>

                <TableCell align="center" rowSpan={2}>
                  O/S
                </TableCell>

                <TableCell align="center" rowSpan={2}>
                  In (+)
                </TableCell>

                <TableCell align="center" rowSpan={2}>
                  Out / Consumed (-)
                </TableCell>

                <TableCell align="center" rowSpan={2}>
                  Damages (-)
                </TableCell>

                <TableCell align="center" rowSpan={2}>
                  Closing Stock
                </TableCell>

                <TableCell align="center" colSpan={2}>
                  Inputs Used
                </TableCell>

                <TableCell align="center" rowSpan={2} sx={{ borderRight: "none !important" }}>
                  Remarks
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell align="center">Name</TableCell>
                <TableCell align="center">Amount</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={isAllProducts ? 11 : 10}
                    align="center"
                    sx={{ py: 8 }}
                  >
                    <CircularProgress size={30} />
                    <Typography
                      variant="body2"
                      sx={{ mt: 1.5, color: "#64748B" }}
                    >
                      Loading ledger transactions...
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : filteredLedgerRows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={isAllProducts ? 11 : 10}
                    align="center"
                    sx={{ py: 8 }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 1,
                      }}
                    >
                      <ReceiptLongIcon
                        sx={{ fontSize: 40, color: "#CBD5E1" }}
                      />
                      <Typography
                        variant="subtitle1"
                        sx={{ fontWeight: 700, color: "#334155" }}
                      >
                        No Production Records Found
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                filteredLedgerRows
                  .slice((page - 1) * 10, (page - 1) * 10 + 10)
                  .map((row) => {
                    const isInflow = row.qtyIn > 0;
                    const isOutflow = row.qtyOut > 0;
                    const isDamaged = row.damage > 0;
                    const stConfig =
                      STATUS_CONFIG[row.status] || STATUS_CONFIG.STORED;
                    const rowInputs = getRowInputs(row);
                    const rowCount = Math.max(1, rowInputs.length);

                    return (
                      <React.Fragment key={row.id}>
                        {Array.from({ length: rowCount }).map((_, subIdx) => {
                          const isFirstSub = subIdx === 0;

                          return (
                            <TableRow
                              key={`${row.id}-sub-${subIdx}`}
                              hover
                              sx={{
                                "&:hover": { bgcolor: "#F8FAFC !important" },
                                transition: "background-color 0.15s ease",
                              }}
                            >
                              {/* Date */}
                              {isFirstSub && (
                                <TableCell
                                  align="center"
                                  rowSpan={rowCount}
                                  sx={{
                                    py: 1.8,
                                    fontSize: "0.875rem",
                                    color: "#334155",
                                    fontWeight: 500,
                                    whiteSpace: "nowrap",
                                    verticalAlign: "middle",
                                  }}
                                >
                                  {new Date(row.date).toLocaleDateString(
                                    "en-US",
                                    {
                                      year: "numeric",
                                      month: "short",
                                      day: "numeric",
                                    },
                                  )}
                                </TableCell>
                              )}

                              {/* Product Name (All mode) */}
                              {isAllProducts && isFirstSub && (
                                <TableCell
                                  align="center"
                                  rowSpan={rowCount}
                                  sx={{
                                    py: 1.8,
                                    fontSize: "0.875rem",
                                    color: "#0F172A",
                                    fontWeight: 600,
                                    whiteSpace: "nowrap",
                                    verticalAlign: "middle",
                                  }}
                                >
                                  {row.productName}
                                </TableCell>
                              )}

                              {/* Status Chip */}
                              {isFirstSub && (
                                <TableCell
                                  align="center"
                                  rowSpan={rowCount}
                                  sx={{
                                    py: 1.8,
                                    whiteSpace: "nowrap",
                                    verticalAlign: "middle",
                                  }}
                                >
                                  <Chip
                                    label={stConfig.label}
                                    size="small"
                                    sx={{
                                      bgcolor: stConfig.bg,
                                      color: stConfig.color,
                                      fontWeight: 700,
                                      fontSize: "0.75rem",
                                      border: `1px solid ${stConfig.border}`,
                                      height: 24,
                                      boxShadow: "none",
                                    }}
                                  />
                                </TableCell>
                              )}

                              {/* O/S */}
                              {isFirstSub && (
                                <TableCell
                                  align="center"
                                  rowSpan={rowCount}
                                  sx={{
                                    py: 1.8,
                                    fontSize: "0.875rem",
                                    color: "#64748B",
                                    fontWeight: 500,
                                    verticalAlign: "middle",
                                  }}
                                >
                                  {row.openingStock}
                                </TableCell>
                              )}

                              {/* In */}
                              {isFirstSub && (
                                <TableCell
                                  align="center"
                                  rowSpan={rowCount}
                                  sx={{
                                    py: 1.8,
                                    whiteSpace: "nowrap",
                                    verticalAlign: "middle",
                                  }}
                                >
                                  {isInflow ? (
                                    <Chip
                                      icon={
                                        <TrendingUpIcon
                                          style={{
                                            color: "#059669",
                                            fontSize: 14,
                                          }}
                                        />
                                      }
                                      label={`+${row.qtyIn}`}
                                      size="small"
                                      sx={{
                                        bgcolor: "#ECFDF5",
                                        color: "#059669",
                                        fontWeight: 700,
                                        fontSize: "0.8rem",
                                        border:
                                          "1px solid rgba(16, 185, 129, 0.2)",
                                        height: 24,
                                        boxShadow: "none",
                                      }}
                                    />
                                  ) : (
                                    "-"
                                  )}
                                </TableCell>
                              )}

                              {/* Out */}
                              {isFirstSub && (
                                <TableCell
                                  align="center"
                                  rowSpan={rowCount}
                                  sx={{
                                    py: 1.8,
                                    whiteSpace: "nowrap",
                                    verticalAlign: "middle",
                                  }}
                                >
                                  {isOutflow ? (
                                    <Chip
                                      icon={
                                        <TrendingDownIcon
                                          style={{
                                            color: "#EA580C",
                                            fontSize: 14,
                                          }}
                                        />
                                      }
                                      label={`-${row.qtyOut}`}
                                      size="small"
                                      sx={{
                                        bgcolor: "#FFF7ED",
                                        color: "#EA580C",
                                        fontWeight: 700,
                                        fontSize: "0.8rem",
                                        border:
                                          "1px solid rgba(234, 88, 12, 0.2)",
                                        height: 24,
                                        boxShadow: "none",
                                      }}
                                    />
                                  ) : (
                                    "-"
                                  )}
                                </TableCell>
                              )}

                              {/* Damage */}
                              {isFirstSub && (
                                <TableCell
                                  align="center"
                                  rowSpan={rowCount}
                                  sx={{
                                    py: 1.8,
                                    whiteSpace: "nowrap",
                                    verticalAlign: "middle",
                                  }}
                                >
                                  {isDamaged ? (
                                    <Chip
                                      icon={
                                        <ReportProblemOutlinedIcon
                                          style={{
                                            color: "#DC2626",
                                            fontSize: 14,
                                          }}
                                        />
                                      }
                                      label={`-${row.damage}`}
                                      size="small"
                                      sx={{
                                        bgcolor: "#FEF2F2",
                                        color: "#DC2626",
                                        fontWeight: 700,
                                        fontSize: "0.8rem",
                                        border:
                                          "1px solid rgba(239, 68, 68, 0.2)",
                                        height: 24,
                                        boxShadow: "none",
                                      }}
                                    />
                                  ) : (
                                    "-"
                                  )}
                                </TableCell>
                              )}

                              {/* Closing Balance */}
                              {isFirstSub && (
                                <TableCell
                                  align="center"
                                  rowSpan={rowCount}
                                  sx={{ py: 1.8, verticalAlign: "middle" }}
                                >
                                  <Typography
                                    variant="body2"
                                    sx={{
                                      fontWeight: 800,
                                      color: "#0F172A",
                                      fontSize: "0.9rem",
                                    }}
                                  >
                                    {row.closingStock}
                                  </Typography>
                                </TableCell>
                              )}

                              {/* Inputs Used - Name & Amount */}
                              {rowInputs.length === 0 ? (
                                isFirstSub && (
                                  <>
                                    <TableCell
                                      align="center"
                                      rowSpan={rowCount}
                                      sx={{
                                        py: 1.5,
                                        fontSize: "0.8125rem",
                                        color: "#94A3B8",
                                        minWidth: 100,
                                        verticalAlign: "middle",
                                      }}
                                    >
                                      -
                                    </TableCell>
                                    <TableCell
                                      align="center"
                                      rowSpan={rowCount}
                                      sx={{
                                        py: 1.5,
                                        fontSize: "0.8125rem",
                                        color: "#94A3B8",
                                        minWidth: 70,
                                        verticalAlign: "middle",
                                      }}
                                    >
                                      -
                                    </TableCell>
                                  </>
                                )
                              ) : (
                                <>
                                  <TableCell
                                    align="center"
                                    sx={{
                                      py: 1.5,
                                      fontSize: "0.8125rem",
                                      fontWeight: 600,
                                      color: rowInputs[subIdx].isProduct
                                        ? "#2563EB"
                                        : "#334155",
                                      minWidth: 100,
                                      verticalAlign: "middle",
                                    }}
                                  >
                                    {rowInputs[subIdx].name}
                                  </TableCell>
                                  <TableCell
                                    align="center"
                                    sx={{
                                      py: 1.5,
                                      fontSize: "0.8125rem",
                                      fontWeight: 700,
                                      color: "#16A34A",
                                      minWidth: 70,
                                      verticalAlign: "middle",
                                    }}
                                  >
                                    {rowInputs[subIdx].amount}
                                  </TableCell>
                                </>
                              )}

                              {/* Remarks */}
                              {isFirstSub && (
                                <TableCell
                                  align="center"
                                  rowSpan={rowCount}
                                  sx={{
                                    py: 1.8,
                                    fontSize: "0.825rem",
                                    color: "#64748B",
                                    minWidth: 160,
                                    whiteSpace: "normal",
                                    verticalAlign: "middle",
                                    borderRight: "none !important",
                                  }}
                                >
                                  {row.remarks}
                                </TableCell>
                              )}
                            </TableRow>
                          );
                        })}
                      </React.Fragment>
                    );
                  })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination Footer */}
        {filteredLedgerRows.length > 0 && (
          <Box
            sx={{
              p: 1.5,
              px: 2.5,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderTop: "1px solid #E2E8F0",
              bgcolor: "#FFFFFF",
            }}
          >
            <Typography
              variant="body2"
              sx={{ color: "#64748B", fontSize: "0.85rem" }}
            >
              Showing {Math.min((page - 1) * 10 + 1, filteredLedgerRows.length)}{" "}
              - {Math.min(page * 10, filteredLedgerRows.length)} of{" "}
              {filteredLedgerRows.length} records
            </Typography>
            <Pagination
              count={Math.max(1, Math.ceil(filteredLedgerRows.length / 10))}
              page={page}
              onChange={(_, p) => setPage(p)}
              shape="rounded"
              color="primary"
              size="small"
            />
          </Box>
        )}
      </Paper>
    </Box>
  );
}
