"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Grid,
  Paper,
  Button,
  Stack,
  CircularProgress,
  Alert,
  ToggleButton,
  ToggleButtonGroup,
  useTheme, // Added useTheme
} from "@mui/material";
import { LineChart } from "@mui/x-charts/LineChart";
import { BarChart } from "@mui/x-charts/BarChart";
import Link from "next/link";

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

export default function OverviewView() {
  const theme = useTheme(); // Initialize theme to access palette colors
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState("month");
  const [chartView, setChartView] = useState<string[]>([
    "production",
    "damage",
  ]);

  const handleChartViewChange = (
    event: React.MouseEvent<HTMLElement>,
    newView: string[],
  ) => {
    if (newView.length > 0) {
      setChartView(newView);
    }
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/dashboard/summary?period=${period}`);
        if (!res.ok) throw new Error("Failed to load dashboard data");
        const json = await res.json();
        setData(json);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [period]);

  // Prepare Chart Data
  const generateXLabels = (p: string) => {
    const today = new Date();
    const year = today.getFullYear();
    
    if (p === "today") {
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      return [`${year}-${mm}-${dd}`];
    }
    
    if (p === "week") {
      const labels = [];
      const current = new Date(today);
      const day = current.getDay();
      const diff = current.getDate() - day + (day === 0 ? -6 : 1);
      current.setDate(diff);
      for (let i = 0; i < 7; i++) {
        const yyyy = current.getFullYear();
        const mm = String(current.getMonth() + 1).padStart(2, '0');
        const dd = String(current.getDate()).padStart(2, '0');
        labels.push(`${yyyy}-${mm}-${dd}`);
        current.setDate(current.getDate() + 1);
      }
      return labels;
    }
    
    if (p === "month") {
      return ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5"];
    }
    
    if (p === "quarter") {
      const currentMonth = today.getMonth();
      const quarterStart = Math.floor(currentMonth / 3) * 3;
      const shortMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return [shortMonths[quarterStart], shortMonths[quarterStart + 1], shortMonths[quarterStart + 2]];
    }
    
    if (p === "year") {
      return ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    }
    
    return Object.keys(data!.productionChartData).sort();
  };

  const lineChartX: string[] = data ? generateXLabels(period) : [];

  const lineChartY = data
    ? lineChartX.map((k) => data.productionChartData[k] || 0)
    : [];
  const damageY = data
    ? lineChartX.map((k) => data.damageChartData[k] || 0)
    : [];

  const chartX = lineChartX.length > 0 ? lineChartX : ["No Data"];
  const chartY = lineChartY.length > 0 ? lineChartY : [0];
  const chartDamageY = damageY.length > 0 ? damageY : [0];

  const barChartX = data ? Object.keys(data.productionByProductType) : [];
  const barChartY = data
    ? barChartX.map((k) => data.productionByProductType[k])
    : [];

  const bChartX = barChartX.length > 0 ? barChartX : ["No Data"];
  const bChartY = barChartY.length > 0 ? barChartY : [0];

  return (
    <Box sx={{ width: "100%" }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 4,
        }}
      >
        <Typography variant="h4" sx={{ fontWeight: "bold" }}>
          Welcome
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button
            variant={period === "today" ? "contained" : "outlined"}
            onClick={() => setPeriod("today")}
            disableElevation={period === "today"}
            sx={{
              bgcolor: period === "today" ? "primary.main" : "background.paper",
              color: period === "today" ? "white" : "text.primary",
              borderColor: "divider",
            }}
          >
            Today
          </Button>
          <Button
            variant={period === "week" ? "contained" : "outlined"}
            onClick={() => setPeriod("week")}
            disableElevation={period === "week"}
            sx={{
              bgcolor: period === "week" ? "primary.main" : "background.paper",
              color: period === "week" ? "white" : "text.primary",
              borderColor: "divider",
            }}
          >
            This Week
          </Button>
          <Button
            variant={period === "month" ? "contained" : "outlined"}
            onClick={() => setPeriod("month")}
            disableElevation={period === "month"}
            sx={{
              bgcolor: period === "month" ? "primary.main" : "background.paper",
              color: period === "month" ? "white" : "text.primary",
              borderColor: "divider",
            }}
          >
            This Month
          </Button>
          <Button
            variant={period === "quarter" ? "contained" : "outlined"}
            onClick={() => setPeriod("quarter")}
            disableElevation={period === "quarter"}
            sx={{
              bgcolor: period === "quarter" ? "primary.main" : "background.paper",
              color: period === "quarter" ? "white" : "text.primary",
              borderColor: "divider",
            }}
          >
            This Quarter
          </Button>
          <Button
            variant={period === "year" ? "contained" : "outlined"}
            onClick={() => setPeriod("year")}
            disableElevation={period === "year"}
            sx={{
              bgcolor: period === "year" ? "primary.main" : "background.paper",
              color: period === "year" ? "white" : "text.primary",
              borderColor: "divider",
            }}
          >
            This Year
          </Button>
        </Stack>
      </Box>

      {loading ? (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            height: "60vh",
            gap: 2,
          }}
        >
          <CircularProgress size={48} thickness={4} />
          <Typography variant="body1" color="text.secondary">
            Loading dashboard data...
          </Typography>
        </Box>
      ) : error ? (
        <Alert severity="error" variant="filled">
          {error}
        </Alert>
      ) : !data ? null : (
        <Grid container spacing={3}>
          {/* Main Metric Card */}
          <Grid size={{ xs: 12, md: 8 }}>
            <Paper
              elevation={0}
              sx={{
                p: 4,
                height: "100%",
                display: "flex",
                flexDirection: "column",
                boxShadow: "none",
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography
                    variant="subtitle2"
                    color="text.secondary"
                    sx={{ fontWeight: "bold" }}
                  >
                    {period === "today"
                      ? "Today's"
                      : period === "week"
                        ? "This week's"
                        : period === "quarter"
                          ? "This quarter's"
                          : period === "year"
                            ? "This year's"
                            : "This month's"}{" "}
                    production is
                  </Typography>
                  <Typography
                    variant="h3"
                    sx={{
                      fontWeight: "bold",
                      mt: 1,
                      mb: 1,
                      color: "text.primary",
                    }}
                  >
                    {data.totalProductionThisMonth.toLocaleString()} units
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Keep up the good work!
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      mb: 2,
                    }}
                  >
                    <Box>
                      <Typography
                        variant="subtitle2"
                        color="text.secondary"
                        sx={{ fontWeight: "bold" }}
                      >
                        Avg Daily Production
                      </Typography>
                      <Typography
                        variant="h5"
                        sx={{ fontWeight: "bold", color: "text.primary" }}
                      >
                        {data.avgDailyProduction.toLocaleString()}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography
                        variant="subtitle2"
                        color="text.secondary"
                        sx={{ fontWeight: "bold" }}
                      >
                        Damage Rate
                      </Typography>
                      <Typography
                        variant="h5"
                        sx={{ fontWeight: "bold", color: "text.primary" }}
                      >
                        {data.damageRate.toFixed(1)}%
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
              </Grid>

              <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
                <ToggleButtonGroup
                  value={chartView}
                  onChange={handleChartViewChange}
                  aria-label="chart metrics"
                  size="small"
                >
                  <ToggleButton value="production" aria-label="production">
                    Production
                  </ToggleButton>
                  <ToggleButton value="damage" aria-label="damage rate">
                    Damage Rate
                  </ToggleButton>
                </ToggleButtonGroup>
              </Box>

              <Box sx={{ flexGrow: 1, mt: 2, ml: -2 }}>
                <LineChart
                  xAxis={[{ data: chartX, scaleType: "point" }]}
                  series={[
                    ...(chartView.includes("production")
                      ? [
                          {
                            data: chartY,
                            area: true,
                            color: theme.palette.primary.main, // Updated to theme primary blue
                            label: "Production (Units)",
                          },
                        ]
                      : []),
                    ...(chartView.includes("damage")
                      ? [
                          {
                            data: chartDamageY,
                            color: theme.palette.error.main, // Updated to theme error red
                            label: "Damage Rate (%)",
                            curve: "linear" as const,
                          },
                        ]
                      : []),
                  ]}
                  height={350}
                  margin={{ left: 50, right: 20, top: 20, bottom: 30 }}
                  sx={{
                    ".MuiLineElement-root": { strokeWidth: 3 },
                    ".MuiAreaElement-root": { fillOpacity: 0.1 }, // Slightly reduced opacity for a cleaner look
                  }}
                />
              </Box>
            </Paper>
          </Grid>

          {/* Side Cards */}
          <Grid
            size={{ xs: 12, md: 4 }}
            sx={{ display: "flex", flexDirection: "column", gap: 3 }}
          >
            <Paper
              elevation={0}
              sx={{
                p: 3,
                boxShadow: "none",
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              <Typography
                variant="subtitle2"
                color="text.secondary"
                sx={{ fontWeight: "bold", mb: 2 }}
              >
                Active Workers
              </Typography>
              <Typography
                variant="h4"
                sx={{ fontWeight: "bold", mb: 1, color: "text.primary" }}
              >
                {data.activeWorkers}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                All shifts are currently covered
              </Typography>
            </Paper>

            <Paper
              elevation={0}
              sx={{
                p: 3,
                flexGrow: 1,
                display: "flex",
                flexDirection: "column",
                boxShadow: "none",
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              <Typography
                variant="subtitle2"
                color="text.secondary"
                sx={{ fontWeight: "bold", mb: 2 }}
              >
                High Stock Alerts (Top 5)
              </Typography>
              <Stack spacing={2} sx={{ flexGrow: 1 }}>
                {!data.highStockAlerts || data.highStockAlerts.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No stock items
                  </Typography>
                ) : (
                  data.highStockAlerts.map((alert, i) => (
                    <Box
                      key={i}
                      sx={{ display: "flex", justifyContent: "space-between" }}
                    >
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: "bold", color: "text.primary" }}
                      >
                        {alert.itemName}
                      </Typography>
                      <Typography variant="body2" color="success.main">
                        {alert.currentStock} {alert.unitOfMeasure}
                      </Typography>
                    </Box>
                  ))
                )}
              </Stack>
            </Paper>

            <Paper
              elevation={0}
              sx={{
                p: 3,
                flexGrow: 1,
                display: "flex",
                flexDirection: "column",
                boxShadow: "none",
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              <Typography
                variant="subtitle2"
                color="text.secondary"
                sx={{ fontWeight: "bold", mb: 2 }}
              >
                Low Stock Alerts (Top 5)
              </Typography>
              <Stack spacing={2} sx={{ flexGrow: 1 }}>
                {!data.lowStockAlerts || data.lowStockAlerts.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No low stock items
                  </Typography>
                ) : (
                  data.lowStockAlerts.map((alert, i) => (
                    <Box
                      key={i}
                      sx={{ display: "flex", justifyContent: "space-between" }}
                    >
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: "bold", color: "text.primary" }}
                      >
                        {alert.itemName}
                      </Typography>
                      <Typography variant="body2" color="error.main">
                        {alert.currentStock} {alert.unitOfMeasure}
                      </Typography>
                    </Box>
                  ))
                )}
              </Stack>
              <Link href="/dashboard/inventory" passHref>
                <Button
                  variant="text"
                  size="small"
                  color="primary"
                  sx={{ mt: 2, px: 0, fontWeight: "bold" }}
                >
                  VIEW INVENTORY
                </Button>
              </Link>
            </Paper>
          </Grid>

          {/* Bottom Chart */}
          <Grid size={{ xs: 12 }}>
            <Paper
              elevation={0}
              sx={{
                p: 4,
                boxShadow: "none",
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: "bold", mb: 3, color: "text.primary" }}
              >
                Production by Product Type
              </Typography>
              <Box sx={{ height: 300 }}>
                <BarChart
                  xAxis={[{ scaleType: "band", data: bChartX }]}
                  series={[
                    {
                      data: bChartY,
                      color: theme.palette.primary.main, // Updated from black to theme primary blue
                    },
                  ]}
                  height={300}
                  margin={{ top: 10, bottom: 30, left: 40, right: 10 }}
                />
              </Box>
            </Paper>
          </Grid>
        </Grid>
      )}
    </Box>
  );
}
