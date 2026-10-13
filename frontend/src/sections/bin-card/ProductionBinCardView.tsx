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
  ProductionLedgerRow,
  ProductItem,
} from "./ProductionBinCardDetailView";
import {
  MaterialUsageDto,
  ProductSale,
  ProductUsageDto,
  formatMoney,
  formatQty,
} from "../production/types";
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

export default function ProductionBinCardView() {
  const [reports, setReports] = useState<ProductionReport[]>([]);
  const [sales, setSales] = useState<ProductSale[]>([]);
  const [loading, setLoading] = useState(true);

  // Navigation state: null => Grid Overview; string => Detail View
  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    null,
  );

  // Grid view search & pagination
  const [gridSearchQuery, setGridSearchQuery] = useState("");
  const [gridPage, setGridPage] = useState(1);

  // Fetch production items and the sales that took products back out of stock
  const fetchReports = async () => {
    setLoading(true);
    try {
      const [res, salesRes] = await Promise.all([
        fetch("/api/production/items"),
        fetch("/api/sales"),
      ]);
      if (!res.ok || !salesRes.ok) throw new Error("Failed to fetch production items");
      const data = await res.json();
      setReports(Array.isArray(data) ? data : data.content || []);
      setSales(await salesRes.json());
    } catch (err) {
      console.error("Failed to load production reports:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  // Compute distinct products list dynamically from production items & consumptions
  // The month the cards' figures cover; the balance itself is all-time
  const month = useMemo(() => currentMonthInSriLanka(), []);

  const products: ProductItem[] = useMemo(() => {
    interface Totals {
      produced: number;
      damages: number;
      used: number;
      sold: number;
    }
    const empty = (): Totals => ({ produced: 0, damages: 0, used: 0, sold: 0 });
    // Per product: all-time totals (they make up the balance) and this month's alone
    const productMap = new Map<string, { all: Totals; month: Totals }>();
    const add = (name: string, date: string, field: keyof Totals, quantity: number) => {
      const entry = productMap.get(name) ?? { all: empty(), month: empty() };
      entry.all[field] += quantity;
      if (date.startsWith(month.prefix)) entry.month[field] += quantity;
      productMap.set(name, entry);
    };

    reports.forEach((rep) => {
      const pName = rep.productType?.trim();
      if (pName) {
        add(pName, rep.reportDate, "produced", Number(rep.qtyProduced) || 0);
        add(pName, rep.reportDate, "damages", Number(rep.damages) || 0);
      }

      // Manufactured items used as components in this report
      rep.productUsages?.forEach((pu) => {
        const uName = pu.productName?.trim();
        if (uName) add(uName, rep.reportDate, "used", Number(pu.amount) || 0);
      });
    });

    sales.forEach((sale) => add(sale.productName, sale.saleDate, "sold", Number(sale.quantity) || 0));

    return Array.from(productMap.entries()).map(([name, totals]) => ({
      productId: name.toLowerCase().replace(/[^a-z0-9]/g, "-"),
      productName: name,
      unitOfMeasure: "PCS",
      currentStock: Math.max(0, totals.all.produced - totals.all.damages - totals.all.used - totals.all.sold),
      produced: totals.all.produced,
      damages: totals.all.damages,
      used: totals.all.used,
      sold: totals.all.sold,
      thisMonth: totals.month,
    }));
  }, [reports, sales, month.prefix]);

  // Active product when viewing details
  const activeProduct = useMemo(() => {
    if (!selectedProductId || selectedProductId === "all") return null;
    return products.find((p) => p.productId === selectedProductId) || null;
  }, [products, selectedProductId]);

  // Compute ledger rows accounting for production inflows and consumption outflows
  const ledgerRows: ProductionLedgerRow[] = useMemo(() => {
    interface RawMovement {
      id: string;
      // The production entry or sale behind the movement, for editing it
      sourceId?: string;
      unitPrice?: number;
      editedBy?: string | null;
      editedAt?: string | null;
      editCount?: number | null;
      editNote?: string | null;
      date: string;
      productName: string;
      qtyIn: number;
      qtyOut: number;
      damage: number;
      status: ProductionStatusType;
      materials?: MaterialUsageDto[];
      productUsages?: ProductUsageDto[];
      materialCost: number | null;
      materialCostPartial: boolean;
      workerName?: string;
      remarks: string;
      type: "PRODUCTION" | "CONSUMPTION" | "SALE";
    }

    const movements: RawMovement[] = [];

    // Both lists arrive newest first; walk them oldest first so entries of the same
    // day keep the order they were recorded in
    [...reports].reverse().forEach((rep) => {
      // 1. Production output movement
      if (rep.productType) {
        const inQty = Number(rep.qtyProduced) || 0;
        const damageQty = Number(rep.damages) || 0;
        const materials = rep.materials ?? [];
        const costed = materials.filter((m) => m.unitCost != null);
        movements.push({
          id: `prod-${rep.id}`,
          sourceId: rep.id,
          editedBy: rep.editedBy,
          editedAt: rep.editedAt,
          editCount: rep.editCount,
          editNote: rep.editNote,
          date: rep.reportDate,
          productName: rep.productType,
          qtyIn: inQty,
          qtyOut: 0,
          damage: damageQty,
          status: rep.status || "STORED",
          materials: rep.materials,
          productUsages: rep.productUsages,
          materialCost:
            costed.length > 0
              ? costed.reduce((sum, m) => sum + Number(m.amount) * Number(m.unitCost), 0)
              : null,
          materialCostPartial: costed.length > 0 && costed.length < materials.length,
          workerName: rep.workerName,
          remarks:
            damageQty > 0
              ? `Produced ${inQty} (${damageQty} damaged)`
              : `Manufactured ${inQty} usable units`,
          type: "PRODUCTION",
        });
      }

      // 2. Component consumption movements
      if (rep.productUsages && Array.isArray(rep.productUsages)) {
        rep.productUsages.forEach((pu, idx) => {
          const uName = pu.productName?.trim();
          if (!uName) return;
          const amt = Number(pu.amount) || 0;
          if (amt <= 0) return;

          movements.push({
            id: `cons-${rep.id}-${idx}`,
            date: rep.reportDate,
            productName: uName,
            qtyIn: 0,
            qtyOut: amt,
            damage: 0,
            status: "CONSUMED",
            materialCost: null,
            materialCostPartial: false,
            workerName: rep.workerName,
            remarks: `Used to produce ${rep.productType}`,
            type: "CONSUMPTION",
          });
        });
      }
    });

    // 3. Sales
    [...sales].reverse().forEach((sale) => {
      movements.push({
        id: `sale-${sale.id}`,
        sourceId: sale.id,
        unitPrice: Number(sale.unitPrice),
        editedBy: sale.editedBy,
        editedAt: sale.editedAt,
        editCount: sale.editCount,
        editNote: sale.editNote,
        date: sale.saleDate,
        productName: sale.productName,
        qtyIn: 0,
        qtyOut: Number(sale.quantity) || 0,
        damage: 0,
        status: "SOLD",
        materialCost: null,
        materialCostPartial: false,
        remarks: `Sold at ${formatMoney(Number(sale.unitPrice))} per piece · ${formatMoney(
          Number(sale.unitPrice) * Number(sale.quantity),
        )} total`,
        type: "SALE",
      });
    });

    // Chronological sort
    movements.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

    const balanceMap = new Map<string, number>();
    const rows: ProductionLedgerRow[] = [];

    movements.forEach((m) => {
      const prev = balanceMap.get(m.productName) || 0;
      const closing = prev + m.qtyIn - m.qtyOut - m.damage;
      balanceMap.set(m.productName, closing);

      // If activeProduct selected, only include movements for that product
      if (
        activeProduct &&
        m.productName.toLowerCase() !== activeProduct.productName.toLowerCase()
      ) {
        return;
      }

      rows.push({
        ...m,
        seq: rows.length,
        openingStock: prev,
        closingStock: closing,
      });
    });

    return rows;
  }, [reports, sales, activeProduct]);

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
            <SearchBar
              value={gridSearchQuery}
              onChange={setGridSearchQuery}
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
                  gridAutoRows: "minmax(280px, auto)",
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
