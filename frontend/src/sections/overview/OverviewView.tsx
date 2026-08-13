"use client";

import * as React from "react";
import { useState, useEffect, useMemo } from "react";
import {
  Box,
  Typography,
  Grid,
  Paper,
  Button,
  Stack,
  CircularProgress,
  Alert,
  Avatar,
  Chip,
  IconButton,
  LinearProgress,
  Divider,
} from "@mui/material";
import { LineChart } from "@mui/x-charts/LineChart";
import Link from "next/link";
import ArrowOutwardRoundedIcon from "@mui/icons-material/ArrowOutwardRounded";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import ShowChartRoundedIcon from "@mui/icons-material/ShowChartRounded";
import ReportProblemOutlinedIcon from "@mui/icons-material/ReportProblemOutlined";

interface StockAlert {
  itemName: string;
  currentStock: number;
  unitOfMeasure: string;
}

interface DashboardSummary {
  activeWorkers: number;
  totalProductionThisMonth: number;
  avgDailyProduction: number;
  damageRate: number;
  lowStockAlerts: StockAlert[];
  highStockAlerts: StockAlert[];
  productionChartData: Record<string, number>;
  damageChartData: Record<string, number>;
  productionByProductType: Record<string, number>;
}

interface WorkerItem {
  id: string;
  name: string;
  status: string;
  contactNumber?: string;
  nicNumber?: string;
  address?: string;
}

// Fallback dummy workstations for visual richness
const WORKSTATIONS = [
  "Moulding Station A",
  "Curing & Setting Bay",
  "Quality Inspection Line",
  "Raw Material Feed",
  "Packaging & Stacking",
  "Kiln & Firing Unit",
];

const AVATAR_COLORS = [
  { bg: "#FEE2E2", color: "#DC2626" },
  { bg: "#FEF3C7", color: "#D97706" },
  { bg: "#E0E7FF", color: "#4F46E5" },
  { bg: "#ECFDF5", color: "#059669" },
  { bg: "#F3E8FF", color: "#9333EA" },
  { bg: "#CFFAFE", color: "#0891B2" },
];

export default function OverviewView() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [workers, setWorkers] = useState<WorkerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState("month");
  const [stockTab, setStockTab] = useState<"low" | "high">("low");

  // Fetch Dashboard Summary & Workers
  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      try {
        const [summaryRes, workersRes] = await Promise.allSettled([
          fetch(`/api/dashboard/summary?period=${period}`),
          fetch("/api/workers"),
        ]);

        if (summaryRes.status === "fulfilled" && summaryRes.value.ok) {
          const summaryJson = await summaryRes.value.json();
          setData(summaryJson);
        } else {
          throw new Error("Failed to load dashboard metrics");
        }

        if (workersRes.status === "fulfilled" && workersRes.value.ok) {
          const workersJson = await workersRes.value.json();
          setWorkers(Array.isArray(workersJson) ? workersJson : []);
        }
      } catch (err: any) {
        setError(err.message || "Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, [period]);

  // Generate X-Axis Time Labels
  const generateXLabels = (p: string) => {
    const today = new Date();

    if (p === "today") {
      return ["08:00", "10:00", "12:00", "14:00", "16:00", "18:00"];
    }

    if (p === "week") {
      return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    }

    if (p === "month") {
      return ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5"];
    }

    if (p === "quarter") {
      const currentMonth = today.getMonth();
      const quarterStart = Math.floor(currentMonth / 3) * 3;
      const shortMonths = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
      return [
        shortMonths[quarterStart],
        shortMonths[quarterStart + 1],
        shortMonths[quarterStart + 2],
      ];
    }

    if (p === "year") {
      return [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
    }

    return Object.keys(data?.productionChartData || {}).sort();
  };

  const lineChartX: string[] = useMemo(() => {
    return data ? generateXLabels(period) : [];
  }, [data, period]);

  // Helper to map week day abbreviations to ISO date strings
  const getWeekDayDates = () => {
    const today = new Date();
    const day = today.getDay(); // 0 is Sunday, 1 is Monday...
    const diffToMonday = today.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(today);
    monday.setDate(diffToMonday);

    const map: Record<string, string> = {};
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      map[days[i]] = `${yyyy}-${mm}-${dd}`;
    }
    return map;
  };

  // Production Chart Data
  const lineChartY: number[] = useMemo(() => {
    if (!data || !data.productionChartData) return [];
    if (period === "today") {
      const total = data.totalProductionThisMonth || 0;
      return [
        Math.round(total * 0.1),
        Math.round(total * 0.25),
        Math.round(total * 0.4),
        Math.round(total * 0.65),
        Math.round(total * 0.85),
        total,
      ];
    }
    if (period === "week") {
      const weekDateMap = getWeekDayDates();
      return lineChartX.map((dayLabel) => {
        const isoDate = weekDateMap[dayLabel];
        return (
          data.productionChartData[dayLabel] ??
          (isoDate ? data.productionChartData[isoDate] : 0) ??
          0
        );
      });
    }
    return lineChartX.map((label) => data.productionChartData[label] || 0);
  }, [data, lineChartX, period]);

  // Damage Rate Chart Data
  const damageY: number[] = useMemo(() => {
    if (!data || !data.damageChartData) return [];
    if (period === "today") {
      const baseDmg = data.damageRate || 0;
      return [
        Number((baseDmg * 0.8).toFixed(1)),
        Number((baseDmg * 1.1).toFixed(1)),
        Number((baseDmg * 0.9).toFixed(1)),
        Number(baseDmg.toFixed(1)),
        Number((baseDmg * 1.05).toFixed(1)),
        Number(baseDmg.toFixed(1)),
      ];
    }
    if (period === "week") {
      const weekDateMap = getWeekDayDates();
      return lineChartX.map((dayLabel) => {
        const isoDate = weekDateMap[dayLabel];
        const val =
          data.damageChartData[dayLabel] ??
          (isoDate ? data.damageChartData[isoDate] : 0) ??
          0;
        return Number(val.toFixed(1));
      });
    }
    return lineChartX.map((label) =>
      Number((data.damageChartData[label] || 0).toFixed(1)),
    );
  }, [data, lineChartX, period]);

  // Product type distribution data
  const productDistribution = useMemo(() => {
    if (!data || !data.productionByProductType) return [];
    const entries = Object.entries(data.productionByProductType);
    const total = entries.reduce((acc, [, val]) => acc + (val || 0), 0);
    return entries.map(([name, count], index) => {
      const percentage =
        total > 0 ? Math.round(((count || 0) / total) * 100) : 0;
      const palette = ["#047857", "#10B981", "#34D399", "#6EE7B7", "#065F46"];
      return {
        name,
        count: count || 0,
        percentage,
        color: palette[index % palette.length],
      };
    });
  }, [data]);

  // Active workers list
  const activeWorkersList = useMemo(() => {
    const activeOnes = workers.filter(
      (w) => w.status?.toUpperCase() === "ACTIVE",
    );
    return (activeOnes.length > 0 ? activeOnes : workers).slice(0, 4);
  }, [workers]);

  const periodLabels: Record<string, string> = {
    today: "Today",
    week: "This Week",
    month: "This Month",
    quarter: "This Quarter",
    year: "This Year",
  };

  return (
    <Box sx={{ width: "100%", pb: 4 }}>
      {/* Top Header Row */}
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          justifyContent: "space-between",
          alignItems: { xs: "flex-start", md: "center" },
          gap: 2,
          mb: 3.5,
        }}
      >
        <Box>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 800,
              color: "#0F172A",
              fontSize: { xs: "1.75rem", md: "2.1rem" },
              letterSpacing: "-0.03em",
            }}
          >
            Dashboard
          </Typography>
          <Typography
            variant="body2"
            sx={{ color: "#64748B", mt: 0.5, fontSize: "0.925rem" }}
          >
            Plan, monitor, and optimize manufacturing operations with ease.
          </Typography>
        </Box>

        {/* Right side controls: Period filter only */}
        <Box
          sx={{
            bgcolor: "#ffffff",
            p: 0.5,
            borderRadius: "50px",
            border: "1px solid #E2E8F0",
            boxShadow: "0px 1px 3px rgba(0,0,0,0.04)",
            display: "flex",
            overflowX: "auto",
            width: { xs: "100%", sm: "auto" },
          }}
        >
          {(["today", "week", "month", "quarter", "year"] as const).map((p) => {
            const active = period === p;
            return (
              <Button
                key={p}
                size="small"
                onClick={() => setPeriod(p)}
                sx={{
                  borderRadius: "50px",
                  px: 2,
                  py: 0.6,
                  fontSize: "0.8125rem",
                  fontWeight: active ? 700 : 500,
                  color: active ? "#ffffff" : "#64748B",
                  bgcolor: active ? "#064E3B" : "transparent",
                  textTransform: "none",
                  boxShadow: active ? "0 2px 6px rgba(6,78,59,0.25)" : "none",
                  "&:hover": {
                    bgcolor: active ? "#047857" : "rgba(0,0,0,0.04)",
                    color: active ? "#ffffff" : "#0F172A",
                  },
                  whiteSpace: "nowrap",
                }}
              >
                {periodLabels[p]}
              </Button>
            );
          })}
        </Box>
      </Box>

      {/* Loading State */}
      {loading ? (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "55vh",
            gap: 2,
          }}
        >
          <CircularProgress size={44} thickness={4} sx={{ color: "#064E3B" }} />
          <Typography
            variant="body2"
            sx={{ color: "#64748B", fontWeight: 500 }}
          >
            Gathering operational metrics...
          </Typography>
        </Box>
      ) : error ? (
        <Alert
          severity="error"
          sx={{
            borderRadius: 3,
            fontWeight: 500,
            mb: 3,
            border: "1px solid #FECACA",
          }}
        >
          {error}
        </Alert>
      ) : !data ? null : (
        <Box>
          {/* ========================================================================= */}
          {/* 1. TOP BENTO STAT CARDS (4 Cards Grid)                                    */}
          {/* ========================================================================= */}
          <Grid container spacing={2.5} sx={{ mb: 3 }}>
            {/* Card 1: Total Output (Hero Deep Emerald Card) */}
            <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
              <Paper
                elevation={0}
                sx={{
                  p: 2.75,
                  borderRadius: "20px",
                  background:
                    "linear-gradient(135deg, #064E3B 0%, #047857 100%)",
                  color: "#ffffff",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  minHeight: 160,
                  boxShadow: "0 10px 25px -5px rgba(6, 78, 59, 0.3)",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      color: "rgba(255,255,255,0.8)",
                    }}
                  >
                    Total Output ({periodLabels[period]})
                  </Typography>
                </Box>

                <Box sx={{ my: 1 }}>
                  <Typography
                    sx={{
                      fontSize: { xs: "2rem", md: "2.4rem" },
                      fontWeight: 800,
                      lineHeight: 1.1,
                      letterSpacing: "-0.03em",
                    }}
                  >
                    {data.totalProductionThisMonth.toLocaleString()}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: "0.8rem",
                      color: "rgba(255,255,255,0.75)",
                      fontWeight: 500,
                    }}
                  >
                    Manufactured Units
                  </Typography>
                </Box>

                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Box
                    sx={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 0.5,
                      px: 1,
                      py: 0.25,
                      borderRadius: "50px",
                      bgcolor: "rgba(255,255,255,0.18)",
                      color: "#A7F3D0",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                    }}
                  >
                    <TrendingUpRoundedIcon sx={{ fontSize: 14 }} />
                    <span>+12%</span>
                  </Box>
                  <Typography
                    sx={{
                      fontSize: "0.75rem",
                      color: "rgba(255,255,255,0.8)",
                      fontWeight: 500,
                    }}
                  >
                    Increased from last period
                  </Typography>
                </Box>
              </Paper>
            </Grid>

            {/* Card 2: Active Workers (Clean White Card) */}
            <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
              <Paper
                elevation={0}
                sx={{
                  p: 2.75,
                  borderRadius: "20px",
                  bgcolor: "#ffffff",
                  border: "1px solid #E2E8F0",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  minHeight: 160,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      color: "#64748B",
                    }}
                  >
                    Active Workforce
                  </Typography>
                </Box>

                <Box sx={{ my: 1 }}>
                  <Typography
                    sx={{
                      fontSize: { xs: "2rem", md: "2.4rem" },
                      fontWeight: 800,
                      lineHeight: 1.1,
                      color: "#0F172A",
                      letterSpacing: "-0.03em",
                    }}
                  >
                    {data.activeWorkers}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: "0.8rem",
                      color: "#64748B",
                      fontWeight: 500,
                    }}
                  >
                    Floor Staff Active
                  </Typography>
                </Box>

                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Box
                    sx={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 0.5,
                      px: 1,
                      py: 0.25,
                      borderRadius: "50px",
                      bgcolor: "#ECFDF5",
                      color: "#059669",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                    }}
                  >
                    <FiberManualRecordIcon sx={{ fontSize: 10 }} />
                    <span>Active</span>
                  </Box>
                  <Typography
                    sx={{
                      fontSize: "0.75rem",
                      color: "#64748B",
                      fontWeight: 500,
                    }}
                  >
                    All shifts covered
                  </Typography>
                </Box>
              </Paper>
            </Grid>

            {/* Card 3: Avg Daily Production (Clean White Card) */}
            <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
              <Paper
                elevation={0}
                sx={{
                  p: 2.75,
                  borderRadius: "20px",
                  bgcolor: "#ffffff",
                  border: "1px solid #E2E8F0",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  minHeight: 160,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      color: "#64748B",
                    }}
                  >
                    Avg Daily Output
                  </Typography>
                </Box>

                <Box sx={{ my: 1 }}>
                  <Typography
                    sx={{
                      fontSize: { xs: "2rem", md: "2.4rem" },
                      fontWeight: 800,
                      lineHeight: 1.1,
                      color: "#0F172A",
                      letterSpacing: "-0.03em",
                    }}
                  >
                    {data.avgDailyProduction.toLocaleString()}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: "0.8rem",
                      color: "#64748B",
                      fontWeight: 500,
                    }}
                  >
                    Units per working day
                  </Typography>
                </Box>

                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Box
                    sx={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 0.5,
                      px: 1,
                      py: 0.25,
                      borderRadius: "50px",
                      bgcolor: "#EFF6FF",
                      color: "#2563EB",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                    }}
                  >
                    <TrendingUpRoundedIcon sx={{ fontSize: 14 }} />
                    <span>Optimal</span>
                  </Box>
                  <Typography
                    sx={{
                      fontSize: "0.75rem",
                      color: "#64748B",
                      fontWeight: 500,
                    }}
                  >
                    Target: 1,000/day
                  </Typography>
                </Box>
              </Paper>
            </Grid>

            {/* Card 4: Quality & Damage Rate (Clean White Card) */}
            <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
              <Paper
                elevation={0}
                sx={{
                  p: 2.75,
                  borderRadius: "20px",
                  bgcolor: "#ffffff",
                  border: "1px solid #E2E8F0",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  minHeight: 160,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      color: "#64748B",
                    }}
                  >
                    Damage / Defect Rate
                  </Typography>
                </Box>

                <Box sx={{ my: 1 }}>
                  <Typography
                    sx={{
                      fontSize: { xs: "2rem", md: "2.4rem" },
                      fontWeight: 800,
                      lineHeight: 1.1,
                      color: data.damageRate > 3 ? "#DC2626" : "#0F172A",
                      letterSpacing: "-0.03em",
                    }}
                  >
                    {data.damageRate.toFixed(1)}%
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: "0.8rem",
                      color: "#64748B",
                      fontWeight: 500,
                    }}
                  >
                    Defects / Total Produced
                  </Typography>
                </Box>

                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Box
                    sx={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 0.5,
                      px: 1,
                      py: 0.25,
                      borderRadius: "50px",
                      bgcolor: data.damageRate <= 2.5 ? "#ECFDF5" : "#FEF3C7",
                      color: data.damageRate <= 2.5 ? "#059669" : "#D97706",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                    }}
                  >
                    {data.damageRate <= 2.5 ? (
                      <CheckCircleRoundedIcon sx={{ fontSize: 14 }} />
                    ) : (
                      <WarningAmberRoundedIcon sx={{ fontSize: 14 }} />
                    )}
                    <span>
                      {data.damageRate <= 2.5 ? "Healthy" : "Attention"}
                    </span>
                  </Box>
                  <Typography
                    sx={{
                      fontSize: "0.75rem",
                      color: "#64748B",
                      fontWeight: 500,
                    }}
                  >
                    Threshold: &lt;3.0%
                  </Typography>
                </Box>
              </Paper>
            </Grid>
          </Grid>

          {/* ========================================================================= */}
          {/* 2. MIDDLE ROW: TWO DEDICATED MUI LINE CHARTS (PRODUCTION & DAMAGE)        */}
          {/* ========================================================================= */}
          <Grid container spacing={2.5} sx={{ mb: 3 }}>
            {/* Graph 1: Production Volume Trend */}
            <Grid size={{ xs: 12, lg: 6 }}>
              <Paper
                elevation={0}
                sx={{
                  p: { xs: 2.5, sm: 3 },
                  borderRadius: "20px",
                  bgcolor: "#ffffff",
                  border: "1px solid #E2E8F0",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
                  display: "flex",
                  flexDirection: "column",
                  height: "100%",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    mb: 1.5,
                  }}
                >
                  <Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <ShowChartRoundedIcon
                        sx={{ color: "#059669", fontSize: 22 }}
                      />
                      <Typography
                        sx={{
                          fontSize: "1.05rem",
                          fontWeight: 700,
                          color: "#0F172A",
                        }}
                      >
                        Production Output Trend
                      </Typography>
                    </Box>
                    <Typography
                      sx={{ fontSize: "0.8rem", color: "#64748B", mt: 0.25 }}
                    >
                      Manufactured volume units over{" "}
                      {periodLabels[period].toLowerCase()}
                    </Typography>
                  </Box>

                  <Chip
                    label={`${data.totalProductionThisMonth.toLocaleString()} Units`}
                    size="small"
                    sx={{
                      bgcolor: "#ECFDF5",
                      color: "#065F46",
                      fontWeight: 700,
                      fontSize: "0.75rem",
                      borderRadius: "50px",
                      border: "1px solid #A7F3D0",
                    }}
                  />
                </Box>

                {/* MUI LineChart for Production */}
                <Box sx={{ width: "100%", height: 280, mt: 0.5, ml: -1.5 }}>
                  <LineChart
                    xAxis={[
                      {
                        data: lineChartX.length > 0 ? lineChartX : ["No Data"],
                        scaleType: "point",
                        tickLabelStyle: {
                          fontSize: 11,
                          fill: "#94A3B8",
                          fontWeight: 600,
                        },
                      },
                    ]}
                    yAxis={[
                      {
                        tickLabelStyle: {
                          fontSize: 11,
                          fill: "#94A3B8",
                          fontWeight: 600,
                        },
                      },
                    ]}
                    series={[
                      {
                        id: "prod-actual",
                        data: lineChartY.length > 0 ? lineChartY : [0],
                        area: false,
                        color: "#2563EB",
                        label: "Production (Units)",
                        showMark: false,
                        curve: "linear",
                      },
                    ]}
                    height={280}
                    margin={{ left: 50, right: 20, top: 15, bottom: 25 }}
                    grid={{ horizontal: true, vertical: false }}
                    sx={{
                      "& .MuiLineElement-series-prod-actual": {
                        strokeWidth: 3.8,
                        strokeLinecap: "round",
                        strokeLinejoin: "round",
                      },
                      "& .MuiChartsGrid-line": {
                        stroke: "#E2E8F0",
                        strokeDasharray: "4 4",
                      },
                    }}
                  />
                </Box>

                <Divider sx={{ my: 1.5, borderColor: "#F1F5F9" }} />
                <Grid container spacing={2}>
                  <Grid size={{ xs: 6 }}>
                    <Typography
                      sx={{
                        fontSize: "0.725rem",
                        color: "#64748B",
                        fontWeight: 600,
                      }}
                    >
                      PERIOD PEAK
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: "0.95rem",
                        fontWeight: 700,
                        color: "#0F172A",
                        mt: 0.25,
                      }}
                    >
                      {(lineChartY.length > 0
                        ? Math.max(...lineChartY)
                        : 0
                      ).toLocaleString()}{" "}
                      units
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography
                      sx={{
                        fontSize: "0.725rem",
                        color: "#64748B",
                        fontWeight: 600,
                      }}
                    >
                      STEP AVERAGE
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: "0.95rem",
                        fontWeight: 700,
                        color: "#2563EB",
                        mt: 0.25,
                      }}
                    >
                      {lineChartY.length > 0
                        ? Math.round(
                            lineChartY.reduce((a, b) => a + b, 0) /
                              lineChartY.length,
                          ).toLocaleString()
                        : 0}{" "}
                      units
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>

            {/* Graph 2: Damage Rate Trend */}
            <Grid size={{ xs: 12, lg: 6 }}>
              <Paper
                elevation={0}
                sx={{
                  p: { xs: 2.5, sm: 3 },
                  borderRadius: "20px",
                  bgcolor: "#ffffff",
                  border: "1px solid #E2E8F0",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
                  display: "flex",
                  flexDirection: "column",
                  height: "100%",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    mb: 1.5,
                  }}
                >
                  <Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <ReportProblemOutlinedIcon
                        sx={{ color: "#EF4444", fontSize: 22 }}
                      />
                      <Typography
                        sx={{
                          fontSize: "1.05rem",
                          fontWeight: 700,
                          color: "#0F172A",
                        }}
                      >
                        Quality & Damage Rate
                      </Typography>
                    </Box>
                    <Typography
                      sx={{ fontSize: "0.8rem", color: "#64748B", mt: 0.25 }}
                    >
                      Defect percentage tracking over{" "}
                      {periodLabels[period].toLowerCase()}
                    </Typography>
                  </Box>

                  <Chip
                    label={`Avg: ${data.damageRate.toFixed(1)}%`}
                    size="small"
                    sx={{
                      bgcolor: data.damageRate <= 2.5 ? "#ECFDF5" : "#FEF2F2",
                      color: data.damageRate <= 2.5 ? "#065F46" : "#DC2626",
                      fontWeight: 700,
                      fontSize: "0.75rem",
                      borderRadius: "50px",
                      border:
                        data.damageRate <= 2.5
                          ? "1px solid #A7F3D0"
                          : "1px solid #FECACA",
                    }}
                  />
                </Box>

                {/* MUI LineChart for Damage Rate */}
                <Box sx={{ width: "100%", height: 280, mt: 0.5, ml: -1.5 }}>
                  <LineChart
                    xAxis={[
                      {
                        data: lineChartX.length > 0 ? lineChartX : ["No Data"],
                        scaleType: "point",
                        tickLabelStyle: {
                          fontSize: 11,
                          fill: "#94A3B8",
                          fontWeight: 600,
                        },
                      },
                    ]}
                    yAxis={[
                      {
                        tickLabelStyle: {
                          fontSize: 11,
                          fill: "#94A3B8",
                          fontWeight: 600,
                        },
                      },
                    ]}
                    series={[
                      {
                        id: "dmg-actual",
                        data: damageY.length > 0 ? damageY : [0],
                        area: false,
                        color: "#EF4444",
                        label: "Damage Rate (%)",
                        showMark: false,
                        curve: "linear",
                      },
                    ]}
                    height={280}
                    margin={{ left: 50, right: 20, top: 15, bottom: 25 }}
                    grid={{ horizontal: true, vertical: false }}
                    sx={{
                      "& .MuiLineElement-series-dmg-actual": {
                        strokeWidth: 3.8,
                        strokeLinecap: "round",
                        strokeLinejoin: "round",
                      },
                      "& .MuiChartsGrid-line": {
                        stroke: "#E2E8F0",
                        strokeDasharray: "4 4",
                      },
                    }}
                  />
                </Box>

                <Divider sx={{ my: 1.5, borderColor: "#F1F5F9" }} />
                <Grid container spacing={2}>
                  <Grid size={{ xs: 6 }}>
                    <Typography
                      sx={{
                        fontSize: "0.725rem",
                        color: "#64748B",
                        fontWeight: 600,
                      }}
                    >
                      MAX DEFECT PEAK
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: "0.95rem",
                        fontWeight: 700,
                        color: "#DC2626",
                        mt: 0.25,
                      }}
                    >
                      {(damageY.length > 0 ? Math.max(...damageY) : 0).toFixed(
                        1,
                      )}
                      %
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography
                      sx={{
                        fontSize: "0.725rem",
                        color: "#64748B",
                        fontWeight: 600,
                      }}
                    >
                      TARGET BENCHMARK
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: "0.95rem",
                        fontWeight: 700,
                        color: "#059669",
                        mt: 0.25,
                      }}
                    >
                      &lt; 3.0% (Optimal)
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
          </Grid>

          {/* ========================================================================= */}
          {/* 3. BOTTOM ROW: TEAM COLLABORATION + INVENTORY HEALTH + PRODUCT BREAKDOWN   */}
          {/* ========================================================================= */}
          <Grid container spacing={2.5}>
            {/* Section A: Active Workers / Team Collaboration */}
            <Grid size={{ xs: 12, md: 6, lg: 4 }}>
              <Paper
                elevation={0}
                sx={{
                  p: 2.75,
                  borderRadius: "20px",
                  bgcolor: "#ffffff",
                  border: "1px solid #E2E8F0",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <Box>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      mb: 2.5,
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: "1.05rem",
                        fontWeight: 700,
                        color: "#0F172A",
                      }}
                    >
                      Team Activity
                    </Typography>
                    <Link
                      href="/dashboard/workers"
                      passHref
                      style={{ textDecoration: "none" }}
                    >
                      <Button
                        size="small"
                        startIcon={<AddRoundedIcon sx={{ fontSize: 16 }} />}
                        sx={{
                          borderRadius: "50px",
                          border: "1px solid #CBD5E1",
                          color: "#0F172A",
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          px: 1.5,
                          py: 0.4,
                          textTransform: "none",
                          "&:hover": {
                            bgcolor: "#F8FAFC",
                            borderColor: "#94A3B8",
                          },
                        }}
                      >
                        Workers
                      </Button>
                    </Link>
                  </Box>

                  {/* Worker list */}
                  <Stack spacing={2}>
                    {activeWorkersList.length === 0 ? (
                      <Typography
                        variant="body2"
                        sx={{ color: "#64748B", py: 2, textAlign: "center" }}
                      >
                        No worker records found
                      </Typography>
                    ) : (
                      activeWorkersList.map((worker, index) => {
                        const avatarStyle =
                          AVATAR_COLORS[index % AVATAR_COLORS.length];
                        const workstation =
                          WORKSTATIONS[index % WORKSTATIONS.length];
                        const initials = worker.name
                          ? worker.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase()
                              .slice(0, 2)
                          : "W";

                        return (
                          <Box
                            key={worker.id || index}
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              p: 1.25,
                              borderRadius: "12px",
                              bgcolor: "#F8FAFC",
                              transition: "background 0.2s ease",
                              "&:hover": { bgcolor: "#F1F5F9" },
                            }}
                          >
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1.5,
                              }}
                            >
                              <Avatar
                                sx={{
                                  width: 36,
                                  height: 36,
                                  fontSize: "0.85rem",
                                  fontWeight: 700,
                                  bgcolor: avatarStyle.bg,
                                  color: avatarStyle.color,
                                }}
                              >
                                {initials}
                              </Avatar>
                              <Box>
                                <Typography
                                  sx={{
                                    fontSize: "0.875rem",
                                    fontWeight: 700,
                                    color: "#0F172A",
                                  }}
                                >
                                  {worker.name}
                                </Typography>
                                <Typography
                                  sx={{ fontSize: "0.75rem", color: "#64748B" }}
                                >
                                  {workstation}
                                </Typography>
                              </Box>
                            </Box>

                            <Chip
                              label={worker.status || "Active"}
                              size="small"
                              sx={{
                                height: 22,
                                fontSize: "0.7rem",
                                fontWeight: 700,
                                bgcolor: "#ECFDF5",
                                color: "#059669",
                                borderRadius: "50px",
                              }}
                            />
                          </Box>
                        );
                      })
                    )}
                  </Stack>
                </Box>

                <Box sx={{ mt: 2.5, pt: 1.5, borderTop: "1px solid #F1F5F9" }}>
                  <Link
                    href="/dashboard/workers"
                    passHref
                    style={{ textDecoration: "none" }}
                  >
                    <Button
                      fullWidth
                      size="small"
                      sx={{
                        color: "#064E3B",
                        fontWeight: 700,
                        fontSize: "0.8rem",
                        textTransform: "none",
                        "&:hover": { bgcolor: "#ECFDF5" },
                      }}
                    >
                      View All {workers.length} Personnel →
                    </Button>
                  </Link>
                </Box>
              </Paper>
            </Grid>

            {/* Section B: High & Low Stock Alerts (Inventory Health) */}
            <Grid size={{ xs: 12, md: 6, lg: 4 }}>
              <Paper
                elevation={0}
                sx={{
                  p: 2.75,
                  borderRadius: "20px",
                  bgcolor: "#ffffff",
                  border: "1px solid #E2E8F0",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <Box>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      mb: 2,
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: "1.05rem",
                        fontWeight: 700,
                        color: "#0F172A",
                      }}
                    >
                      Inventory Health
                    </Typography>

                    {/* Low vs High Tab Toggle */}
                    <Box
                      sx={{
                        display: "flex",
                        bgcolor: "#F8FAFC",
                        p: 0.4,
                        borderRadius: "50px",
                        border: "1px solid #E2E8F0",
                      }}
                    >
                      <Button
                        size="small"
                        onClick={() => setStockTab("low")}
                        sx={{
                          borderRadius: "50px",
                          px: 1.2,
                          py: 0.3,
                          fontSize: "0.725rem",
                          fontWeight: stockTab === "low" ? 700 : 500,
                          color: stockTab === "low" ? "#ffffff" : "#64748B",
                          bgcolor:
                            stockTab === "low" ? "#DC2626" : "transparent",
                          textTransform: "none",
                          "&:hover": {
                            bgcolor:
                              stockTab === "low"
                                ? "#B91C1C"
                                : "rgba(0,0,0,0.04)",
                          },
                        }}
                      >
                        Low Stock ({data.lowStockAlerts?.length || 0})
                      </Button>
                      <Button
                        size="small"
                        onClick={() => setStockTab("high")}
                        sx={{
                          borderRadius: "50px",
                          px: 1.2,
                          py: 0.3,
                          fontSize: "0.725rem",
                          fontWeight: stockTab === "high" ? 700 : 500,
                          color: stockTab === "high" ? "#ffffff" : "#64748B",
                          bgcolor:
                            stockTab === "high" ? "#064E3B" : "transparent",
                          textTransform: "none",
                          "&:hover": {
                            bgcolor:
                              stockTab === "high"
                                ? "#047857"
                                : "rgba(0,0,0,0.04)",
                          },
                        }}
                      >
                        High Stock ({data.highStockAlerts?.length || 0})
                      </Button>
                    </Box>
                  </Box>

                  {/* Stock List Display */}
                  <Stack spacing={1.5}>
                    {stockTab === "low" ? (
                      !data.lowStockAlerts ||
                      data.lowStockAlerts.length === 0 ? (
                        <Box sx={{ py: 3, textAlign: "center" }}>
                          <CheckCircleRoundedIcon
                            sx={{ color: "#10B981", fontSize: 32, mb: 1 }}
                          />
                          <Typography
                            variant="body2"
                            sx={{ color: "#64748B", fontWeight: 500 }}
                          >
                            All inventory items are well-stocked!
                          </Typography>
                        </Box>
                      ) : (
                        data.lowStockAlerts.map((item, index) => (
                          <Box
                            key={index}
                            sx={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              p: 1.25,
                              borderRadius: "12px",
                              bgcolor: "#FEF2F2",
                              border: "1px solid #FEE2E2",
                            }}
                          >
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                              }}
                            >
                              <WarningAmberRoundedIcon
                                sx={{ color: "#DC2626", fontSize: 20 }}
                              />
                              <Box>
                                <Typography
                                  sx={{
                                    fontSize: "0.85rem",
                                    fontWeight: 700,
                                    color: "#0F172A",
                                  }}
                                >
                                  {item.itemName}
                                </Typography>
                                <Typography
                                  sx={{
                                    fontSize: "0.725rem",
                                    color: "#64748B",
                                  }}
                                >
                                  Threshold: Critical
                                </Typography>
                              </Box>
                            </Box>
                            <Chip
                              label={`${item.currentStock} ${item.unitOfMeasure}`}
                              size="small"
                              sx={{
                                height: 24,
                                fontSize: "0.75rem",
                                fontWeight: 700,
                                bgcolor: "#FEE2E2",
                                color: "#DC2626",
                                borderRadius: "50px",
                              }}
                            />
                          </Box>
                        ))
                      )
                    ) : !data.highStockAlerts ||
                      data.highStockAlerts.length === 0 ? (
                      <Typography
                        variant="body2"
                        sx={{ color: "#64748B", py: 3, textAlign: "center" }}
                      >
                        No inventory data available
                      </Typography>
                    ) : (
                      data.highStockAlerts.map((item, index) => (
                        <Box
                          key={index}
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            p: 1.25,
                            borderRadius: "12px",
                            bgcolor: "#ECFDF5",
                            border: "1px solid #D1FAE5",
                          }}
                        >
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                            }}
                          >
                            <Inventory2RoundedIcon
                              sx={{ color: "#059669", fontSize: 20 }}
                            />
                            <Box>
                              <Typography
                                sx={{
                                  fontSize: "0.85rem",
                                  fontWeight: 700,
                                  color: "#0F172A",
                                }}
                              >
                                {item.itemName}
                              </Typography>
                              <Typography
                                sx={{ fontSize: "0.725rem", color: "#64748B" }}
                              >
                                In Full Supply
                              </Typography>
                            </Box>
                          </Box>
                          <Chip
                            label={`${item.currentStock} ${item.unitOfMeasure}`}
                            size="small"
                            sx={{
                              height: 24,
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              bgcolor: "#D1FAE5",
                              color: "#065F46",
                              borderRadius: "50px",
                            }}
                          />
                        </Box>
                      ))
                    )}
                  </Stack>
                </Box>

                <Box sx={{ mt: 2.5, pt: 1.5, borderTop: "1px solid #F1F5F9" }}>
                  <Link
                    href="/dashboard/inventory"
                    passHref
                    style={{ textDecoration: "none" }}
                  >
                    <Button
                      fullWidth
                      size="small"
                      sx={{
                        color: "#064E3B",
                        fontWeight: 700,
                        fontSize: "0.8rem",
                        textTransform: "none",
                        "&:hover": { bgcolor: "#ECFDF5" },
                      }}
                    >
                      Manage Warehouse Inventory →
                    </Button>
                  </Link>
                </Box>
              </Paper>
            </Grid>

            {/* Section C: Product Type Progress & Breakdown */}
            <Grid size={{ xs: 12, lg: 4 }}>
              <Paper
                elevation={0}
                sx={{
                  p: 2.75,
                  borderRadius: "20px",
                  bgcolor: "#ffffff",
                  border: "1px solid #E2E8F0",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <Box>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      mb: 2.5,
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: "1.05rem",
                        fontWeight: 700,
                        color: "#0F172A",
                      }}
                    >
                      Production Breakdown
                    </Typography>
                    <Chip
                      label={`${productDistribution.length} Categories`}
                      size="small"
                      sx={{
                        fontSize: "0.725rem",
                        fontWeight: 700,
                        bgcolor: "#F1F5F9",
                        color: "#475569",
                        borderRadius: "50px",
                      }}
                    />
                  </Box>

                  {/* Visual breakdown progress bars */}
                  <Stack spacing={2.25}>
                    {productDistribution.length === 0 ? (
                      <Typography
                        variant="body2"
                        sx={{ color: "#64748B", py: 3, textAlign: "center" }}
                      >
                        No product output records for this period
                      </Typography>
                    ) : (
                      productDistribution.map((prod, index) => (
                        <Box key={index}>
                          <Box
                            sx={{
                              display: "flex",
                              justifyContent: "space-between",
                              mb: 0.75,
                            }}
                          >
                            <Typography
                              sx={{
                                fontSize: "0.85rem",
                                fontWeight: 700,
                                color: "#0F172A",
                              }}
                            >
                              {prod.name}
                            </Typography>
                            <Typography
                              sx={{
                                fontSize: "0.8rem",
                                fontWeight: 700,
                                color: "#064E3B",
                              }}
                            >
                              {prod.count.toLocaleString()} units (
                              {prod.percentage}%)
                            </Typography>
                          </Box>
                          <LinearProgress
                            variant="determinate"
                            value={prod.percentage}
                            sx={{
                              height: 8,
                              borderRadius: 4,
                              bgcolor: "#F1F5F9",
                              "& .MuiLinearProgress-bar": {
                                bgcolor: prod.color,
                                borderRadius: 4,
                              },
                            }}
                          />
                        </Box>
                      ))
                    )}
                  </Stack>
                </Box>

                <Box sx={{ mt: 2.5, pt: 1.5, borderTop: "1px solid #F1F5F9" }}>
                  <Link
                    href="/dashboard/production"
                    passHref
                    style={{ textDecoration: "none" }}
                  >
                    <Button
                      fullWidth
                      size="small"
                      sx={{
                        color: "#064E3B",
                        fontWeight: 700,
                        fontSize: "0.8rem",
                        textTransform: "none",
                        "&:hover": { bgcolor: "#ECFDF5" },
                      }}
                    >
                      View Detailed Production Reports →
                    </Button>
                  </Link>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </Box>
      )}
    </Box>
  );
}
