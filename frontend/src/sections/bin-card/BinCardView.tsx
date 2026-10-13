"use client";

import useDebouncedValue from "@/hooks/useDebouncedValue";
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
  unitCost?: number | null;
  // Stock ID: the load's own, or the stock a deduction was taken from
  batchCode?: string | null;
  // true for deductions made automatically by a production entry: those cannot be edited
  productionDeduction?: boolean;
  editedBy?: string | null;
  editedAt?: string | null;
  editCount?: number | null;
  editNote?: string | null;
  authorizedBy: string;
  remarks: string;
  item?: {
    id: string;
    name: string;
    unitOfMeasure: string;
  };
}

// Cards per page; the "All Materials" card takes one of the eight places when nothing is searched
const CARDS_PER_PAGE = 8;
const SEARCH_DEBOUNCE_MS = 350;

export default function BinCardView() {
  const searchParams = useSearchParams();
  const queryMaterialId = searchParams?.get("materialId") || searchParams?.get("itemId");

  // selectedItemId === null => Overview Grid View; string => Detail View
  const [selectedItemId, setSelectedItemId] = useState<string | null>(queryMaterialId || null);
  // Bumped to make the detail view reload its ledger (after a transaction)
  const [logsReloadToken, setLogsReloadToken] = useState(0);

  // UI state
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Grid view search & pagination: only the cards of the page on screen are fetched
  const [gridSearchQuery, setGridSearchQuery] = useState("");
  const [gridPage, setGridPage] = useState(1);
  const [gridReloadToken, setGridReloadToken] = useState(0);
  const [grid, setGrid] = useState<{ key: string; items: Item[]; total: number }>({ key: "", items: [], total: 0 });
  // The material whose ledger is open, with its current stock
  const [activeItem, setActiveItem] = useState<Item | null>(null);
  const [activeItemToken, setActiveItemToken] = useState(0);
  // Every material, for the Load / Deduct picker; fetched the first time the form opens
  const [pickerItems, setPickerItems] = useState<Item[]>([]);

  // Modals state
  const [transactionOpen, setTransactionOpen] = useState(false);
  const [transactionType, setTransactionType] = useState<"load" | "deduct">(
    "load",
  );
  const [modalInitialItemId, setModalInitialItemId] = useState("");

  const debouncedSearch = useDebouncedValue(gridSearchQuery, SEARCH_DEBOUNCE_MS).trim();
  // The master card takes one of the eight places on a page until the user searches
  const showMasterCard = debouncedSearch === "";
  const pageSize = showMasterCard ? CARDS_PER_PAGE - 1 : CARDS_PER_PAGE;

  const gridQuery = useMemo(() => {
    const params = new URLSearchParams({
      page: String(gridPage - 1),
      size: String(pageSize),
      sort: "itemName,asc",
    });
    if (debouncedSearch) params.set("search", debouncedSearch);
    return params.toString();
  }, [gridPage, pageSize, debouncedSearch]);

  const gridRequestKey = `${gridQuery}#${gridReloadToken}`;
  // Loading is derived: the cards on screen belong to an older request
  const itemsLoading = grid.key !== gridRequestKey;

  useEffect(() => {
    if (selectedItemId !== null) return;
    const controller = new AbortController();

    fetch(`/api/inventory/current?${gridQuery}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch inventory items");
        return res.json();
      })
      .then((data) => {
        const items: Item[] = data.content ?? [];
        const total: number = data.totalElements ?? 0;
        setGrid({ key: gridRequestKey, items, total });
        // The result set shrank underneath us: step back to the last page that exists
        if (items.length === 0 && total > 0) setGridPage(Math.max(1, data.totalPages ?? 1));
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setError("Failed to load items: " + (err instanceof Error ? err.message : "unknown error"));
        setGrid((prev) => ({ ...prev, key: gridRequestKey }));
      });

    return () => controller.abort();
  }, [selectedItemId, gridQuery, gridRequestKey]);

  // The open ledger's material; fetched again after every stock movement so its stock is current
  useEffect(() => {
    if (!selectedItemId || selectedItemId === "all") return;
    const controller = new AbortController();

    fetch(`/api/inventory/current/${selectedItemId}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch the material");
        return res.json();
      })
      .then((item: Item) => setActiveItem(item))
      .catch((err) => {
        if (controller.signal.aborted) return;
        setError("Failed to load the material: " + (err instanceof Error ? err.message : "unknown error"));
      });

    return () => controller.abort();
  }, [selectedItemId, logsReloadToken, activeItemToken]);

  const reloadGrid = () => setGridReloadToken((token) => token + 1);

  // Every new search starts again from the first page
  const changeGridSearch = (value: string) => {
    setGridSearchQuery(value);
    setGridPage(1);
  };

  // The picker lists every material by name, so it is loaded once, when a form first needs it
  const loadPickerItems = async () => {
    try {
      const res = await fetch("/api/inventory/current");
      if (!res.ok) throw new Error("Failed to fetch inventory items");
      const data = await res.json();
      setPickerItems(Array.isArray(data) ? data : data.content || []);
    } catch (err) {
      setError("Failed to load items: " + (err instanceof Error ? err.message : "unknown error"));
    }
  };

  const handleSelectCard = (itemId: string) => {
    // Never show the previous material's name and stock while the new one loads
    setActiveItem(grid.items.find((item) => item.itemId === itemId) ?? null);
    setSelectedItemId(itemId);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `/dashboard/bin-cards/material?materialId=${itemId}`);
    }
  };

  const handleBackToGrid = () => {
    setSelectedItemId(null);
    setActiveItem(null);
    reloadGrid(); // refresh latest stock counts
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", "/dashboard/bin-cards/material");
    }
  };

  const paginatedGridItems = grid.items;
  const totalGridItems = grid.total;
  const totalGridPages = Math.max(1, Math.ceil(totalGridItems / pageSize));
  const displayItemStart = totalGridItems === 0 ? 0 : (gridPage - 1) * pageSize + 1;
  const displayItemEnd = Math.min(gridPage * pageSize, totalGridItems);

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
    loadPickerItems();
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
                  onClick={reloadGrid}
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
              onChange={changeGridSearch}
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
                  onDelete={() => changeGridSearch("")}
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
                    : `${totalGridItems} ${
                        totalGridItems === 1 ? "Material" : "Materials"
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
                {showMasterCard && (
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
                {totalGridItems === 0 && gridSearchQuery && (
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
                      onClick={() => changeGridSearch("")}
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
              {totalGridItems > 0 && (
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
                      {totalGridItems}
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
          key={selectedItemId}
          selectedItemId={selectedItemId}
          activeItem={activeItem}
          reloadToken={logsReloadToken}
          onBack={handleBackToGrid}
          onTransaction={openTransactionModal}
          onError={setError}
          onChanged={() => setActiveItemToken((token) => token + 1)}
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
          loadPickerItems();
          if (selectedItemId) setLogsReloadToken((token) => token + 1);
          else reloadGrid();
        }}
        onError={(msg) => {
          setError(msg);
          setTimeout(() => setError(""), 5000);
        }}
        items={pickerItems}
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
