"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Box,
  Typography,
  Paper,
  Button,
  Alert,
  Chip,
  IconButton,
  Skeleton,
  Tooltip,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import { BarChart } from "@mui/x-charts/BarChart";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import RefreshIcon from "@mui/icons-material/Refresh";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import PrecisionManufacturingOutlinedIcon from "@mui/icons-material/PrecisionManufacturingOutlined";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import SavingsOutlinedIcon from "@mui/icons-material/SavingsOutlined";
import ReportProblemOutlinedIcon from "@mui/icons-material/ReportProblemOutlined";
import PeopleOutlineRoundedIcon from "@mui/icons-material/PeopleOutlineRounded";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import { formatMoney, formatQty } from "../production/types";
import { formatDayMonth as formatDay } from "@/utils/datetime";

type Period = "today" | "week" | "month" | "quarter" | "year";
type StockStatus = "HEALTHY" | "LOW" | "DEPLETED";

interface DashboardSummary {
  period: Period;
  startDate: string;
  endDate: string;
  activeWorkers: number;
  totalProduced: number;
  totalDamages: number;
  damageRate: number;
  avgDailyProduction: number;
  materialCost: number;
  materialCostPartial: boolean;
  unitsSold: number;
  salesRevenue: number;
  salesProfit: number | null;
  salesProfitPartial: boolean;
  inventory: { total: number; healthy: number; low: number; depleted: number };
  stockAlerts: { itemName: string; currentStock: number; unitOfMeasure: string; status: StockStatus }[];
  products: { productName: string; currentStock: number; producedInPeriod: number; soldInPeriod: number }[];
  trend: { label: string; produced: number; damaged: number; sold: number; revenue: number }[];
  recentActivity: {
    type: "PRODUCTION" | "SALE" | "STOCK_LOAD";
    itemName: string;
    quantity: number;
    unit: string;
    amount: number | null;
    note: string;
    date: string;
    recordedAt: string | null;
  }[];
}

const PERIODS: { value: Period; label: string; noun: string }[] = [
  { value: "today", label: "Today", noun: "today" },
  { value: "week", label: "Week", noun: "this week" },
  { value: "month", label: "Month", noun: "this month" },
  { value: "quarter", label: "Quarter", noun: "this quarter" },
  { value: "year", label: "Year", noun: "this year" },
];

// The official Google logo palette, used with the usual stock meanings:
// green = good / in stock, blue = sold, red = damaged / out, yellow = running low.
// Legends, labels and icons name each state, so the meaning never rests on colour alone.
const GOOGLE_BLUE = "#4285F4";
const GOOGLE_RED = "#EA4335";
const GOOGLE_YELLOW = "#FBBC05";
const GOOGLE_GREEN = "#34A853";
// Pale tints of the same four, for icon and chip backgrounds
const TINT_BLUE = "#E8F0FE";
const TINT_RED = "#FCE8E6";
const TINT_YELLOW = "#FEF7E0";
const TINT_GREEN = "#E6F4EA";

const SERIES_GOOD = GOOGLE_GREEN;
const SERIES_DAMAGED = GOOGLE_RED;
const SERIES_SOLD = GOOGLE_BLUE;

const INK = "#0F172A";
const MUTED = "#64748B";
const FAINT = "#94A3B8";
const BORDER = "#E2E8F0";

const cardSx = {
  p: { xs: 2, md: 2.5 },
  bgcolor: "#FFFFFF",
  border: `1px solid ${BORDER}`,
  borderRadius: "16px",
  boxShadow: "none",
  minWidth: 0,
};

const labelSx = {
  fontSize: "0.68rem",
  fontWeight: 700,
  color: FAINT,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
};

const cardTitleSx = { fontSize: "1rem", fontWeight: 800, color: INK, lineHeight: 1.3 };
const cardHintSx = { fontSize: "0.78rem", color: MUTED, mt: 0.25 };

// No axis lines, a dashed grid and a legend underneath, so the bars carry the chart
const chartSx = {
  "& .MuiChartsAxis-tickLabel": { fill: MUTED, fontSize: "0.72rem" },
  "& .MuiChartsGrid-line": { stroke: "#CBD5E1", strokeDasharray: "4 4" },
  "& .MuiChartsLegend-root": { pt: 1 },
  "& .MuiChartsLegend-label": { color: INK, fontSize: "0.8rem", fontWeight: 500 },
};

const barXAxis = (labels: string[]) => ({
  scaleType: "band" as const,
  data: labels,
  disableLine: true,
  disableTicks: true,
  // Wide bars with a clear gap between the groups
  categoryGapRatio: 0.45,
  barGapRatio: 0.12,
});

const barYAxis = {
  valueFormatter: (value: number | null) =>
    value == null ? "" : Math.abs(value) >= 1000 ? `${+(value / 1000).toFixed(1)}k` : String(value),
  disableLine: true,
  disableTicks: true,
  width: 44,
};

const legendBelow = {
  legend: { position: { vertical: "bottom" as const, horizontal: "center" as const } },
};

const STOCK_STATUS = {
  HEALTHY: { label: "Healthy", color: GOOGLE_GREEN, bg: TINT_GREEN, Icon: CheckCircleOutlineRoundedIcon },
  LOW: { label: "Low", color: GOOGLE_YELLOW, bg: TINT_YELLOW, Icon: WarningAmberRoundedIcon },
  DEPLETED: { label: "Out", color: GOOGLE_RED, bg: TINT_RED, Icon: ErrorOutlineRoundedIcon },
} as const;

// What each kind of entry is called, how its quantity reads, and what its amount means
const ACTIVITY = {
  PRODUCTION: {
    label: "Production",
    sign: "+",
    amountLabel: "material cost",
    color: GOOGLE_GREEN,
    bg: TINT_GREEN,
    Icon: PrecisionManufacturingOutlinedIcon,
  },
  SALE: {
    label: "Sale",
    sign: "−",
    amountLabel: "sale total",
    color: GOOGLE_BLUE,
    bg: TINT_BLUE,
    Icon: LocalShippingOutlinedIcon,
  },
  STOCK_LOAD: {
    label: "Stock load",
    sign: "+",
    amountLabel: "stock cost",
    color: "#475569",
    bg: "#F1F5F9",
    Icon: Inventory2OutlinedIcon,
  },
} as const;


// One activity entry: a table row on laptops, a compact two-line block on phones
const activityRowSx = {
  display: "grid",
  columnGap: { xs: 2, md: 0 },
  rowGap: 0.5,
  py: { xs: 1.25, md: 0 },
  borderTop: `1px solid ${BORDER}`,
  // On laptops the cells stretch to the row height so the column lines run unbroken
  alignItems: { xs: "center", md: "stretch" },
  // Same cell padding and lines as the shared tables
  px: { xs: 1.5, md: 0 },
  "& > *": {
    px: { md: 2 },
    py: { md: 1.25 },
    alignContent: { md: "center" },
  },
  // Every cell after the first gets the column line. (Written as a sibling rule:
  // ":first-child" selectors trigger a warning with server-side rendering.)
  "& > * + *": {
    borderLeft: { md: `1px solid ${BORDER}` },
  },
  gridTemplateColumns: {
    xs: "minmax(0, 1fr) auto",
    md: "100px 160px minmax(0, 1.4fr) 160px minmax(0, 1.2fr) 180px",
  },
  gridTemplateAreas: {
    xs: `"type date" "item amount" "qty amount" "note note"`,
    md: `"date type item qty note amount"`,
  },
};

function SectionLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Button
      component={Link}
      href={href}
      size="small"
      endIcon={<ArrowForwardRoundedIcon sx={{ fontSize: 14 }} />}
      sx={{ fontSize: "0.78rem", fontWeight: 700, color: GOOGLE_BLUE, px: 1, py: 0.25, flexShrink: 0 }}
    >
      {children}
    </Button>
  );
}

function EmptyNote({ children }: { children: React.ReactNode }) {
  return (
    <Box
      sx={{
        flexGrow: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: 120,
        textAlign: "center",
        color: MUTED,
        fontSize: "0.85rem",
        px: 2,
      }}
    >
      {children}
    </Box>
  );
}

export default function OverviewView() {
  const [period, setPeriod] = useState<Period>("month");
  const [reloadToken, setReloadToken] = useState(0);
  const [result, setResult] = useState<{ key: string; data: DashboardSummary | null; error: string }>({
    key: "",
    data: null,
    error: "",
  });

  const requestKey = `${period}#${reloadToken}`;
  // Loading is derived: what is on screen belongs to an older request
  const loading = result.key !== requestKey;
  const data = result.data;

  useEffect(() => {
    const controller = new AbortController();

    fetch(`/api/dashboard/summary?period=${period}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load dashboard data");
        return res.json();
      })
      .then((summary: DashboardSummary) => {
        // A backend started before the dashboard update answers in the old shape
        if (!Array.isArray(summary?.trend)) {
          throw new Error("The backend is still running the old dashboard code. Restart it to load the dashboard.");
        }
        setResult({ key: requestKey, data: summary, error: "" });
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setResult((prev) => ({
          ...prev,
          key: requestKey,
          error: err instanceof Error ? err.message : "Failed to load dashboard data",
        }));
      });

    return () => controller.abort();
  }, [period, requestKey]);

  const periodNoun = PERIODS.find((p) => p.value === period)?.noun ?? "";

  const kpis = data
    ? [
        {
          label: "Produced",
          value: formatQty(data.totalProduced),
          unit: "PCS",
          hint: data.totalProduced > 0 ? `${formatQty(data.avgDailyProduction)} per production day` : "No production recorded",
          Icon: PrecisionManufacturingOutlinedIcon,
          color: GOOGLE_GREEN,
          bg: TINT_GREEN,
        },
        {
          label: "Sold",
          value: formatQty(data.unitsSold),
          unit: "PCS",
          hint: data.unitsSold > 0 ? `${formatMoney(data.salesRevenue)} in sales` : "No sales recorded",
          Icon: LocalShippingOutlinedIcon,
          color: GOOGLE_BLUE,
          bg: TINT_BLUE,
        },
        {
          label: "Sales revenue",
          value: formatMoney(data.salesRevenue),
          unit: "",
          hint:
            data.salesProfit != null
              ? `${formatMoney(data.salesProfit)} over material cost${data.salesProfitPartial ? " *" : ""}`
              : "Profit shows once material costs are known",
          Icon: PaymentsOutlinedIcon,
          color: GOOGLE_BLUE,
          bg: TINT_BLUE,
        },
        {
          label: "Material cost",
          value: `${formatMoney(data.materialCost)}${data.materialCostPartial ? " *" : ""}`,
          unit: "",
          hint: data.materialCostPartial ? "* materials without a cost not included" : "Used in production",
          Icon: SavingsOutlinedIcon,
          color: "#7C3AED",
          bg: "#F5F3FF",
        },
        {
          label: "Damage rate",
          value: `${data.damageRate.toFixed(1)}%`,
          unit: "",
          hint: `${formatQty(data.totalDamages)} PCS damaged`,
          Icon: ReportProblemOutlinedIcon,
          color: data.totalDamages > 0 ? GOOGLE_RED : "#64748B",
          bg: data.totalDamages > 0 ? TINT_RED : "#F1F5F9",
        },
        {
          label: "Active workers",
          value: formatQty(data.activeWorkers),
          unit: "",
          hint: "Currently active",
          Icon: PeopleOutlineRoundedIcon,
          color: "#0891B2",
          bg: "#ECFEFF",
        },
      ]
    : [];

  const trendLabels = data?.trend.map((point) => point.label) ?? [];
  const hasVolume = Boolean(data?.trend.some((point) => point.produced > 0 || point.sold > 0));
  const hasRevenue = Boolean(data?.trend.some((point) => point.revenue > 0));
  const maxProductStock = Math.max(1, ...(data?.products.map((p) => p.currentStock) ?? []));
  const inventoryParts = data
    ? ([
        { status: "HEALTHY", count: data.inventory.healthy },
        { status: "LOW", count: data.inventory.low },
        { status: "DEPLETED", count: data.inventory.depleted },
      ] as const)
    : [];

  return (
    <Box sx={{ width: "100%", display: "flex", flexDirection: "column", gap: 2.5 }}>
      {/* Header: title, period filter, quick actions */}
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", lg: "row" },
          justifyContent: "space-between",
          alignItems: { xs: "stretch", lg: "center" },
          gap: 2,
        }}
      >
        <Box>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 800,
              color: INK,
              letterSpacing: "-0.02em",
              lineHeight: 1.2,
              fontSize: { xs: "1.5rem", sm: "2.125rem" },
            }}
          >
            Overview
          </Typography>
          <Typography variant="body2" sx={{ color: MUTED, mt: 0.5, fontWeight: 500 }}>
            {data
              ? `${formatDay(data.startDate)} – ${formatDay(data.endDate)}: production, sales and stock at a glance.`
              : "Production, sales and stock at a glance."}
          </Typography>
        </Box>

        <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1.25 }}>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={period}
            onChange={(_, value: Period | null) => value && setPeriod(value)}
            aria-label="Period"
            sx={{
              bgcolor: "#FFFFFF",
              borderRadius: "10px",
              "& .MuiToggleButton-root": {
                px: { xs: 1.1, sm: 1.6 },
                height: 36,
                fontSize: "0.8rem",
                fontWeight: 700,
                textTransform: "none",
                color: MUTED,
                borderColor: BORDER,
                "&.Mui-selected": { bgcolor: GOOGLE_BLUE, color: "#FFFFFF", borderColor: GOOGLE_BLUE },
                "&.Mui-selected:hover": { bgcolor: "#3367D6" },
              },
              "& .MuiToggleButton-root:first-of-type": { borderRadius: "10px 0 0 10px" },
              "& .MuiToggleButton-root:last-of-type": { borderRadius: "0 10px 10px 0" },
            }}
          >
            {PERIODS.map((p) => (
              <ToggleButton key={p.value} value={p.value}>
                {p.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>

          <Tooltip title="Refresh">
            <IconButton
              onClick={() => setReloadToken((token) => token + 1)}
              sx={{
                bgcolor: "#FFFFFF",
                border: `1px solid ${BORDER}`,
                borderRadius: "10px",
                width: 36,
                height: 36,
                color: "#475569",
                "&:hover": { bgcolor: "#F8FAFC", color: INK },
              }}
            >
              <RefreshIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>

          <Button
            component={Link}
            href="/dashboard/sales"
            variant="outlined"
            startIcon={<AddRoundedIcon sx={{ fontSize: 18 }} />}
            sx={{
              borderRadius: "10px",
              borderColor: "#CBD5E1",
              color: "#334155",
              bgcolor: "#FFFFFF",
              fontWeight: 700,
              fontSize: "0.825rem",
              height: 36,
              px: 1.75,
              "&:hover": { borderColor: GOOGLE_BLUE, bgcolor: "#F8FAFC" },
            }}
          >
            Record Sale
          </Button>
          <Button
            component={Link}
            href="/dashboard/production"
            variant="contained"
            disableElevation
            startIcon={<AddRoundedIcon sx={{ fontSize: 18 }} />}
            sx={{
              borderRadius: "10px",
              bgcolor: GOOGLE_BLUE,
              fontWeight: 700,
              fontSize: "0.825rem",
              height: 36,
              px: 1.75,
              "&:hover": { bgcolor: "#3367D6" },
            }}
          >
            Record Production
          </Button>
        </Box>
      </Box>

      {result.error && (
        <Alert severity="error" sx={{ borderRadius: "12px" }}>
          {result.error}
        </Alert>
      )}

      {!data ? (
        // First load
        <Box
          sx={{
            display: "grid",
            gap: 2,
            gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", md: "repeat(3, minmax(0, 1fr))", xl: "repeat(6, minmax(0, 1fr))" },
          }}
        >
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} variant="rounded" height={112} sx={{ borderRadius: "16px" }} />
          ))}
          <Skeleton variant="rounded" height={340} sx={{ borderRadius: "16px", gridColumn: "1 / -1" }} />
        </Box>
      ) : (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
            opacity: loading ? 0.6 : 1,
            transition: "opacity 0.15s ease",
          }}
        >
          {/* ---------------- Headline figures for the period ---------------- */}
          <Box
            sx={{
              display: "grid",
              gap: 2,
              gridTemplateColumns: {
                xs: "repeat(2, minmax(0, 1fr))",
                md: "repeat(3, minmax(0, 1fr))",
                xl: "repeat(6, minmax(0, 1fr))",
              },
            }}
          >
            {kpis.map((kpi) => (
              <Paper key={kpi.label} elevation={0} sx={{ ...cardSx, p: 2 }}>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, mb: 1 }}>
                  <Typography sx={labelSx}>{kpi.label}</Typography>
                  <Box
                    sx={{
                      width: 30,
                      height: 30,
                      borderRadius: "9px",
                      bgcolor: kpi.bg,
                      color: kpi.color,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <kpi.Icon sx={{ fontSize: 17 }} />
                  </Box>
                </Box>
                <Typography
                  sx={{
                    fontSize: { xs: "1.15rem", sm: "1.35rem" },
                    fontWeight: 800,
                    color: INK,
                    lineHeight: 1.25,
                    overflowWrap: "anywhere",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {kpi.value}
                  {kpi.unit && (
                    <Box component="span" sx={{ fontSize: "0.72rem", color: MUTED, fontWeight: 700, ml: 0.5 }}>
                      {kpi.unit}
                    </Box>
                  )}
                </Typography>
                <Typography sx={{ fontSize: "0.74rem", color: MUTED, mt: 0.5 }}>{kpi.hint}</Typography>
              </Paper>
            ))}
          </Box>

          {/* ---------------- Trend + stock health ---------------- */}
          <Box
            sx={{
              display: "grid",
              gap: 2,
              gridTemplateColumns: { xs: "minmax(0, 1fr)", lg: "minmax(0, 2fr) minmax(0, 1fr)" },
            }}
          >
            <Paper elevation={0} sx={{ ...cardSx, display: "flex", flexDirection: "column" }}>
              <Box>
                <Typography sx={cardTitleSx}>Production and sales</Typography>
                <Typography sx={cardHintSx}>
                  Each pair of bars: pieces produced (good and damaged) next to pieces sold, {periodNoun}.
                </Typography>
              </Box>
              {hasVolume ? (
                <Box sx={{ flexGrow: 1, minHeight: 320 }}>
                <BarChart
                  xAxis={[barXAxis(trendLabels)]}
                  yAxis={[barYAxis]}
                  series={[
                    // First bar: what was produced, split into good and damaged pieces
                    {
                      data: data.trend.map((point) => point.produced - point.damaged),
                      label: "Good pieces",
                      stack: "produced",
                      color: SERIES_GOOD,
                      labelMarkType: "circle",
                      valueFormatter: (value) => `${formatQty(value ?? 0)} PCS`,
                    },
                    {
                      data: data.trend.map((point) => point.damaged),
                      label: "Damaged",
                      stack: "produced",
                      color: SERIES_DAMAGED,
                      labelMarkType: "circle",
                      valueFormatter: (value) => `${formatQty(value ?? 0)} PCS`,
                    },
                    // Second bar: what was sold
                    {
                      data: data.trend.map((point) => point.sold),
                      label: "Sold",
                      stack: "sold",
                      color: SERIES_SOLD,
                      labelMarkType: "circle",
                      valueFormatter: (value) => `${formatQty(value ?? 0)} PCS`,
                    },
                  ]}
                  grid={{ horizontal: true }}
                  borderRadius={8}
                  slotProps={legendBelow}
                  margin={{ top: 12, right: 8, bottom: 0, left: 0 }}
                  sx={chartSx}
                />
                </Box>
              ) : (
                <EmptyNote>No production or sales recorded {periodNoun}.</EmptyNote>
              )}
            </Paper>

            <Paper elevation={0} sx={{ ...cardSx, display: "flex", flexDirection: "column", gap: 1.75 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 1 }}>
                <Box>
                  <Typography sx={cardTitleSx}>Material stock</Typography>
                  <Typography sx={cardHintSx}>{formatQty(data.inventory.total)} materials right now.</Typography>
                </Box>
                <SectionLink href="/dashboard/inventory">Inventory</SectionLink>
              </Box>

              {/* Share of materials in each state; counts are labelled below, never colour alone */}
              {data.inventory.total > 0 && (
                <Box sx={{ display: "flex", gap: "2px", height: 10, borderRadius: "5px", overflow: "hidden" }}>
                  {inventoryParts
                    .filter((part) => part.count > 0)
                    .map((part) => (
                      <Tooltip key={part.status} title={`${STOCK_STATUS[part.status].label}: ${part.count}`}>
                        <Box sx={{ flexGrow: part.count, flexBasis: 0, bgcolor: STOCK_STATUS[part.status].color }} />
                      </Tooltip>
                    ))}
                </Box>
              )}
              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 1 }}>
                {inventoryParts.map((part) => {
                  const meta = STOCK_STATUS[part.status];
                  return (
                    <Box key={part.status}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                        <meta.Icon sx={{ fontSize: 14, color: meta.color }} />
                        <Typography sx={{ fontSize: "0.74rem", color: MUTED, fontWeight: 600 }}>{meta.label}</Typography>
                      </Box>
                      <Typography sx={{ fontSize: "1.2rem", fontWeight: 800, color: INK }}>{part.count}</Typography>
                    </Box>
                  );
                })}
              </Box>

              <Box sx={{ borderTop: `1px solid ${BORDER}`, pt: 1.5, display: "flex", flexDirection: "column", gap: 1 }}>
                <Typography sx={labelSx}>Needs attention</Typography>
                {data.stockAlerts.length === 0 ? (
                  <Typography sx={{ fontSize: "0.85rem", color: MUTED }}>Every material is well stocked.</Typography>
                ) : (
                  data.stockAlerts.map((alert) => {
                    const meta = STOCK_STATUS[alert.status] ?? STOCK_STATUS.DEPLETED;
                    return (
                      <Box
                        key={alert.itemName}
                        sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}
                      >
                        <Typography
                          sx={{
                            fontSize: "0.85rem",
                            fontWeight: 600,
                            color: INK,
                            minWidth: 0,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {alert.itemName}
                        </Typography>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0 }}>
                          <Typography sx={{ fontSize: "0.78rem", color: MUTED, fontVariantNumeric: "tabular-nums" }}>
                            {formatQty(alert.currentStock)} {alert.unitOfMeasure}
                          </Typography>
                          <Chip
                            icon={<meta.Icon style={{ fontSize: 13, color: meta.color }} />}
                            label={meta.label}
                            size="small"
                            sx={{
                              height: 22,
                              fontSize: "0.7rem",
                              fontWeight: 700,
                              bgcolor: meta.bg,
                              // dark ink for the label; the icon carries the colour
                              color: "#334155",
                            }}
                          />
                        </Box>
                      </Box>
                    );
                  })
                )}
              </Box>
            </Paper>
          </Box>

          {/* ---------------- Revenue, product stock, activity ---------------- */}
          <Box
            sx={{
              display: "grid",
              gap: 2,
              gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "repeat(2, minmax(0, 1fr))" },
            }}
          >
            <Paper elevation={0} sx={{ ...cardSx, display: "flex", flexDirection: "column" }}>
              <Box>
                <Typography sx={cardTitleSx}>Sales revenue</Typography>
                <Typography sx={cardHintSx}>
                  {formatMoney(data.salesRevenue)} {periodNoun}.
                </Typography>
              </Box>
              {hasRevenue ? (
                <Box sx={{ flexGrow: 1, minHeight: 280 }}>
                <BarChart
                  xAxis={[barXAxis(trendLabels)]}
                  yAxis={[barYAxis]}
                  series={[
                    {
                      data: data.trend.map((point) => point.revenue),
                      label: "Sales revenue (Rs.)",
                      color: SERIES_SOLD,
                      labelMarkType: "circle",
                      valueFormatter: (value) => formatMoney(value ?? 0),
                    },
                  ]}
                  grid={{ horizontal: true }}
                  borderRadius={8}
                  slotProps={legendBelow}
                  margin={{ top: 12, right: 8, bottom: 0, left: 0 }}
                  sx={chartSx}
                />
                </Box>
              ) : (
                <EmptyNote>No sales recorded {periodNoun}.</EmptyNote>
              )}
            </Paper>

            <Paper elevation={0} sx={{ ...cardSx, display: "flex", flexDirection: "column", gap: 1.5 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 1 }}>
                <Box>
                  <Typography sx={cardTitleSx}>Product stock</Typography>
                  <Typography sx={cardHintSx}>In stock now, with what moved {periodNoun}.</Typography>
                </Box>
                <SectionLink href="/dashboard/bin-cards/production">Bin cards</SectionLink>
              </Box>
              {data.products.length === 0 ? (
                <EmptyNote>No products have been produced yet.</EmptyNote>
              ) : (
                data.products.slice(0, 6).map((product) => (
                  <Box key={product.productName}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 1 }}>
                      <Typography
                        sx={{
                          fontSize: "0.85rem",
                          fontWeight: 700,
                          color: INK,
                          minWidth: 0,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {product.productName}
                      </Typography>
                      <Typography sx={{ fontSize: "0.85rem", fontWeight: 800, color: INK, flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>
                        {formatQty(product.currentStock)}{" "}
                        <Box component="span" sx={{ fontSize: "0.68rem", color: MUTED, fontWeight: 700 }}>
                          PCS
                        </Box>
                      </Typography>
                    </Box>
                    {/* Stock relative to the best-stocked product */}
                    <Box sx={{ height: 6, borderRadius: "3px", bgcolor: "#F1F5F9", my: 0.6 }}>
                      <Box
                        sx={{
                          height: "100%",
                          width: `${(product.currentStock / maxProductStock) * 100}%`,
                          bgcolor: SERIES_GOOD,
                          borderRadius: "3px",
                        }}
                      />
                    </Box>
                    <Typography sx={{ fontSize: "0.72rem", color: MUTED }}>
                      +{formatQty(product.producedInPeriod)} produced · −{formatQty(product.soldInPeriod)} sold
                    </Typography>
                  </Box>
                ))
              )}
            </Paper>

            <Paper
              elevation={0}
              sx={{ ...cardSx, display: "flex", flexDirection: "column", gap: 1.5, gridColumn: "1 / -1" }}
            >
              <Box>
                <Typography sx={cardTitleSx}>Recent activity</Typography>
                <Typography sx={cardHintSx}>
                  The latest production, sales and stock loads, newest first.
                </Typography>
              </Box>
              {data.recentActivity.length === 0 ? (
                <EmptyNote>Nothing recorded yet.</EmptyNote>
              ) : (
                // Framed like the shared tables: outer border, shaded heading row, row and column lines
                <Box sx={{ border: `1px solid ${BORDER}`, borderRadius: "12px", overflow: "hidden" }}>
                  {/* Column headings: shown where the entries fit on one line */}
                  <Box
                    sx={{
                      ...activityRowSx,
                      display: { xs: "none", md: "grid" },
                      borderTop: "none",
                      bgcolor: "#F8FAFC",
                      "& .MuiTypography-root": { color: MUTED, fontSize: "0.72rem", fontWeight: 600 },
                    }}
                  >
                    <Typography sx={{ ...labelSx, gridArea: "date" }}>Date</Typography>
                    <Typography sx={{ ...labelSx, gridArea: "type" }}>Type</Typography>
                    <Typography sx={{ ...labelSx, gridArea: "item" }}>Product / material</Typography>
                    <Typography sx={{ ...labelSx, gridArea: "qty", textAlign: "right" }}>Quantity</Typography>
                    <Typography sx={{ ...labelSx, gridArea: "note" }}>Details</Typography>
                    <Typography sx={{ ...labelSx, gridArea: "amount", textAlign: "right" }}>Amount</Typography>
                  </Box>

                  {data.recentActivity.map((entry, index) => {
                    const meta = ACTIVITY[entry.type] ?? ACTIVITY.PRODUCTION;
                    return (
                      <Box key={`${entry.type}-${index}`} sx={activityRowSx}>
                        <Typography sx={{ gridArea: "date", fontSize: "0.82rem", color: MUTED, whiteSpace: "nowrap" }}>
                          {formatDay(entry.date)}
                        </Typography>
                        <Box sx={{ gridArea: "type" }}>
                          <Chip
                            icon={<meta.Icon style={{ fontSize: 14, color: meta.color }} />}
                            label={meta.label}
                            size="small"
                            sx={{
                              height: 24,
                              fontSize: "0.74rem",
                              fontWeight: 700,
                              bgcolor: meta.bg,
                              // dark ink for the label; the icon carries the colour
                              color: "#334155",
                            }}
                          />
                        </Box>
                        <Typography
                          sx={{ gridArea: "item", fontSize: "0.88rem", fontWeight: 700, color: INK, overflowWrap: "anywhere" }}
                        >
                          {entry.itemName}
                        </Typography>
                        <Typography
                          sx={{
                            gridArea: "qty",
                            fontSize: "0.88rem",
                            fontWeight: 700,
                            color: INK,
                            textAlign: { md: "right" },
                            whiteSpace: "nowrap",
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {meta.sign}
                          {formatQty(entry.quantity)}{" "}
                          <Box component="span" sx={{ fontSize: "0.7rem", color: MUTED, fontWeight: 700 }}>
                            {entry.unit}
                          </Box>
                        </Typography>
                        <Typography sx={{ gridArea: "note", fontSize: "0.82rem", color: MUTED, overflowWrap: "anywhere" }}>
                          {entry.note || "-"}
                        </Typography>
                        <Box sx={{ gridArea: "amount", textAlign: "right" }}>
                          <Typography
                            sx={{
                              fontSize: "0.88rem",
                              fontWeight: 700,
                              color: entry.amount != null ? INK : FAINT,
                              whiteSpace: "nowrap",
                              fontVariantNumeric: "tabular-nums",
                            }}
                          >
                            {entry.amount != null ? formatMoney(entry.amount) : "-"}
                          </Typography>
                          {entry.amount != null && (
                            <Typography sx={{ fontSize: "0.68rem", color: FAINT }}>{meta.amountLabel}</Typography>
                          )}
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
              )}
            </Paper>
          </Box>
        </Box>
      )}
    </Box>
  );
}
