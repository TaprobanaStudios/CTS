import * as React from "react";
import { useState, useMemo } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  Tooltip,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  CircularProgress,
  Avatar,
  Tab,
  Tabs,
  Paper,
  Chip,
  Stack,
} from "@mui/material";

import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import SearchIcon from "@mui/icons-material/Search";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import RefreshIcon from "@mui/icons-material/Refresh";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import FactoryOutlinedIcon from "@mui/icons-material/FactoryOutlined";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined";
import CloseIcon from "@mui/icons-material/Close";
import { Item, InventoryLog } from "./BinCardView";

interface BinCardDetailViewProps {
  selectedItemId: string;
  activeItem: Item | null;
  logs: InventoryLog[];
  loading: boolean;
  onBack: () => void;
  onRefresh: () => void;
  onTransaction: (type: "load" | "deduct", itemId: string) => void;
}

export default function BinCardDetailView({
  selectedItemId,
  activeItem,
  logs,
  loading,
  onBack,
  onRefresh,
  onTransaction,
}: BinCardDetailViewProps) {
  // Detail view search & filters
  const isAllMaterials = selectedItemId === "all" || !activeItem;
  const [detailSearchQuery, setDetailSearchQuery] = useState("");
  const [movementTab, setMovementTab] = useState<"all" | "in" | "out">("all");

  // Table pagination & sorting
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [orderBy, setOrderBy] = useState<string>("transactionDate");

  // KPI Metrics calculation for Detail View
  const metrics = useMemo(() => {
    const totalRecords = logs.length;
    let totalIn = 0;
    let totalOut = 0;

    logs.forEach((log) => {
      totalIn += Number(log.qtyIn || 0);
      totalOut += Number(log.qtyOut || 0);
    });

    const currentStock = activeItem
      ? (activeItem.currentStock ?? 0)
      : logs.length > 0
        ? (logs[0].closingStock ?? 0)
        : 0;

    return {
      currentStock,
      totalIn,
      totalOut,
      totalRecords,
      unit: activeItem?.unitOfMeasure || "UNITS",
    };
  }, [logs, activeItem]);

  // Filtered & sorted logs for Detail Table
  const filteredLogs = useMemo(() => {
    return logs
      .filter((log) => {
        if (movementTab === "in" && (!log.qtyIn || log.qtyIn <= 0))
          return false;
        if (movementTab === "out" && (!log.qtyOut || log.qtyOut <= 0))
          return false;

        if (detailSearchQuery.trim()) {
          const q = detailSearchQuery.toLowerCase();
          const matchesRemarks = (log.remarks || "").toLowerCase().includes(q);
          const matchesAuth = (log.authorizedBy || "")
            .toLowerCase()
            .includes(q);
          const matchesItem = (log.item?.name || "").toLowerCase().includes(q);
          if (!matchesRemarks && !matchesAuth && !matchesItem) return false;
        }

        return true;
      })
      .sort((a, b) => {
        let valA: any = a[orderBy as keyof InventoryLog];
        let valB: any = b[orderBy as keyof InventoryLog];

        if (orderBy === "transactionDate") {
          valA = new Date(a.transactionDate).getTime();
          valB = new Date(b.transactionDate).getTime();
        }

        if (valA < valB) return order === "asc" ? -1 : 1;
        if (valA > valB) return order === "asc" ? 1 : -1;
        return 0;
      });
  }, [logs, movementTab, detailSearchQuery, order, orderBy]);

  const handleRequestSort = (property: string) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

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

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
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
              onClick={onRefresh}
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
          p: 2.5,
          px: 3,
          bgcolor: "#FFFFFF",
          border: "1px solid #E2E8F0",
          borderRadius: "16px",
          boxShadow: "0 4px 20px -2px rgba(15, 23, 42, 0.04)",
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          justifyContent: "space-between",
          alignItems: { xs: "flex-start", md: "center" },
          gap: 3,
        }}
      >
        {/* Left Side: Material Info */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Typography
              variant="h4"
              sx={{ color: "#0F172A", m: 0, lineHeight: 1 }}
            >
              {activeItem
                ? activeItem.itemName
                : "All Materials Combined Ledger"}
            </Typography>
            {activeItem && (
              <Chip
                icon={
                  metrics.currentStock > 0 ? (
                    <CheckCircleIcon
                      style={{ color: "#10B981", fontSize: 12 }}
                    />
                  ) : (
                    <ErrorIcon style={{ color: "#EF4444", fontSize: 12 }} />
                  )
                }
                label={metrics.currentStock > 0 ? "In Stock" : "Out of Stock"}
                sx={{
                  bgcolor: metrics.currentStock > 0 ? "#ECFDF5" : "#FEF2F2",
                  color: metrics.currentStock > 0 ? "#065F46" : "#991B1B",
                  fontWeight: 700,
                  mt: 1,
                  fontSize: "0.65rem",
                  height: 24,
                  border: "1px solid",
                  borderColor: metrics.currentStock > 0 ? "#A7F3D0" : "#FECACA",
                }}
              />
            )}
          </Box>
          <Typography
            variant="body2"
            sx={{ color: "#64748B", fontSize: "0.85rem" }}
          >
            {activeItem
              ? `SKU ID: ${activeItem.itemId}`
              : "Aggregated transaction log for all warehouse materials"}
          </Typography>
        </Box>

        {/* Right Side: Current Balance inline (hidden for combined ledger) */}
        {activeItem && (
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
                  {metrics.currentStock}
                </Typography>
                <Typography
                  variant="subtitle2"
                  sx={{ color: "#64748B", fontWeight: 700 }}
                >
                  {metrics.unit}
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
          boxShadow: "0 4px 20px -2px rgba(15, 23, 42, 0.04)",
        }}
      >
        {/* Table Toolbar & Filters */}
        <Box
          sx={{
            p: 2,
            px: 2.5,
            borderBottom: "1px solid #F1F5F9",
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            justifyContent: "space-between",
            alignItems: { xs: "stretch", sm: "center" },
            gap: 2,
          }}
        >
          {/* Movement Tabs */}
          <Tabs
            value={movementTab}
            onChange={(_, val) => {
              setMovementTab(val);
              setPage(0);
            }}
            sx={{
              minHeight: 36,
              bgcolor: "#F8FAFC",
              borderRadius: "8px",
              p: 0.5,
              "& .MuiTabs-indicator": {
                bgcolor: "#e9e9e9ff",
                height: "100%",
                borderRadius: "6px",
                boxShadow: "0 1px 3px rgba(15, 23, 42, 0.1)",
                zIndex: 1,
              },
              "& .MuiTab-root": {
                minHeight: 32,
                py: 0.5,
                px: 2,
                fontSize: "0.85rem",
                fontWeight: 600,
                color: "#64748B",
                textTransform: "none",
                zIndex: 2,
                "&.Mui-selected": {
                  color: "#0F172A",
                  fontWeight: 700,
                },
              },
            }}
          >
            <Tab label="All Movements" value="all" />
            <Tab label="Stock In (+)" value="in" />
            <Tab label="Stock Out (-)" value="out" />
          </Tabs>

          {/* Search Log Records */}
          <TextField
            size="small"
            placeholder="Search"
            value={detailSearchQuery}
            onChange={(e) => setDetailSearchQuery(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment
                    position="start"
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      mr: 1,
                      height: "100%",
                      maxHeight: "none",
                    }}
                  >
                    <SearchIcon
                      sx={{
                        fontSize: 18,
                        color: detailSearchQuery ? "#2563EB" : "#64748B",
                        display: "block",
                        transition: "color 0.2s ease",
                      }}
                    />
                  </InputAdornment>
                ),
                endAdornment: detailSearchQuery ? (
                  <InputAdornment position="end" sx={{ mr: 0 }}>
                    <IconButton
                      size="small"
                      onClick={() => setDetailSearchQuery("")}
                      sx={{
                        p: 0.4,
                        bgcolor: "#F1F5F9",
                        color: "#64748B",
                        "&:hover": { bgcolor: "#E2E8F0", color: "#0F172A" },
                        transition: "all 0.15s ease",
                      }}
                    >
                      <CloseIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </InputAdornment>
                ) : null,
              },
            }}
            sx={{
              width: { xs: "100%", sm: 320 },
              "& .MuiOutlinedInput-root": {
                bgcolor: "#FFFFFF",
                borderRadius: "12px",
                fontSize: "0.85rem",
                height: 40,
                pl: 1.25,
                pr: 1,
                display: "flex",
                alignItems: "center",
                "& fieldset": { borderColor: "#E2E8F0" },
                "&:hover fieldset": { borderColor: "#93C5FD" },
                "&.Mui-focused fieldset": {
                  borderColor: "#2563EB",
                  borderWidth: "1px",
                },
              },
              "& .MuiOutlinedInput-input": {
                p: 0,
                height: "100%",
                fontSize: "0.85rem",
                lineHeight: "1.2",
                display: "flex",
                alignItems: "center",
                "&::placeholder": {
                  color: "#94A3B8",
                  opacity: 1,
                },
              },
            }}
          />
        </Box>

        {/* The Perpetual Ledger Table */}
        <TableContainer sx={{ minHeight: 300 }}>
          <Table
            stickyHeader
            aria-label="bin card ledger table"
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
                    borderBottom: "1px solid #E2E8F0",
                    whiteSpace: "nowrap",
                    py: 1.5,
                  }}
                >
                  <TableSortLabel
                    active={orderBy === "transactionDate"}
                    direction={orderBy === "transactionDate" ? order : "asc"}
                    onClick={() => handleRequestSort("transactionDate")}
                  >
                    Date
                  </TableSortLabel>
                </TableCell>

                {isAllMaterials && (
                  <TableCell
                    align="center"
                    sx={{
                      bgcolor: "#F8FAFC",
                      color: "#475569",
                      fontWeight: 700,
                      fontSize: "0.75rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      borderBottom: "1px solid #E2E8F0",
                      whiteSpace: "nowrap",
                      py: 1.5,
                    }}
                  >
                    Item
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
                    letterSpacing: "0.05em",
                    borderBottom: "1px solid #E2E8F0",
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
                    letterSpacing: "0.05em",
                    borderBottom: "1px solid #E2E8F0",
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
                    letterSpacing: "0.05em",
                    borderBottom: "1px solid #E2E8F0",
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
                    letterSpacing: "0.05em",
                    borderBottom: "1px solid #E2E8F0",
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
                    letterSpacing: "0.05em",
                    borderBottom: "1px solid #E2E8F0",
                    whiteSpace: "nowrap",
                  }}
                >
                  Authorized By
                </TableCell>

                <TableCell
                  align="center"
                  sx={{
                    bgcolor: "#F8FAFC",
                    color: "#475569",
                    fontWeight: 700,
                    fontSize: "0.75rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    borderBottom: "1px solid #E2E8F0",
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
                    colSpan={isAllMaterials ? 8 : 7}
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
              ) : filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={isAllMaterials ? 8 : 7}
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
                        No Bin Card Records Found
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ color: "#94A3B8", maxWidth: 360 }}
                      >
                        {activeItem
                          ? `There are no recorded transactions for ${activeItem.itemName} yet.`
                          : "No inventory movements recorded."}
                      </Typography>
                      {activeItem && (
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
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((log) => {
                    const isInflow = Number(log.qtyIn) > 0;
                    const isOutflow = Number(log.qtyOut) > 0;
                    const itemName =
                      log.item?.name || activeItem?.itemName || "-";

                    return (
                      <TableRow
                        key={log.id}
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
                            borderBottom: "1px solid #F1F5F9",
                            fontSize: "0.875rem",
                            color: "#334155",
                            fontWeight: 500,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {new Date(log.transactionDate).toLocaleDateString(
                            "en-US",
                            {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            },
                          )}
                        </TableCell>

                        {/* Item Name (Only in Combined Ledger) */}
                        {isAllMaterials && (
                          <TableCell
                            align="center"
                            sx={{
                              py: 1.8,
                              borderBottom: "1px solid #F1F5F9",
                              fontSize: "0.875rem",
                              color: "#1E293B",
                              fontWeight: 600,
                              whiteSpace: "nowrap",
                            }}
                          >
                            <Typography
                              variant="body2"
                              sx={{ fontWeight: 600, color: "#1E293B" }}
                            >
                              {itemName}
                            </Typography>
                          </TableCell>
                        )}

                        {/* O/S */}
                        <TableCell
                          align="right"
                          sx={{
                            py: 1.8,
                            borderBottom: "1px solid #F1F5F9",
                            fontSize: "0.875rem",
                            color: "#64748B",
                            fontWeight: 500,
                          }}
                        >
                          {log.openingStock != null ? log.openingStock : "-"}
                        </TableCell>

                        {/* In */}
                        <TableCell
                          align="center"
                          sx={{
                            py: 1.8,
                            borderBottom: "1px solid #F1F5F9",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {isInflow ? (
                            <Chip
                              icon={
                                <TrendingUpIcon
                                  style={{ color: "#059669", fontSize: 15 }}
                                />
                              }
                              label={`+${log.qtyIn}`}
                              size="small"
                              sx={{
                                bgcolor: "#ECFDF5",
                                color: "#059669",
                                fontWeight: 700,
                                fontSize: "0.8rem",
                                border: "1px solid rgba(16, 185, 129, 0.2)",
                                height: 24,
                              }}
                            />
                          ) : (
                            <Typography
                              variant="body2"
                              sx={{ color: "#94A3B8" }}
                            >
                              -
                            </Typography>
                          )}
                        </TableCell>

                        {/* Out */}
                        <TableCell
                          align="center"
                          sx={{
                            py: 1.8,
                            borderBottom: "1px solid #F1F5F9",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {isOutflow ? (
                            <Chip
                              icon={
                                <TrendingDownIcon
                                  style={{ color: "#DC2626", fontSize: 15 }}
                                />
                              }
                              label={`-${log.qtyOut}`}
                              size="small"
                              sx={{
                                bgcolor: "#FEF2F2",
                                color: "#DC2626",
                                fontWeight: 700,
                                fontSize: "0.8rem",
                                border: "1px solid rgba(239, 68, 68, 0.2)",
                                height: 24,
                              }}
                            />
                          ) : (
                            <Typography
                              variant="body2"
                              sx={{ color: "#94A3B8" }}
                            >
                              -
                            </Typography>
                          )}
                        </TableCell>

                        {/* Closing Balance */}
                        <TableCell
                          align="right"
                          sx={{
                            py: 1.8,
                            borderBottom: "1px solid #F1F5F9",
                          }}
                        >
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 800,
                              color: "#0F172A",
                              fontSize: "0.9rem",
                            }}
                          >
                            {log.closingStock != null ? log.closingStock : "-"}
                          </Typography>
                        </TableCell>

                        {/* Authorized By */}
                        <TableCell
                          sx={{
                            py: 1.8,
                            borderBottom: "1px solid #F1F5F9",
                            whiteSpace: "nowrap",
                          }}
                        >
                          <Typography
                            variant="body2"
                            sx={{ color: "#334155", fontWeight: 600 }}
                          >
                            {log.authorizedBy || "System"}
                          </Typography>
                        </TableCell>

                        {/* Remarks */}
                        <TableCell
                          sx={{
                            py: 1.8,
                            borderBottom: "1px solid #F1F5F9",
                            minWidth: 220,
                          }}
                        >
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              flexWrap: "wrap",
                            }}
                          >
                            {getRemarkBadge(log.remarks)}
                            <Typography
                              variant="body2"
                              sx={{
                                color: "#475569",
                                fontSize: "0.85rem",
                              }}
                            >
                              {log.remarks}
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
        <Box
          sx={{
            p: 1,
            px: 2,
            borderTop: "1px solid #F1F5F9",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography variant="caption" sx={{ color: "#94A3B8" }}>
            Showing {filteredLogs.length} ledger movements
          </Typography>

          <TablePagination
            rowsPerPageOptions={[10, 25, 50]}
            component="div"
            count={filteredLogs.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            sx={{
              border: "none",
              "& .MuiTablePagination-toolbar": { minHeight: 40 },
              "& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows":
                {
                  fontSize: "0.8rem",
                  color: "#64748B",
                },
            }}
          />
        </Box>
      </Paper>
    </Box>
  );
}
