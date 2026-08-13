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
  Stack,
  Paper,
  Chip,
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
  Pagination,
  TableSortLabel,
  CircularProgress,
  Divider,
  Avatar,
  Tab,
  Tabs,
  Card,
  CardActionArea,
  CardContent,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import SearchIcon from "@mui/icons-material/Search";
import SearchBar from "../../components/search/SearchBar";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import RefreshIcon from "@mui/icons-material/Refresh";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import WarningIcon from "@mui/icons-material/Warning";
import FactoryOutlinedIcon from "@mui/icons-material/FactoryOutlined";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined";
import LayersOutlinedIcon from "@mui/icons-material/LayersOutlined";
import ViewModuleIcon from "@mui/icons-material/ViewModule";
import CloseIcon from "@mui/icons-material/Close";
import { useSearchParams } from "next/navigation";
import { z } from "zod";
import MaterialBinCard from "./MaterialBinCard";
import MasterBinCard from "./MasterBinCard";
import BinCardDetailView from "./BinCardDetailView";
import TransactionModal from "./TransactionModal";

export interface Item {
  itemId: string;
  itemName: string;
  unitOfMeasure: string;
  currentStock?: number;
  updatedAt?: string;
  isDefaultMaterial?: boolean;
}

export interface InventoryLog {
  id: string;
  transactionDate: string;
  openingStock: number;
  qtyIn: number;
  qtyOut: number;
  closingStock: number;
  authorizedBy: string;
  remarks: string;
  item?: {
    id: string;
    name: string;
    unitOfMeasure: string;
  };
}

export default function BinCardView() {
  const searchParams = useSearchParams();
  const queryMaterialId = searchParams?.get("materialId") || searchParams?.get("itemId");

  // Master items & logs
  const [items, setItems] = useState<Item[]>([]);
  // selectedItemId === null => Overview Grid View; string => Detail View
  const [selectedItemId, setSelectedItemId] = useState<string | null>(queryMaterialId || null);
  const [logs, setLogs] = useState<InventoryLog[]>([]);

  // UI state
  const [loading, setLoading] = useState(false);
  const [itemsLoading, setItemsLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Grid view search & pagination
  const [gridSearchQuery, setGridSearchQuery] = useState("");
  const [gridPage, setGridPage] = useState(1);

  // Modals state
  const [transactionOpen, setTransactionOpen] = useState(false);
  const [transactionType, setTransactionType] = useState<"load" | "deduct">(
    "load",
  );
  const [modalInitialItemId, setModalInitialItemId] = useState("");

  // Fetch all items
  const fetchItems = async () => {
    try {
      setItemsLoading(true);
      const res = await fetch("/api/inventory/current");
      if (!res.ok) throw new Error("Failed to fetch inventory items");
      const data = await res.json();
      setItems(Array.isArray(data) ? data : data.content || []);
    } catch (err: any) {
      setError("Failed to load items: " + err.message);
    } finally {
      setItemsLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  useEffect(() => {
    if (queryMaterialId) {
      setSelectedItemId(queryMaterialId);
      fetchLogs(queryMaterialId);
    }
  }, [queryMaterialId]);

  // Fetch logs when entering detail view or switching items
  const fetchLogs = async (itemId: string | null) => {
    if (itemId === null) {
      setLogs([]);
      return;
    }
    setLoading(true);
    try {
      const url =
        itemId === "all"
          ? "/api/inventory/bin/all"
          : `/api/inventory/bin/${itemId}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch bin logs");
      const data = await res.json();
      setLogs(Array.isArray(data) ? data : data.content || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCard = (itemId: string) => {
    setSelectedItemId(itemId);
    fetchLogs(itemId);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `/dashboard/bin-cards/material?materialId=${itemId}`);
    }
  };

  const handleBackToGrid = () => {
    setSelectedItemId(null);
    setLogs([]);
    fetchItems(); // refresh latest stock counts
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", "/dashboard/bin-cards/material");
    }
  };

  // Selected item object
  const activeItem = useMemo(() => {
    if (!selectedItemId || selectedItemId === "all") return null;
    return items.find((i) => i.itemId === selectedItemId) || null;
  }, [items, selectedItemId]);

  // Filtered items for Grid Overview
  const filteredGridItems = useMemo(() => {
    return items.filter((item) =>
      item.itemName.toLowerCase().includes(gridSearchQuery.toLowerCase()),
    );
  }, [items, gridSearchQuery]);

  // Reset grid page when search query changes
  useEffect(() => {
    setGridPage(1);
  }, [gridSearchQuery]);

  // Dynamic Pagination calculations (Option 1):
  // When no search (Master Card is on Page 1):
  //   Page 1: 7 materials + 1 Master Card = 8 cards
  //   Page 2+: 8 materials per page = 8 cards
  // When search is active (Master Card hidden):
  //   8 materials per page = 8 cards
  const totalGridPages = useMemo(() => {
    if (gridSearchQuery) {
      return Math.max(1, Math.ceil(filteredGridItems.length / 8));
    }
    if (filteredGridItems.length <= 7) return 1;
    return 1 + Math.ceil((filteredGridItems.length - 7) / 8);
  }, [filteredGridItems.length, gridSearchQuery]);

  const { paginatedGridItems, displayItemStart, displayItemEnd } =
    useMemo(() => {
      if (filteredGridItems.length === 0) {
        return {
          paginatedGridItems: [],
          displayItemStart: 0,
          displayItemEnd: 0,
        };
      }

      if (!gridSearchQuery) {
        if (gridPage === 1) {
          const sliced = filteredGridItems.slice(0, 7);
          return {
            paginatedGridItems: sliced,
            displayItemStart: 1,
            displayItemEnd: Math.min(7, filteredGridItems.length),
          };
        } else {
          const start = 7 + (gridPage - 2) * 8;
          const end = Math.min(start + 8, filteredGridItems.length);
          return {
            paginatedGridItems: filteredGridItems.slice(start, end),
            displayItemStart: start + 1,
            displayItemEnd: end,
          };
        }
      } else {
        const start = (gridPage - 1) * 8;
        const end = Math.min(start + 8, filteredGridItems.length);
        return {
          paginatedGridItems: filteredGridItems.slice(start, end),
          displayItemStart: start + 1,
          displayItemEnd: end,
        };
      }
    }, [filteredGridItems, gridPage, gridSearchQuery]);

  // Open modal with preselected item
  const openTransactionModal = (
    type: "load" | "deduct",
    preselectedId?: string,
  ) => {
    let targetId = preselectedId || selectedItemId || "";
    if (targetId === "all") targetId = "";

    setModalInitialItemId(targetId);
    setTransactionType(type);
    setTransactionOpen(true);
  };

  return (
    <Box
      sx={{ width: "100%", display: "flex", flexDirection: "column", gap: 3 }}
    >
      {/* ------------------------------------------------------------- */}
      {/* VIEW 1: BIN CARDS OVERVIEW GRID (Initial view when navigating) */}
      {/* ------------------------------------------------------------- */}
      {selectedItemId === null && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {/* Top Header */}
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              justifyContent: "space-between",
              alignItems: { xs: "flex-start", sm: "center" },
              gap: 2,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Box>
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: 700,
                    color: "#0F172A",
                    lineHeight: 1.2,
                    letterSpacing: "-0.01em",
                  }}
                >
                  Material Bin Card Ledger
                </Typography>
              </Box>
            </Box>

            {/* Quick Global Action Buttons */}
            <Stack direction="row" spacing={1.25} sx={{ alignItems: "center" }}>
              <Tooltip title="Refresh data">
                <IconButton
                  onClick={fetchItems}
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
                onClick={() => openTransactionModal("load")}
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
                  "&:hover": {
                    bgcolor: "#059669",
                    boxShadow: "none",
                  },
                }}
              >
                Load Stock
              </Button>

              <Button
                variant="contained"
                disableElevation
                startIcon={<RemoveIcon sx={{ fontSize: 18 }} />}
                onClick={() => openTransactionModal("deduct")}
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
                  "&:hover": {
                    bgcolor: "#DC2626",
                    boxShadow: "none",
                  },
                }}
              >
                Deduct Stock
              </Button>
            </Stack>
          </Box>

          {/* Modern Search & Filter Toolbar (No background Paper) */}
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              alignItems: { xs: "stretch", sm: "center" },
              justifyContent: "space-between",
              gap: 1.5,
            }}
          >
            {/* Search Input Field */}
            <SearchBar
              value={gridSearchQuery}
              onChange={setGridSearchQuery}
              placeholder="Search by material"
            />

            {/* Quick Metrics / Result Counter */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.25,
                flexWrap: "wrap",
              }}
            >
              {gridSearchQuery && (
                <Chip
                  size="small"
                  label={`Filtered: "${gridSearchQuery}"`}
                  onDelete={() => setGridSearchQuery("")}
                  sx={{
                    bgcolor: "#EFF6FF",
                    color: "#1D4ED8",
                    fontWeight: 600,
                    fontSize: "0.72rem",
                    height: 26,
                    border: "1px solid #BFDBFE",
                    "& .MuiChip-deleteIcon": {
                      color: "#3B82F6",
                      "&:hover": { color: "#1D4ED8" },
                    },
                  }}
                />
              )}
              <Chip
                icon={
                  <LayersOutlinedIcon
                    style={{ fontSize: 14, color: "#64748B" }}
                  />
                }
                label={
                  itemsLoading
                    ? "Loading..."
                    : `${filteredGridItems.length} of ${items.length} ${
                        items.length === 1 ? "Material" : "Materials"
                      }`
                }
                size="small"
                sx={{
                  bgcolor: "#FFFFFF",
                  border: "1.5px solid #E2E8F0",
                  color: "#475569",
                  fontWeight: 600,
                  fontSize: "0.72rem",
                  height: 28,
                  py: 0,
                  boxShadow: "0 1px 3px 0 rgba(15, 23, 42, 0.04)",
                }}
              />
            </Box>
          </Box>

          {/* Cards Grid */}
          {itemsLoading ? (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                py: 10,
              }}
            >
              <CircularProgress size={36} />
              <Typography variant="body2" sx={{ mt: 2, color: "#64748B" }}>
                Loading material bin cards...
              </Typography>
            </Box>
          ) : (
            <>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "1fr",
                    sm: "repeat(2, 1fr)",
                    md: "repeat(3, 1fr)",
                    lg: "repeat(4, 1fr)",
                  },
                  gridAutoRows: "minmax(220px, auto)",
                  alignContent: "start",
                  minHeight: { xs: "auto", sm: 460 },
                  gap: 2,
                }}
              >
                {/* Special Global Card: All Inventory Combined Stream (Show on page 1) */}
                {gridPage === 1 && !gridSearchQuery && (
                  <MasterBinCard onSelect={() => handleSelectCard("all")} />
                )}

                {/* Individual Material Bin Cards (7 per page) */}
                {paginatedGridItems.map((item) => (
                  <MaterialBinCard
                    key={item.itemId}
                    item={item}
                    onSelect={handleSelectCard}
                  />
                ))}

                {/* Empty Search Result State */}
                {filteredGridItems.length === 0 && gridSearchQuery && (
                  <Box
                    sx={{
                      gridColumn: "1 / -1",
                      p: 5,
                      bgcolor: "#FFFFFF",
                      borderRadius: "16px",
                      border: "1.5px dashed #CBD5E1",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      textAlign: "center",
                      gap: 1.5,
                    }}
                  >
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: "12px",
                        bgcolor: "#F1F5F9",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#64748B",
                      }}
                    >
                      <SearchIcon sx={{ fontSize: 24 }} />
                    </Box>
                    <Typography
                      variant="subtitle1"
                      sx={{ fontWeight: 700, color: "#1E293B" }}
                    >
                      No materials found
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        color: "#64748B",
                        maxWidth: 360,
                        fontSize: "0.85rem",
                      }}
                    >
                      We couldn't find any material matching "{gridSearchQuery}
                      ".
                    </Typography>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => setGridSearchQuery("")}
                      sx={{
                        mt: 0.5,
                        borderRadius: "8px",
                        borderColor: "#CBD5E1",
                        color: "#334155",
                        fontWeight: 600,
                        textTransform: "none",
                        "&:hover": {
                          borderColor: "#94A3B8",
                          bgcolor: "#F8FAFC",
                        },
                      }}
                    >
                      Clear Search
                    </Button>
                  </Box>
                )}
              </Box>

              {/* Modern Pagination Footer for Bin Card Grid */}
              {filteredGridItems.length > 0 && (
                <Paper
                  elevation={0}
                  sx={{
                    p: 1.5,
                    px: 2.5,
                    borderRadius: "14px",
                    bgcolor: "#FFFFFF",
                    border: "1.5px solid #E2E8F0",
                    display: "flex",
                    flexDirection: { xs: "column", sm: "row" },
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 1.5,
                    boxShadow: "0 2px 8px -2px rgba(15, 23, 42, 0.04)",
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      color: "#64748B",
                      fontSize: "0.85rem",
                      fontWeight: 500,
                    }}
                  >
                    Showing{" "}
                    <Typography
                      component="span"
                      sx={{
                        fontWeight: 700,
                        color: "#0F172A",
                        fontSize: "0.85rem",
                      }}
                    >
                      {displayItemStart} - {displayItemEnd}
                    </Typography>{" "}
                    of{" "}
                    <Typography
                      component="span"
                      sx={{
                        fontWeight: 700,
                        color: "#0F172A",
                        fontSize: "0.85rem",
                      }}
                    >
                      {filteredGridItems.length}
                    </Typography>{" "}
                    materials
                  </Typography>

                  <Pagination
                    count={totalGridPages}
                    page={gridPage}
                    onChange={(_, p) => setGridPage(p)}
                    shape="rounded"
                    color="primary"
                    showFirstButton
                    showLastButton
                    sx={{
                      "& .MuiPaginationItem-root": {
                        fontWeight: 600,
                        fontSize: "0.85rem",
                        borderRadius: "8px",
                        color: "#475569",
                        border: "1px solid transparent",
                        "&:hover": {
                          bgcolor: "#F1F5F9",
                          color: "#0F172A",
                        },
                        "&.Mui-selected": {
                          bgcolor: "#2563EB !important",
                          color: "#FFFFFF",
                          fontWeight: 700,
                          "&:hover": {
                            bgcolor: "#1D4ED8 !important",
                          },
                        },
                      },
                    }}
                  />
                </Paper>
              )}
            </>
          )}
        </Box>
      )}

      {/* ------------------------------------------------------------- */}
      {/* VIEW 2: DRILLDOWN BIN CARD DETAIL (When user clicks a card)   */}
      {/* ------------------------------------------------------------- */}
      {selectedItemId !== null && (
        <BinCardDetailView
          selectedItemId={selectedItemId}
          activeItem={activeItem}
          logs={logs}
          loading={loading}
          onBack={handleBackToGrid}
          onRefresh={() => fetchLogs(selectedItemId)}
          onTransaction={openTransactionModal}
        />
      )}

      {/* ------------------------------------------------------------- */}
      {/* TRANSACTION MODAL (Load or Deduct)                            */}
      {/* ------------------------------------------------------------- */}
      <TransactionModal
        open={transactionOpen}
        type={transactionType}
        onClose={() => setTransactionOpen(false)}
        onSuccess={(msg) => {
          setSuccessMsg(msg);
          setTimeout(() => setSuccessMsg(""), 3000);
          fetchItems();
          if (selectedItemId) fetchLogs(selectedItemId);
        }}
        onError={(msg) => {
          setError(msg);
          setTimeout(() => setError(""), 5000);
        }}
        items={items}
        initialItemId={modalInitialItemId}
      />

      {/* Notifications */}
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
