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
import SearchIcon from "@mui/icons-material/Search";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import LayersOutlinedIcon from "@mui/icons-material/LayersOutlined";
import ProductionBinCardDetailView, {
  ProductionLedgerRow,
  ProductItem,
} from "./ProductionBinCardDetailView";

export interface ProductionReport {
  id: string;
  reportDate: string;
  workerName: string;
  productType: string;
  qtyProduced: number;
  damages: number;
}

export default function ProductionBinCardView() {
  const [reports, setReports] = useState<ProductionReport[]>([]);
  const [loading, setLoading] = useState(true);

  // Navigation state: null => Grid Overview; string => Detail View
  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    null,
  );

  // Grid view search & pagination
  const [gridSearchQuery, setGridSearchQuery] = useState("");
  const [gridPage, setGridPage] = useState(1);

  // Fetch production items
  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/production/items");
      if (!res.ok) throw new Error("Failed to fetch production items");
      const data = await res.json();
      setReports(Array.isArray(data) ? data : data.content || []);
    } catch (err) {
      console.error("Failed to load production reports:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  // Compute distinct products list strictly from reports (no hardcoded default catalogs)
  const products: ProductItem[] = useMemo(() => {
    const productMap = new Map<string, { produced: number; damages: number }>();

    reports.forEach((rep) => {
      if (!rep.productType) return;
      const existing = productMap.get(rep.productType) || {
        produced: 0,
        damages: 0,
      };
      productMap.set(rep.productType, {
        produced: existing.produced + (Number(rep.qtyProduced) || 0),
        damages: existing.damages + (Number(rep.damages) || 0),
      });
    });

    return Array.from(productMap.entries()).map(([name, stats]) => ({
      productId: name.toLowerCase().replace(/[^a-z0-9]/g, "-"),
      productName: name,
      unitOfMeasure: "PCS",
      currentStock: Math.max(0, stats.produced - stats.damages),
    }));
  }, [reports]);

  // Active product when viewing details
  const activeProduct = useMemo(() => {
    if (!selectedProductId || selectedProductId === "all") return null;
    return products.find((p) => p.productId === selectedProductId) || null;
  }, [products, selectedProductId]);

  // Compute ledger rows
  const ledgerRows: ProductionLedgerRow[] = useMemo(() => {
    const sorted = [...reports].sort(
      (a, b) =>
        new Date(a.reportDate).getTime() - new Date(b.reportDate).getTime(),
    );

    const balanceMap = new Map<string, number>();
    const rows: ProductionLedgerRow[] = [];

    sorted.forEach((rep) => {
      if (
        activeProduct &&
        rep.productType.toLowerCase() !==
          activeProduct.productName.toLowerCase()
      ) {
        return;
      }

      const prev = balanceMap.get(rep.productType) || 0;
      const inQty = Number(rep.qtyProduced) || 0;
      const damageQty = Number(rep.damages) || 0;
      const outQty = 0; // standard out
      const closing = prev + inQty - outQty - damageQty;

      balanceMap.set(rep.productType, closing);

      rows.push({
        id: rep.id,
        date: rep.reportDate,
        productName: rep.productType,
        openingStock: prev,
        qtyIn: inQty,
        qtyOut: outQty,
        damage: damageQty,
        closingStock: closing,
        workerName: rep.workerName || "System",
        remarks:
          damageQty > 0
            ? `Produced ${inQty} with ${damageQty} damaged scrap`
            : "Manufacturing batch completed",
      });
    });

    return rows;
  }, [reports, activeProduct]);

  // Filtered products for Grid Overview
  const filteredGridProducts = useMemo(() => {
    return products.filter((p) =>
      p.productName.toLowerCase().includes(gridSearchQuery.toLowerCase()),
    );
  }, [products, gridSearchQuery]);

  // Dynamic Pagination calculations (Page 1: 1 master + 7 items = 8 cards; Page 2+: 8 cards)
  const totalGridPages = useMemo(() => {
    if (gridSearchQuery) {
      return Math.max(1, Math.ceil(filteredGridProducts.length / 8));
    }
    if (filteredGridProducts.length <= 7) return 1;
    return 1 + Math.ceil((filteredGridProducts.length - 7) / 8);
  }, [filteredGridProducts.length, gridSearchQuery]);

  const { paginatedGridProducts, displayStart, displayEnd } = useMemo(() => {
    if (filteredGridProducts.length === 0) {
      return { paginatedGridProducts: [], displayStart: 0, displayEnd: 0 };
    }

    if (!gridSearchQuery) {
      if (gridPage === 1) {
        const sliced = filteredGridProducts.slice(0, 7);
        return {
          paginatedGridProducts: sliced,
          displayStart: 1,
          displayEnd: Math.min(7, filteredGridProducts.length),
        };
      } else {
        const start = 7 + (gridPage - 2) * 8;
        const end = Math.min(start + 8, filteredGridProducts.length);
        return {
          paginatedGridProducts: filteredGridProducts.slice(start, end),
          displayStart: start + 1,
          displayEnd: end,
        };
      }
    } else {
      const start = (gridPage - 1) * 8;
      const end = Math.min(start + 8, filteredGridProducts.length);
      return {
        paginatedGridProducts: filteredGridProducts.slice(start, end),
        displayStart: start + 1,
        displayEnd: end,
      };
    }
  }, [filteredGridProducts, gridPage, gridSearchQuery]);

  return (
    <Box
      sx={{ width: "100%", display: "flex", flexDirection: "column", gap: 3 }}
    >
      {/* ------------------------------------------------------------- */}
      {/* VIEW 1: PRODUCTION CARDS OVERVIEW GRID                         */}
      {/* ------------------------------------------------------------- */}
      {selectedProductId === null && (
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
                  onClick={fetchReports}
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
            {/* Search Input */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                flex: 1,
                maxWidth: { xs: "100%", sm: 400 },
              }}
            >
              <TextField
                fullWidth
                size="small"
                placeholder="Search by product"
                value={gridSearchQuery}
                onChange={(e) => setGridSearchQuery(e.target.value)}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start" sx={{ mr: 1 }}>
                        <SearchIcon
                          sx={{
                            fontSize: 17,
                            color: gridSearchQuery ? "#2563EB" : "#64748B",
                          }}
                        />
                      </InputAdornment>
                    ),
                  },
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    bgcolor: "#FFFFFF",
                    borderRadius: "12px",
                    fontSize: "0.825rem",
                    fontWeight: 500,
                    height: 38,
                    pl: 1.25,
                    pr: 0.75,
                    display: "flex",
                    alignItems: "center",
                    boxShadow: "none",
                    "& fieldset": {
                      borderColor: "#E2E8F0",
                      borderWidth: "1.5px",
                    },
                    "&:hover": {
                      bgcolor: "#FFFFFF",
                      "& fieldset": {
                        borderColor: "#93C5FD",
                        borderWidth: "1.5px",
                      },
                    },
                    "&.Mui-focused": {
                      bgcolor: "#FFFFFF",
                      boxShadow: "none",
                      "& fieldset": {
                        borderColor: "#2563EB",
                        borderWidth: "1.5px",
                      },
                    },
                  },
                }}
              />
            </Box>

            {/* Quick Metrics Chip */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
              <Chip
                icon={
                  <LayersOutlinedIcon
                    style={{ fontSize: 14, color: "#64748B" }}
                  />
                }
                label={`${filteredGridProducts.length} of ${products.length} Products`}
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
                  gridAutoRows: "minmax(220px, auto)",
                  alignContent: "start",
                  minHeight: { xs: "auto", sm: 460 },
                  gap: 2,
                }}
              >
                {/* 1. All Products Combined Master Card (Only on Page 1 when not searching) */}
                {gridPage === 1 && !gridSearchQuery && (
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
                      onClick={() => setSelectedProductId("all")}
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
                      onClick={() => setSelectedProductId(prod.productId)}
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
                            Current Bin Balance
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
                            {prod.currentStock}{" "}
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
              {filteredGridProducts.length > 0 && (
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
                      {filteredGridProducts.length}
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
      {selectedProductId !== null && (
        <ProductionBinCardDetailView
          selectedProductId={selectedProductId}
          activeProduct={activeProduct}
          ledgerRows={ledgerRows}
          loading={loading}
          onBack={() => setSelectedProductId(null)}
          onRefresh={fetchReports}
        />
      )}
    </Box>
  );
}
