"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Typography,
  Paper,
  Chip,
  TextField,
  InputAdornment,
  Pagination,
  CircularProgress,
  IconButton,
  Tooltip,
  Card,
  CardActionArea,
  Avatar,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import SearchBar from "../../components/search/SearchBar";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import LayersOutlinedIcon from "@mui/icons-material/LayersOutlined";
import ProductionBinCardDetailView, {
  ProductItem,
  ProductSummaryDto,
  toProductItem,
} from "./ProductionBinCardDetailView";
import { MaterialUsageDto, ProductUsageDto, formatQty } from "../production/types";
import useDebouncedValue from "@/hooks/useDebouncedValue";
import { currentMonthInSriLanka } from "@/utils/datetime";

export type ProductionStatusType =
  | "STORED"
  | "SOLD"
  | "CURING"
  | "DISPATCHED"
  | "CONSUMED";

export interface ProductionReport {
  id: string;
  reportDate: string;
  workerName?: string;
  productType: string;
  qtyProduced: number;
  damages: number;
  status?: ProductionStatusType;
  materials?: MaterialUsageDto[];
  productUsages?: ProductUsageDto[];
  editedBy?: string | null;
  editedAt?: string | null;
  editCount?: number | null;
  editNote?: string | null;
}

// Cards per page; the "All Products" card takes one of the eight places when nothing is searched
const CARDS_PER_PAGE = 8;
const SEARCH_DEBOUNCE_MS = 350;

interface ProductPage {
  // The request this page of cards answers
  key: string;
  products: ProductItem[];
  total: number;
}

export default function ProductionBinCardView() {
  // null => cards overview; otherwise the ledger of one product (or of all, when productName is null)
  const [selected, setSelected] = useState<{ productName: string | null } | null>(null);

  // Grid view search & pagination
  const [gridSearchQuery, setGridSearchQuery] = useState("");
  const [gridPage, setGridPage] = useState(1);
  const [reloadToken, setReloadToken] = useState(0);
  const [grid, setGrid] = useState<ProductPage>({ key: "", products: [], total: 0 });

  const debouncedSearch = useDebouncedValue(gridSearchQuery, SEARCH_DEBOUNCE_MS).trim();
  // The figures on the cards cover this month; the balance itself is all-time
  const month = useMemo(() => currentMonthInSriLanka(), []);

  // The master card is shown on every page until the user searches
  const showMasterCard = debouncedSearch === "";
  const pageSize = showMasterCard ? CARDS_PER_PAGE - 1 : CARDS_PER_PAGE;

  const query = useMemo(() => {
    const params = new URLSearchParams({ page: String(gridPage - 1), size: String(pageSize) });
    if (debouncedSearch) params.set("search", debouncedSearch);
    return params.toString();
  }, [gridPage, pageSize, debouncedSearch]);

  const requestKey = `${query}#${reloadToken}`;
  // Loading is derived: the cards on screen belong to an older request
  const loading = grid.key !== requestKey;

  // Only the products of the page on screen are fetched; the server works out their figures
  useEffect(() => {
    if (selected !== null) return;
    const controller = new AbortController();

    fetch(`/api/production/bin/products?${query}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch production bin cards");
        return res.json();
      })
      .then((data) => {
        const products: ProductItem[] = (data.content ?? []).map((summary: ProductSummaryDto) => toProductItem(summary));
        const total: number = data.totalElements ?? 0;
        setGrid({ key: requestKey, products, total });
        // The result set shrank underneath us: step back to the last page that exists
        if (products.length === 0 && total > 0) setGridPage(Math.max(1, data.totalPages ?? 1));
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        console.error("Failed to load production bin cards:", err);
        setGrid((prev) => ({ ...prev, key: requestKey }));
      });

    return () => controller.abort();
  }, [selected, query, requestKey]);

  const paginatedGridProducts = grid.products;
  const totalGridProducts = grid.total;
  const totalGridPages = Math.max(1, Math.ceil(totalGridProducts / pageSize));
  const displayStart = totalGridProducts === 0 ? 0 : (gridPage - 1) * pageSize + 1;
  const displayEnd = Math.min(gridPage * pageSize, totalGridProducts);

  return (
    <Box
      sx={{ width: "100%", display: "flex", flexDirection: "column", gap: 3 }}
    >
      {/* ------------------------------------------------------------- */}
      {/* VIEW 1: PRODUCTION CARDS OVERVIEW GRID                         */}
      {/* ------------------------------------------------------------- */}
      {selected === null && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {/* Header Row */}
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
                  Production Bin Card Ledger
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Tooltip title="Refresh stock data">
                <IconButton
                  onClick={() => setReloadToken((token) => token + 1)}
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
          </Box>

          {/* Search & Metrics Toolbar */}
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              alignItems: { xs: "stretch", sm: "center" },
              justifyContent: "space-between",
              gap: 1.5,
            }}
          >
            <SearchBar
              value={gridSearchQuery}
              onChange={(value) => {
                setGridSearchQuery(value);
                setGridPage(1);
              }}
              placeholder="Search by product"
            />

            {/* Quick Metrics Chip */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
              <Chip
                icon={
                  <LayersOutlinedIcon
                    style={{ fontSize: 14, color: "#64748B" }}
                  />
                }
                label={`${totalGridProducts} ${totalGridProducts === 1 ? "Product" : "Products"}`}
                size="small"
                sx={{
                  bgcolor: "#FFFFFF",
                  border: "1.5px solid #E2E8F0",
                  color: "#475569",
                  fontWeight: 600,
                  fontSize: "0.72rem",
                  height: 28,
                  py: 0,
                  boxShadow: "none",
                }}
              />
            </Box>
          </Box>

          {/* Cards Grid */}
          {loading ? (
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
                Loading production bin cards...
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
                  gridAutoRows: "minmax(280px, auto)",
                  alignContent: "start",
                  minHeight: { xs: "auto", sm: 460 },
                  gap: 2,
                }}
              >
                {/* 1. All Products Combined Master Card (hidden while searching) */}
                {showMasterCard && (
                  <Card
                    elevation={0}
                    sx={{
                      borderRadius: "16px",
                      border: "2px dashed #CBD5E1",
                      bgcolor: "#FFFFFF",
                      boxShadow: "none",
                      transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                      height: "100%",
                      minHeight: 220,
                      display: "flex",
                      flexDirection: "column",
                      "&:hover": {
                        transform: "translateY(-3px)",
                        borderColor: "#2563EB",
                        boxShadow: "none",
                      },
                    }}
                  >
                    <CardActionArea
                      onClick={() => setSelected({ productName: null })}
                      sx={{
                        p: 2.25,
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "stretch",
                        justifyContent: "space-between",
                      }}
                    >
                      <Box sx={{ width: "100%" }}>
                        {/* Top Row: Left Icon | Right Top Corner "Global" Chip */}
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            mb: 1.5,
                          }}
                        >
                          <Avatar
                            sx={{
                              width: 36,
                              height: 36,
                              borderRadius: "10px",
                              bgcolor: "#EFF6FF",
                              color: "#2563EB",
                            }}
                          >
                            <ReceiptLongIcon sx={{ fontSize: 20 }} />
                          </Avatar>
                          <Chip
                            label="Global"
                            size="small"
                            sx={{
                              fontWeight: 700,
                              fontSize: "0.72rem",
                              height: 24,
                              bgcolor: "#F1F5F9",
                              color: "#475569",
                              border: "1px solid #E2E8F0",
                              px: 0.5,
                              boxShadow: "none",
                            }}
                          />
                        </Box>

                        <Typography
                          variant="subtitle1"
                          sx={{
                            fontWeight: 800,
                            color: "#0F172A",
                            mb: 0.75,
                            fontSize: "1rem",
                            lineHeight: 1.3,
                          }}
                        >
                          All Products Ledger
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            color: "#64748B",
                            display: "-webkit-box",
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                            mb: 1.5,
                            fontSize: "0.78rem",
                            lineHeight: 1.45,
                          }}
                        >
                          Unified audit log of all manufactured products, output
                          quantities, and scrap movements across the facility
                        </Typography>
                      </Box>

                      <Box
                        sx={{
                          width: "100%",
                          display: "flex",
                          justifyContent: "flex-end",
                          alignItems: "center",
                          pt: 1.25,
                          borderTop: "1px solid #F1F5F9",
                        }}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 0.5,
                          }}
                        >
                          <Typography
                            variant="caption"
                            sx={{
                              fontWeight: 700,
                              color: "#2563EB",
                              fontSize: "0.8rem",
                            }}
                          >
                            View Master
                          </Typography>
                          <ArrowForwardIcon
                            sx={{ fontSize: 14, color: "#2563EB" }}
                          />
                        </Box>
                      </Box>
                    </CardActionArea>
                  </Card>
                )}

                {/* 2. Individual Product Cards */}
                {paginatedGridProducts.map((prod) => (
                  <Card
                    key={prod.productId}
                    elevation={0}
                    sx={{
                      borderRadius: "16px",
                      border: "1.5px solid #E2E8F0",
                      bgcolor: "#FFFFFF",
                      boxShadow: "none",
                      transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                      height: "100%",
                      minHeight: 220,
                      display: "flex",
                      flexDirection: "column",
                      "&:hover": {
                        transform: "translateY(-3px)",
                        borderColor: "#93C5FD",
                        boxShadow: "none",
                      },
                    }}
                  >
                    <CardActionArea
                      onClick={() => setSelected({ productName: prod.productName })}
                      sx={{
                        p: 2.25,
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "stretch",
                        justifyContent: "space-between",
                      }}
                    >
                      <Box sx={{ width: "100%" }}>
                        {/* Top Row: Unit Chip */}
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "flex-end",
                            alignItems: "flex-start",
                            mb: 1.5,
                          }}
                        >
                          <Chip
                            label={prod.unitOfMeasure}
                            size="small"
                            sx={{
                              height: 24,
                              fontWeight: 700,
                              fontSize: "0.6rem",
                              bgcolor: "#F8FAFC",
                              border: "1.5px solid #E2E8F0",
                              color: "#334155",
                              px: 0.5,
                              boxShadow: "none",
                            }}
                          />
                        </Box>

                        {/* Product Name Title */}
                        <Typography
                          variant="subtitle1"
                          sx={{
                            fontWeight: 800,
                            color: "#0F172A",
                            mb: 1.75,
                            fontSize: "1rem",
                            lineHeight: 1.3,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {prod.productName}
                        </Typography>

                        {/* Live Balance Stat Box - Aligned to the Right */}
                        <Box
                          sx={{
                            bgcolor: "#F8FAFC",
                            py: 1,
                            px: 1.5,
                            borderRadius: "12px",
                            border: "1px solid #E2E8F0",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "flex-end",
                            textAlign: "right",
                            mb: 1.5,
                          }}
                        >
                          <Typography
                            variant="caption"
                            sx={{
                              color: "#64748B",
                              fontWeight: 600,
                              display: "block",
                              fontSize: "0.6rem",
                              lineHeight: 1.2,
                              mb: 0.25,
                              textTransform: "uppercase",
                              letterSpacing: "0.03em",
                            }}
                          >
                            Stock on hand now
                          </Typography>
                          <Typography
                            sx={{
                              fontWeight: 800,
                              fontSize: "1.25rem",
                              color:
                                prod.currentStock <= 0 ? "#EF4444" : "#0F172A",
                              lineHeight: 1.2,
                            }}
                          >
                            {formatQty(prod.currentStock)}{" "}
                            <Typography
                              component="span"
                              sx={{
                                color: "#64748B",
                                fontWeight: 600,
                                fontSize: "0.8rem",
                              }}
                            >
                              {prod.unitOfMeasure}
                            </Typography>
                          </Typography>
                        </Box>

                        {/* What moved this month; the balance above is the all-time stock on hand */}
                        <Typography
                          sx={{
                            fontSize: "0.62rem",
                            fontWeight: 700,
                            color: "#64748B",
                            textTransform: "uppercase",
                            letterSpacing: "0.04em",
                            mb: 0.5,
                          }}
                        >
                          This month · {month.label}
                        </Typography>
                        <Box
                          sx={{
                            display: "grid",
                            // The two longer labels get the wider columns
                            gridTemplateColumns: "minmax(0, 1.25fr) minmax(0, 1.25fr) minmax(0, 0.75fr) minmax(0, 0.75fr)",
                            gap: 1,
                            mb: 1.5,
                          }}
                        >
                          {[
                            { label: "Produced", value: prod.thisMonth.produced, color: prod.thisMonth.produced > 0 ? "#059669" : "#64748B" },
                            { label: "Damaged", value: prod.thisMonth.damages, color: prod.thisMonth.damages > 0 ? "#DC2626" : "#64748B" },
                            { label: "Used", value: prod.thisMonth.used, color: "#64748B" },
                            { label: "Sold", value: prod.thisMonth.sold, color: prod.thisMonth.sold > 0 ? "#2563EB" : "#64748B" },
                          ].map((stat) => (
                            <Box key={stat.label} sx={{ minWidth: 0 }}>
                              <Typography
                                sx={{
                                  fontSize: "0.56rem",
                                  fontWeight: 600,
                                  color: "#94A3B8",
                                  textTransform: "uppercase",
                                  letterSpacing: "0.02em",
                                }}
                              >
                                {stat.label}
                              </Typography>
                              <Typography sx={{ fontSize: "0.82rem", fontWeight: 700, color: stat.color }}>
                                {formatQty(stat.value)}
                              </Typography>
                            </Box>
                          ))}
                        </Box>
                      </Box>

                      {/* Card Footer */}
                      <Box
                        sx={{
                          width: "100%",
                          display: "flex",
                          justifyContent: "flex-end",
                          alignItems: "center",
                          pt: 1.25,
                          borderTop: "1px solid #F1F5F9",
                        }}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 0.5,
                          }}
                        >
                          <Typography
                            variant="caption"
                            sx={{
                              fontWeight: 700,
                              color: "#2563EB",
                              fontSize: "0.8rem",
                            }}
                          >
                            Open Card
                          </Typography>
                          <ArrowForwardIcon
                            sx={{ fontSize: 14, color: "#2563EB" }}
                          />
                        </Box>
                      </Box>
                    </CardActionArea>
                  </Card>
                ))}
              </Box>

              {/* Modern Pagination Footer */}
              {totalGridProducts > 0 && (
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
                    boxShadow: "none",
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
                      {displayStart} - {displayEnd}
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
                      {totalGridProducts}
                    </Typography>{" "}
                    products
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
                        "&:hover": { bgcolor: "#F1F5F9", color: "#0F172A" },
                        "&.Mui-selected": {
                          bgcolor: "#2563EB !important",
                          color: "#FFFFFF",
                          fontWeight: 700,
                          "&:hover": { bgcolor: "#1D4ED8 !important" },
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
      {/* VIEW 2: DRILLDOWN PRODUCTION BIN CARD DETAIL TABLE             */}
      {/* ------------------------------------------------------------- */}
      {selected !== null && (
        <ProductionBinCardDetailView
          // A fresh ledger (first page, no filters) for each product opened
          key={selected.productName ?? ""}
          productName={selected.productName}
          onBack={() => setSelected(null)}
        />
      )}
    </Box>
  );
}
