"use client";

import React, { useState, useMemo } from "react";
import {
  Box,
  Typography,
  Paper,
  Chip,
  Button,
  TextField,
  InputAdornment,
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
import SearchIcon from "@mui/icons-material/Search";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import FactoryOutlinedIcon from "@mui/icons-material/FactoryOutlined";
import ReportProblemOutlinedIcon from "@mui/icons-material/ReportProblemOutlined";

export interface ProductionLedgerRow {
  id: string;
  date: string;
  productName: string;
  openingStock: number;
  qtyIn: number;
  qtyOut: number;
  damage: number;
  closingStock: number;
  workerName: string;
  remarks: string;
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
          const matchesWorker = row.workerName.toLowerCase().includes(q);
          const matchesRemarks = row.remarks.toLowerCase().includes(q);
          if (!matchesProd && !matchesWorker && !matchesRemarks) return false;
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
            borderRadius: "8px",
            borderColor: "#CBD5E1",
            color: "#334155",
            fontWeight: 600,
            fontSize: "0.825rem",
            textTransform: "none",
            px: 1.75,
            height: 36,
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
              borderRadius: "8px",
              width: 36,
              height: 36,
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
              sx={{ color: "#0F172A", m: 0, lineHeight: 1, fontWeight: 800 }}
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
                      style={{ color: "#10B981", fontSize: 12 }}
                    />
                  ) : (
                    <ErrorIcon style={{ color: "#EF4444", fontSize: 12 }} />
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
                  fontSize: "0.65rem",
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
              : "Aggregated production, scrap, and dispatch records for all manufactured items"}
          </Typography>
        </Box>

        {/* Current Balance widget (hidden for All Products Combined Ledger) */}
        {!isAllProducts && activeProduct && (
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
              borderRadius: "8px",
              p: 0.5,
              "& .MuiTabs-indicator": {
                bgcolor: "#e9e9e9ff",
                height: "100%",
                borderRadius: "6px",
                boxShadow: "none",
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
                "&.Mui-selected": { color: "#0F172A" },
              }}
            />
            <Tab
              value="in"
              label="Production In"
              sx={{
                minHeight: 32,
                py: 0,
                px: 2,
                zIndex: 1,
                fontSize: "0.8rem",
                fontWeight: 600,
                textTransform: "none",
                color: "#64748B",
                "&.Mui-selected": { color: "#059669" },
              }}
            />
            <Tab
              value="out"
              label="Out"
              sx={{
                minHeight: 32,
                py: 0,
                px: 2,
                zIndex: 1,
                fontSize: "0.8rem",
                fontWeight: 600,
                textTransform: "none",
                color: "#64748B",
                "&.Mui-selected": { color: "#EA580C" },
              }}
            />
            <Tab
              value="damage"
              label="Damage"
              sx={{
                minHeight: 32,
                py: 0,
                px: 2,
                zIndex: 1,
                fontSize: "0.8rem",
                fontWeight: 600,
                textTransform: "none",
                color: "#64748B",
                "&.Mui-selected": { color: "#DC2626" },
              }}
            />
          </Tabs>

          <TextField
            size="small"
            placeholder="Search"
            value={detailSearchQuery}
            onChange={(e) => setDetailSearchQuery(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start" sx={{ mr: 1 }}>
                    <SearchIcon
                      sx={{
                        fontSize: 17,
                        color: detailSearchQuery ? "#2563EB" : "#64748B",
                      }}
                    />
                  </InputAdornment>
                ),
              },
            }}
            sx={{
              maxWidth: { xs: "100%", sm: 300 },
              "& .MuiOutlinedInput-root": {
                borderRadius: "8px",
                bgcolor: "#F8FAFC",
                fontSize: "0.85rem",
                height: 36,
                boxShadow: "none",
                "& fieldset": { borderColor: "#E2E8F0" },
                "&:hover fieldset": { borderColor: "#CBD5E1" },
                "&.Mui-focused fieldset": { borderColor: "#2563EB" },
              },
            }}
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
              },
              "& .MuiTableCell-root:last-child": {
                borderRight: "none",
              },
              "& .MuiTableHead-root .MuiTableCell-root": {
                borderRight: "1px solid #dfe2e6ff",
                borderBottom: "1px solid #dfe2e6ff !important",
                borderTop: "1px solid #dfe2e6ff",
              },
              "& .MuiTableHead-root .MuiTableCell-root:last-child": {
                borderRight: "none",
              },
            }}
          >
            <TableHead>
              <TableRow>
                <TableCell
                  align="center"
                  sx={{
                    bgcolor: "#F8FAFC",
                    color: "#475569",
                    fontWeight: 700,
                    fontSize: "0.75rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    whiteSpace: "nowrap",
                    py: 1.5,
                  }}
                >
                  <TableSortLabel
                    active={orderBy === "date"}
                    direction={orderBy === "date" ? order : "asc"}
                    onClick={() => handleRequestSort("date")}
                  >
                    Date
                  </TableSortLabel>
                </TableCell>

                {isAllProducts && (
                  <TableCell
                    align="center"
                    sx={{
                      bgcolor: "#F8FAFC",
                      color: "#475569",
                      fontWeight: 700,
                      fontSize: "0.75rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      whiteSpace: "nowrap",
                      py: 1.5,
                    }}
                  >
                    Product
                  </TableCell>
                )}

                <TableCell
                  align="center"
                  sx={{
                    bgcolor: "#F8FAFC",
                    color: "#475569",
                    fontWeight: 700,
                    fontSize: "0.75rem",
                    textTransform: "uppercase",
                    whiteSpace: "nowrap",
                  }}
                >
                  O/S
                </TableCell>

                <TableCell
                  align="center"
                  sx={{
                    bgcolor: "#F8FAFC",
                    color: "#475569",
                    fontWeight: 700,
                    fontSize: "0.75rem",
                    textTransform: "uppercase",
                    whiteSpace: "nowrap",
                  }}
                >
                  In
                </TableCell>

                <TableCell
                  align="center"
                  sx={{
                    bgcolor: "#F8FAFC",
                    color: "#475569",
                    fontWeight: 700,
                    fontSize: "0.75rem",
                    textTransform: "uppercase",
                    whiteSpace: "nowrap",
                  }}
                >
                  Out
                </TableCell>

                <TableCell
                  align="center"
                  sx={{
                    bgcolor: "#F8FAFC",
                    color: "#475569",
                    fontWeight: 700,
                    fontSize: "0.75rem",
                    textTransform: "uppercase",
                    whiteSpace: "nowrap",
                  }}
                >
                  Damage
                </TableCell>

                <TableCell
                  align="center"
                  sx={{
                    bgcolor: "#F8FAFC",
                    color: "#475569",
                    fontWeight: 700,
                    fontSize: "0.75rem",
                    textTransform: "uppercase",
                    whiteSpace: "nowrap",
                  }}
                >
                  Closing Balance
                </TableCell>

                <TableCell
                  align="center"
                  sx={{
                    bgcolor: "#F8FAFC",
                    color: "#475569",
                    fontWeight: 700,
                    fontSize: "0.75rem",
                    textTransform: "uppercase",
                    whiteSpace: "nowrap",
                  }}
                >
                  Operator / Worker
                </TableCell>

                <TableCell
                  align="center"
                  sx={{
                    bgcolor: "#F8FAFC",
                    color: "#475569",
                    fontWeight: 700,
                    fontSize: "0.75rem",
                    textTransform: "uppercase",
                    whiteSpace: "nowrap",
                  }}
                >
                  Remarks / Reference
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={isAllProducts ? 9 : 8}
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
                    colSpan={isAllProducts ? 9 : 8}
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
                      <Typography variant="body2" sx={{ color: "#94A3B8" }}>
                        {activeProduct
                          ? `No batch movements recorded for ${activeProduct.productName} yet.`
                          : "No production records found."}
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

                    return (
                      <TableRow
                        key={row.id}
                        hover
                        sx={{
                          "&:hover": { bgcolor: "#F8FAFC !important" },
                          transition: "background-color 0.15s ease",
                        }}
                      >
                        {/* Date */}
                        <TableCell
                          align="center"
                          sx={{
                            py: 1.8,
                            fontSize: "0.875rem",
                            color: "#334155",
                            fontWeight: 500,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {new Date(row.date).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </TableCell>

                        {/* Product Name (All mode) */}
                        {isAllProducts && (
                          <TableCell
                            align="center"
                            sx={{
                              py: 1.8,
                              fontSize: "0.875rem",
                              color: "#1E293B",
                              fontWeight: 600,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {row.productName}
                          </TableCell>
                        )}

                        {/* O/S */}
                        <TableCell
                          align="center"
                          sx={{
                            py: 1.8,
                            fontSize: "0.875rem",
                            color: "#64748B",
                            fontWeight: 500,
                          }}
                        >
                          {row.openingStock}
                        </TableCell>

                        {/* In */}
                        <TableCell
                          align="center"
                          sx={{ py: 1.8, whiteSpace: "nowrap" }}
                        >
                          {isInflow ? (
                            <Chip
                              icon={
                                <TrendingUpIcon
                                  style={{ color: "#059669", fontSize: 15 }}
                                />
                              }
                              label={`+${row.qtyIn}`}
                              size="small"
                              sx={{
                                bgcolor: "#ECFDF5",
                                color: "#059669",
                                fontWeight: 700,
                                fontSize: "0.8rem",
                                border: "1px solid rgba(16, 185, 129, 0.2)",
                                height: 24,
                                boxShadow: "none",
                              }}
                            />
                          ) : (
                            "-"
                          )}
                        </TableCell>

                        {/* Out */}
                        <TableCell
                          align="center"
                          sx={{ py: 1.8, whiteSpace: "nowrap" }}
                        >
                          {isOutflow ? (
                            <Chip
                              icon={
                                <TrendingDownIcon
                                  style={{ color: "#EA580C", fontSize: 15 }}
                                />
                              }
                              label={`-${row.qtyOut}`}
                              size="small"
                              sx={{
                                bgcolor: "#FFF7ED",
                                color: "#EA580C",
                                fontWeight: 700,
                                fontSize: "0.8rem",
                                border: "1px solid rgba(234, 88, 12, 0.2)",
                                height: 24,
                                boxShadow: "none",
                              }}
                            />
                          ) : (
                            "-"
                          )}
                        </TableCell>

                        {/* Damage */}
                        <TableCell
                          align="center"
                          sx={{ py: 1.8, whiteSpace: "nowrap" }}
                        >
                          {isDamaged ? (
                            <Chip
                              icon={
                                <ReportProblemOutlinedIcon
                                  style={{ color: "#DC2626", fontSize: 15 }}
                                />
                              }
                              label={`-${row.damage}`}
                              size="small"
                              sx={{
                                bgcolor: "#FEF2F2",
                                color: "#DC2626",
                                fontWeight: 700,
                                fontSize: "0.8rem",
                                border: "1px solid rgba(239, 68, 68, 0.2)",
                                height: 24,
                                boxShadow: "none",
                              }}
                            />
                          ) : (
                            "-"
                          )}
                        </TableCell>

                        {/* Closing Balance */}
                        <TableCell align="center" sx={{ py: 1.8 }}>
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

                        {/* Worker */}
                        <TableCell
                          align="center"
                          sx={{
                            py: 1.8,
                            fontSize: "0.875rem",
                            fontWeight: 600,
                            color: "#334155",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {row.workerName}
                        </TableCell>

                        {/* Remarks */}
                        <TableCell
                          align="center"
                          sx={{ py: 1.8, minWidth: 220 }}
                        >
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 1,
                            }}
                          >
                            <Chip
                              icon={
                                <FactoryOutlinedIcon style={{ fontSize: 13 }} />
                              }
                              label="Production"
                              size="small"
                              sx={{
                                height: 20,
                                fontSize: "0.7rem",
                                fontWeight: 600,
                                bgcolor: "#EEF2FF",
                                color: "#4F46E5",
                                border: "1px solid rgba(99, 102, 241, 0.2)",
                                boxShadow: "none",
                              }}
                            />
                            <Typography
                              variant="body2"
                              sx={{ color: "#475569", fontSize: "0.85rem" }}
                            >
                              {row.remarks}
                            </Typography>
                          </Box>
                        </TableCell>
                      </TableRow>
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
