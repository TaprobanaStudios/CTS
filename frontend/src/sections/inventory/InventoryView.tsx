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
  Chip,
  Card,
  Grid,
  Tooltip,
  IconButton,
  Avatar,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import RefreshIcon from "@mui/icons-material/Refresh";
import Link from "next/link";
import CustomTable, { CustomTableColumn } from "@/components/table/CustomTable";
import SearchBar from "../../components/search/SearchBar";

interface InventoryItem {
  itemId: string;
  itemName: string;
  unitOfMeasure: string;
  currentStock: number;
  updatedAt?: string;
}

type StockFilterType = "all" | "healthy" | "low" | "depleted";

// Helper threshold: <= 0 => Depleted, 1..10 => Low Stock, > 10 => Healthy
const getStockStatus = (stock: number) => {
  if (stock <= 0) return "depleted";
  if (stock <= 10) return "low";
  return "healthy";
};

export default function InventoryView() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StockFilterType>("all");

  const [open, setOpen] = useState(false);
  const [newItem, setNewItem] = useState({ name: "", unitOfMeasure: "" });
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/inventory/current");
      if (!res.ok) throw new Error("Failed to fetch inventory data");
      const data = await res.json();
      setInventory(Array.isArray(data) ? data : data.content || []);
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const handleAddItem = async () => {
    if (!newItem.name || !newItem.unitOfMeasure) {
      setError("Please fill in all fields");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      const res = await fetch("/api/inventory/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newItem.name,
          unitOfMeasure: newItem.unitOfMeasure,
        }),
      });
      if (!res.ok) throw new Error("Failed to add item");

      setSuccessMsg("Item added successfully!");
      setOpen(false);
      setNewItem({ name: "", unitOfMeasure: "" });
      fetchInventory();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // KPI calculations
  const stats = useMemo(() => {
    let healthy = 0;
    let low = 0;
    let depleted = 0;

    inventory.forEach((item) => {
      const st = getStockStatus(Number(item.currentStock));
      if (st === "healthy") healthy++;
      else if (st === "low") low++;
      else depleted++;
    });

    return {
      total: inventory.length,
      healthy,
      low,
      depleted,
    };
  }, [inventory]);

  // Filtered inventory list
  const filteredInventory = useMemo(() => {
    return inventory.filter((item) => {
      const matchesSearch = item.itemName
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      const st = getStockStatus(Number(item.currentStock));
      if (statusFilter === "healthy" && st !== "healthy") return false;
      if (statusFilter === "low" && st !== "low") return false;
      if (statusFilter === "depleted" && st !== "depleted") return false;

      return true;
    });
  }, [inventory, searchQuery, statusFilter]);

  const columns: CustomTableColumn[] = [
    {
      field: "itemName",
      headerName: "Item Name",
      flex: 1.5,
      minWidth: 220,
      renderCell: (params) => (
        <Typography
          sx={{
            fontSize: "0.875rem",
            fontWeight: 700,
            color: "#0F172A",
            lineHeight: 1.2,
          }}
        >
          {params.value}
        </Typography>
      ),
    },
    {
      field: "unitOfMeasure",
      headerName: "Unit",
      flex: 0.6,
      minWidth: 100,
      align: "center",
      renderCell: (params) => (
        <Chip
          label={params.value}
          size="small"
          sx={{
            bgcolor: "#F8FAFC",
            color: "#334155",
            fontWeight: 700,
            fontSize: "0.725rem",
            height: 24,
            borderRadius: "6px",
            border: "1px solid #E2E8F0",
            boxShadow: "none",
          }}
        />
      ),
    },
    {
      field: "currentStock",
      headerName: "Current Stock",
      flex: 1,
      minWidth: 150,
      align: "center",
      renderCell: (params) => {
        const val = Number(params.value);
        const isDepleted = val <= 0;
        const isLow = val > 0 && val <= 10;
        const color = isDepleted ? "#DC2626" : isLow ? "#D97706" : "#16A34A";

        return (
          <Box
            sx={{
              display: "inline-flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <Typography
              sx={{
                fontWeight: 800,
                fontSize: "0.925rem",
                color,
                lineHeight: 1.2,
              }}
            >
              {params.value}
            </Typography>
          </Box>
        );
      },
    },
    {
      field: "status",
      headerName: "Status",
      flex: 0.9,
      minWidth: 130,
      align: "center",
      renderCell: (params) => {
        const st = getStockStatus(Number(params.row.currentStock));
        if (st === "healthy") {
          return (
            <Chip
              icon={
                <CheckCircleOutlineRoundedIcon
                  style={{ fontSize: 14, color: "#059669" }}
                />
              }
              label="In Stock"
              size="small"
              sx={{
                bgcolor: "#ECFDF5",
                color: "#059669",
                fontWeight: 700,
                fontSize: "0.75rem",
                height: 24,
                border: "1px solid rgba(16, 185, 129, 0.2)",
                boxShadow: "none",
              }}
            />
          );
        }
        if (st === "low") {
          return (
            <Chip
              icon={
                <WarningAmberRoundedIcon
                  style={{ fontSize: 14, color: "#D97706" }}
                />
              }
              label="Low Stock"
              size="small"
              sx={{
                bgcolor: "#FFFBEB",
                color: "#D97706",
                fontWeight: 700,
                fontSize: "0.75rem",
                height: 24,
                border: "1px solid rgba(217, 119, 6, 0.2)",
                boxShadow: "none",
              }}
            />
          );
        }
        return (
          <Chip
            icon={
              <ErrorOutlineRoundedIcon
                style={{ fontSize: 14, color: "#DC2626" }}
              />
            }
            label="Out of Stock"
            size="small"
            sx={{
              bgcolor: "#FEF2F2",
              color: "#DC2626",
              fontWeight: 700,
              fontSize: "0.75rem",
              height: 24,
              border: "1px solid rgba(239, 68, 68, 0.2)",
              boxShadow: "none",
            }}
          />
        );
      },
    },
    {
      field: "updatedAt",
      headerName: "Last Updated",
      flex: 1.2,
      minWidth: 160,
      align: "center",
      renderCell: (params) => {
        if (!params.value)
          return <Typography sx={{ color: "#94A3B8" }}>-</Typography>;
        return (
          <Typography
            sx={{ fontSize: "0.825rem", color: "#64748B", fontWeight: 500 }}
          >
            {new Date(params.value).toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Typography>
        );
      },
    },
    {
      field: "actions",
      headerName: "Bin Card",
      sortable: false,
      width: 120,
      align: "center",
      renderCell: (params) => (
        <Tooltip title={`View Bin Card ledger for ${params.row.itemName}`}>
          <Button
            component={Link}
            href={`/dashboard/bin-cards/material?materialId=${params.row.itemId}`}
            size="small"
            variant="outlined"
            sx={{
              borderRadius: "8px",
              borderColor: "#CBD5E1",
              color: "#2563EB",
              textTransform: "none",
              fontWeight: 700,
              fontSize: "0.75rem",
              py: 0.3,
              px: 1.2,
              boxShadow: "none",
              "&:hover": {
                borderColor: "#2563EB",
                bgcolor: "#EFF6FF",
                boxShadow: "none",
              },
            }}
          >
            View
          </Button>
        </Tooltip>
      ),
    },
  ];

  return (
    <Box
      sx={{
        width: "100%",
        height: "auto",
        minHeight: "calc(100vh - 100px)",
        display: "flex",
        flexDirection: "column",
        gap: 2.5,
      }}
    >
      {/* Top Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Box>
          <Typography
            sx={{
              fontWeight: 800,
              color: "#0F172A",
              letterSpacing: "-0.02em",
              lineHeight: 1.2,
            }}
            variant="h4"
          >
            Inventory Storage
          </Typography>
          <Typography
            variant="body2"
            sx={{ color: "#64748B", mt: 0.5, fontWeight: 500 }}
          >
            Real-time material stock levels, reorder thresholds & warehouse bin
            tracking.
          </Typography>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Tooltip title="Refresh Inventory">
            <IconButton
              onClick={fetchInventory}
              sx={{
                bgcolor: "#FFFFFF",
                border: "1px solid #E2E8F0",
                borderRadius: "10px",
                p: 1,
                color: "#475569",
                boxShadow: "none",
                "&:hover": { bgcolor: "#F8FAFC", color: "#0F172A" },
              }}
            >
              <RefreshIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </Tooltip>

          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => setOpen(true)}
            sx={{
              borderRadius: "10px",
              bgcolor: "#2563EB",
              fontWeight: 700,
              textTransform: "none",
              px: 2.25,
              py: 1,
              boxShadow: "none",
              "&:hover": {
                bgcolor: "#1D4ED8",
                boxShadow: "none",
              },
            }}
          >
            Add New Item
          </Button>
        </Box>
      </Box>

      {/* Global Alert */}
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

      {/* KPI Overview Cards */}
      <Grid container spacing={2}>
        {/* Total Items */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card
            elevation={0}
            onClick={() => setStatusFilter("all")}
            sx={{
              p: 2,
              borderRadius: "16px",
              border:
                statusFilter === "all"
                  ? "2px solid #2563EB"
                  : "1px solid #E2E8F0",
              bgcolor: "#FFFFFF",
              cursor: "pointer",
              boxShadow: "none",
              transition: "border-color 0.15s ease",
              "&:hover": {
                borderColor: "#2563EB",
                boxShadow: "none",
              },
            }}
          >
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
              }}
            >
              <Box>
                <Typography
                  variant="caption"
                  sx={{
                    color: "#2563EB",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}
                >
                  Total Items
                </Typography>
                <Typography
                  variant="h4"
                  sx={{ fontWeight: 800, color: "#0F172A", mt: 0.5 }}
                >
                  {stats.total}
                </Typography>
              </Box>
              <Avatar
                sx={{
                  bgcolor: "#EFF6FF",
                  color: "#2563EB",
                  width: 42,
                  height: 42,
                  borderRadius: "12px",
                  boxShadow: "none",
                }}
              >
                <Inventory2OutlinedIcon sx={{ fontSize: 22 }} />
              </Avatar>
            </Box>
          </Card>
        </Grid>

        {/* Healthy Stock */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card
            elevation={0}
            onClick={() => setStatusFilter("healthy")}
            sx={{
              p: 2,
              borderRadius: "16px",
              border:
                statusFilter === "healthy"
                  ? "2px solid #059669"
                  : "1px solid #E2E8F0",
              bgcolor: "#FFFFFF",
              cursor: "pointer",
              boxShadow: "none",
              transition: "border-color 0.15s ease",
              "&:hover": {
                borderColor: "#059669",
                boxShadow: "none",
              },
            }}
          >
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
              }}
            >
              <Box>
                <Typography
                  variant="caption"
                  sx={{
                    color: "#059669",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}
                >
                  Healthy Stock
                </Typography>
                <Typography
                  variant="h4"
                  sx={{ fontWeight: 800, color: "#059669", mt: 0.5 }}
                >
                  {stats.healthy}
                </Typography>
              </Box>
              <Avatar
                sx={{
                  bgcolor: "#ECFDF5",
                  color: "#059669",
                  width: 42,
                  height: 42,
                  borderRadius: "12px",
                  boxShadow: "none",
                }}
              >
                <CheckCircleOutlineRoundedIcon sx={{ fontSize: 22 }} />
              </Avatar>
            </Box>
          </Card>
        </Grid>

        {/* Low Stock */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card
            elevation={0}
            onClick={() => setStatusFilter("low")}
            sx={{
              p: 2,
              borderRadius: "16px",
              border:
                statusFilter === "low"
                  ? "2px solid #D97706"
                  : "1px solid #E2E8F0",
              bgcolor: "#FFFFFF",
              cursor: "pointer",
              boxShadow: "none",
              transition: "border-color 0.15s ease",
              "&:hover": {
                borderColor: "#D97706",
                boxShadow: "none",
              },
            }}
          >
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
              }}
            >
              <Box>
                <Typography
                  variant="caption"
                  sx={{
                    color: "#D97706",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}
                >
                  Low Level Warning
                </Typography>
                <Typography
                  variant="h4"
                  sx={{ fontWeight: 800, color: "#D97706", mt: 0.5 }}
                >
                  {stats.low}
                </Typography>
              </Box>
              <Avatar
                sx={{
                  bgcolor: "#FFFBEB",
                  color: "#D97706",
                  width: 42,
                  height: 42,
                  borderRadius: "12px",
                  boxShadow: "none",
                }}
              >
                <WarningAmberRoundedIcon sx={{ fontSize: 22 }} />
              </Avatar>
            </Box>
          </Card>
        </Grid>

        {/* Depleted */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card
            elevation={0}
            onClick={() => setStatusFilter("depleted")}
            sx={{
              p: 2,
              borderRadius: "16px",
              border:
                statusFilter === "depleted"
                  ? "2px solid #DC2626"
                  : "1px solid #E2E8F0",
              bgcolor: "#FFFFFF",
              cursor: "pointer",
              boxShadow: "none",
              transition: "border-color 0.15s ease",
              "&:hover": {
                borderColor: "#DC2626",
                boxShadow: "none",
              },
            }}
          >
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
              }}
            >
              <Box>
                <Typography
                  variant="caption"
                  sx={{
                    color: "#DC2626",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}
                >
                  Depleted / Out
                </Typography>
                <Typography
                  variant="h4"
                  sx={{ fontWeight: 800, color: "#DC2626", mt: 0.5 }}
                >
                  {stats.depleted}
                </Typography>
              </Box>
              <Avatar
                sx={{
                  bgcolor: "#FEF2F2",
                  color: "#DC2626",
                  width: 42,
                  height: 42,
                  borderRadius: "12px",
                  boxShadow: "none",
                }}
              >
                <ErrorOutlineRoundedIcon sx={{ fontSize: 22 }} />
              </Avatar>
            </Box>
          </Card>
        </Grid>
      </Grid>

      {/* Search Bar */}
      <Box sx={{ width: "100%" }}>
        <SearchBar
          placeholder="Search by material name..."
          value={searchQuery}
          onChange={setSearchQuery}
          maxWidth={{ xs: "100%", sm: 400, md: 450 }}
        />
      </Box>

      {/* Main Table Container */}
      <Box sx={{ flexGrow: 1, minHeight: 560, height: "calc(100vh - 330px)" }}>
        <CustomTable
          rows={filteredInventory}
          columns={columns}
          loading={loading}
        />
      </Box>

      {/* Add Item Dialog */}
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: "16px",
              boxShadow: "none",
              border: "1px solid #E2E8F0",
            },
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: "#0F172A" }}>
          Add New Item
        </DialogTitle>
        <DialogContent>
          <Box
            sx={{ mt: 1, display: "flex", flexDirection: "column", gap: 2.5 }}
          >
            <TextField
              label="Item Name"
              variant="outlined"
              fullWidth
              value={newItem.name}
              onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
              placeholder="e.g. Aluminum Sheets, Quarry Dust"
            />
            <TextField
              select
              label="Unit of Measure"
              variant="outlined"
              fullWidth
              value={newItem.unitOfMeasure}
              onChange={(e) =>
                setNewItem({ ...newItem, unitOfMeasure: e.target.value })
              }
            >
              {[
                "KG",
                "GRAMS",
                "LITERS",
                "MILLILITERS",
                "PIECES",
                "METERS",
                "CENTIMETERS",
                "UNITS",
                "BOXES",
                "PACKS",
                "ROLLS",
                "BAGS",
                "CUBES",
              ].map((unit) => (
                <MenuItem key={unit} value={unit}>
                  {unit}
                </MenuItem>
              ))}
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button
            onClick={() => setOpen(false)}
            color="inherit"
            sx={{ fontWeight: 600, textTransform: "none", boxShadow: "none" }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAddItem}
            variant="contained"
            disabled={submitting || !newItem.name || !newItem.unitOfMeasure}
            sx={{
              fontWeight: 700,
              textTransform: "none",
              bgcolor: "#2563EB",
              borderRadius: "8px",
              boxShadow: "none",
              "&:hover": { bgcolor: "#1D4ED8", boxShadow: "none" },
            }}
          >
            {submitting ? "Adding..." : "Add Item"}
          </Button>
        </DialogActions>
      </Dialog>

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
