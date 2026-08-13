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
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Pagination,
  CircularProgress,
  Chip,
  InputAdornment,
  Autocomplete,
  alpha,
} from "@mui/material";
import SearchBar from "../../components/search/SearchBar";
import PrecisionManufacturingIcon from "@mui/icons-material/PrecisionManufacturing";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import ReportProblemOutlinedIcon from "@mui/icons-material/ReportProblemOutlined";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import ExtensionOutlinedIcon from "@mui/icons-material/ExtensionOutlined";
import { z } from "zod";

type ProductionStatusType = "STORED" | "SOLD" | "CURING" | "DISPATCHED";

const STATUS_CONFIG: Record<
  ProductionStatusType,
  { label: string; bg: string; color: string; border: string; desc: string }
> = {
  STORED: {
    label: "Stored",
    bg: "#ECFDF5",
    color: "#059669",
    border: "rgba(16, 185, 129, 0.2)",
    desc: "Added to warehouse inventory",
  },
  SOLD: {
    label: "Sold",
    bg: "#EFF6FF",
    color: "#2563EB",
    border: "rgba(37, 99, 235, 0.2)",
    desc: "Direct sale to customer",
  },
  CURING: {
    label: "Curing",
    bg: "#FFFBEB",
    color: "#D97706",
    border: "rgba(217, 119, 6, 0.2)",
    desc: "Undergoing curing process",
  },
  DISPATCHED: {
    label: "Dispatched",
    bg: "#F5F3FF",
    color: "#7C3AED",
    border: "rgba(124, 58, 237, 0.2)",
    desc: "Dispatched for delivery",
  },
};

const productionSchema = z.object({
  reportDate: z.string().min(1, "Report date is required"),
  productType: z.string().min(1, "Product type is required"),
  status: z.enum(["STORED", "SOLD", "CURING", "DISPATCHED"]),
  qtyProduced: z.number().min(1, "Must produce at least 1 unit"),
  damages: z.number().min(0, "Damages cannot be negative"),
  materials: z.array(
    z.object({
      itemId: z.string().min(1, "Material is required"),
      amount: z.number().positive("Quantity must be greater than 0"),
    }),
  ),
  productUsages: z.array(
    z.object({
      productName: z.string().min(1, "Product is required"),
      amount: z.number().positive("Quantity must be greater than 0"),
    }),
  ),
});

interface InventoryItem {
  itemId: string;
  itemName: string;
  isDefaultMaterial: boolean;
  unitOfMeasure: string;
  currentStock?: number;
}

interface MaterialUsageDto {
  itemId: string;
  itemName: string;
  amount: number;
}

interface ProductUsageDto {
  productName: string;
  amount: number;
}

interface ProductionItemResponseDto {
  id: string;
  reportDate: string;
  workerName?: string;
  productType: string;
  qtyProduced: number;
  status?: ProductionStatusType;
  materials: MaterialUsageDto[];
  productUsages?: ProductUsageDto[];
  damages: number;
}

interface BuiltProductOption {
  productName: string;
  currentStock: number;
  unitOfMeasure: string;
}

const DEFAULT_MATERIAL_NAMES = [
  "Cement",
  "Quarry Dust",
  "River Sand",
  "1/2 Metal",
  "3/4 Metal",
];

export default function ProductionView() {
  const [items, setItems] = useState<ProductionItemResponseDto[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);

  // Modal Form State
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<any>({});

  // Form Fields
  const [reportDate, setReportDate] = useState(
    () => new Date().toISOString().split("T")[0],
  );
  const [productType, setProductType] = useState("");
  const [status, setStatus] = useState<ProductionStatusType>("STORED");
  const [qtyProduced, setQtyProduced] = useState("");
  const [damages, setDamages] = useState("0");

  // Inputs Consumed: Materials + Built Products
  const [materials, setMaterials] = useState<
    { itemId: string; amount: string }[]
  >([]);
  const [productUsages, setProductUsages] = useState<
    { productName: string; amount: string }[]
  >([]);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/production/items");
      if (!res.ok) throw new Error("Failed to fetch production items");
      const data = await res.json();
      setItems(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchInventory = async () => {
    try {
      const res = await fetch("/api/inventory/current");
      if (res.ok) {
        const invData = await res.json();
        const itemsList = Array.isArray(invData)
          ? invData
          : invData.content || [];
        setInventoryItems(itemsList);
        return itemsList;
      }
    } catch (err) {
      console.error("Failed to load inventory:", err);
    }
    return [];
  };

  // Compute built products with their available stock balances from ledger items
  const builtProductOptions: BuiltProductOption[] = useMemo(() => {
    const map = new Map<
      string,
      { produced: number; damages: number; used: number }
    >();

    items.forEach((item) => {
      const pName = item.productType?.trim();
      if (!pName) return;

      const curr = map.get(pName) || { produced: 0, damages: 0, used: 0 };
      curr.produced += Number(item.qtyProduced) || 0;
      curr.damages += Number(item.damages) || 0;

      if (item.productUsages) {
        item.productUsages.forEach((pu) => {
          const usedPName = pu.productName?.trim();
          if (usedPName) {
            const uCurr = map.get(usedPName) || {
              produced: 0,
              damages: 0,
              used: 0,
            };
            uCurr.used += Number(pu.amount) || 0;
            map.set(usedPName, uCurr);
          }
        });
      }

      map.set(pName, curr);
    });

    return Array.from(map.entries()).map(([name, stats]) => ({
      productName: name,
      currentStock: Math.max(0, stats.produced - stats.damages - stats.used),
      unitOfMeasure: "PCS",
    }));
  }, [items]);

  // Distinct known product names for creating product autocomplete
  const existingProductNames = useMemo(() => {
    return builtProductOptions.map((p) => p.productName);
  }, [builtProductOptions]);

  const initDefaultMaterials = (inv: InventoryItem[]) => {
    const defaults = inv.filter((i) => i.isDefaultMaterial);
    setMaterials(defaults.map((d) => ({ itemId: d.itemId, amount: "" })));
  };

  useEffect(() => {
    fetchInventory().then((inv) => {
      initDefaultMaterials(inv);
    });
    fetchItems();
  }, []);

  const handleOpenModal = () => {
    initDefaultMaterials(inventoryItems);
    setProductUsages([]);
    setProductType("");
    setStatus("STORED");
    setQtyProduced("");
    setDamages("0");
    setFormErrors({});
    setOpen(true);
  };

  // Raw Material row handlers
  const handleAddMaterialRow = () => {
    setMaterials([...materials, { itemId: "", amount: "" }]);
  };

  const handleRemoveMaterialRow = (index: number) => {
    const updated = [...materials];
    updated.splice(index, 1);
    setMaterials(updated);
  };

  const handleMaterialChange = (
    index: number,
    field: "itemId" | "amount",
    value: string,
  ) => {
    const updated = [...materials];
    updated[index][field] = value;
    setMaterials(updated);
  };

  // Built Product row handlers
  const handleAddProductUsageRow = () => {
    setProductUsages([...productUsages, { productName: "", amount: "" }]);
  };

  const handleRemoveProductUsageRow = (index: number) => {
    const updated = [...productUsages];
    updated.splice(index, 1);
    setProductUsages(updated);
  };

  const handleProductUsageChange = (
    index: number,
    field: "productName" | "amount",
    value: string,
  ) => {
    const updated = [...productUsages];
    updated[index][field] = value;
    setProductUsages(updated);
  };

  const getInventoryItem = (id: string) => {
    return inventoryItems.find((i) => i.itemId === id);
  };

  const getBuiltProduct = (name: string) => {
    return builtProductOptions.find(
      (p) => p.productName.toLowerCase() === name.toLowerCase(),
    );
  };

  // Over stock calculations
  const hasOverDeductions = useMemo(() => {
    const matOver = materials.some((m) => {
      if (!m.itemId || !m.amount) return false;
      const inv = getInventoryItem(m.itemId);
      const amt = parseFloat(m.amount);
      return inv && !isNaN(amt) && amt > (inv.currentStock ?? 0);
    });

    const prodOver = productUsages.some((pu) => {
      if (!pu.productName || !pu.amount) return false;
      const bp = getBuiltProduct(pu.productName);
      const amt = parseFloat(pu.amount);
      return bp && !isNaN(amt) && amt > bp.currentStock;
    });

    return matOver || prodOver;
  }, [materials, productUsages, inventoryItems, builtProductOptions]);

  // Derived yield calculations
  const parsedQty = parseInt(qtyProduced, 10) || 0;
  const parsedDamages = parseInt(damages, 10) || 0;
  const netYield = Math.max(0, parsedQty - parsedDamages);

  const handleSubmit = async () => {
    setFormErrors({});
    setError("");

    const validMaterials = materials
      .filter((m) => m.itemId !== "" && m.amount !== "")
      .map((m) => ({
        itemId: m.itemId,
        amount: Number(m.amount),
      }));

    const validProductUsages = productUsages
      .filter((pu) => pu.productName !== "" && pu.amount !== "")
      .map((pu) => ({
        productName: pu.productName.trim(),
        amount: Number(pu.amount),
      }));

    if (validMaterials.length === 0 && validProductUsages.length === 0) {
      setFormErrors({
        inputs:
          "Please add at least one material or product used in this production",
      });
      return;
    }

    const parsed = productionSchema.safeParse({
      reportDate,
      productType: productType.trim(),
      status,
      qtyProduced: qtyProduced === "" ? undefined : Number(qtyProduced),
      damages: damages === "" ? 0 : Number(damages),
      materials: validMaterials,
      productUsages: validProductUsages,
    });

    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      setFormErrors({
        reportDate: fieldErrors.reportDate?.[0],
        productType: fieldErrors.productType?.[0],
        status: fieldErrors.status?.[0],
        qtyProduced: fieldErrors.qtyProduced?.[0],
        damages: fieldErrors.damages?.[0],
      });
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        reportDate: parsed.data.reportDate,
        productionItems: [
          {
            productType: parsed.data.productType,
            status: parsed.data.status,
            qtyProduced: parsed.data.qtyProduced,
            damages: parsed.data.damages,
            materials: parsed.data.materials,
            productUsages: parsed.data.productUsages,
          },
        ],
      };

      const res = await fetch("/api/production/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || "Failed to record production item");
      }

      setSuccessMsg("Production batch successfully recorded!");
      setOpen(false);

      // Refresh data
      fetchItems();
      fetchInventory();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getMaterialAmount = (
    rowMaterials: MaterialUsageDto[],
    name: string,
  ) => {
    const m = rowMaterials?.find((r) => r.itemName === name);
    return m ? m.amount : 0;
  };



  const filteredItems = useMemo(() => {
    return items.filter((item) =>
      item.productType.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [items, searchQuery]);

  // Clean flat input styling (no shadow)
  const textFieldSx = {
    width: "100%",
    "& .MuiOutlinedInput-root": {
      width: "100%",
      height: 40,
      minHeight: 40,
      maxHeight: 40,
      borderRadius: "12px",
      bgcolor: "#FFFFFF",
      fontSize: "0.875rem",
      boxShadow: "none",
      "& fieldset": { borderColor: "#E2E8F0", borderWidth: "1.5px" },
      "&:hover fieldset": { borderColor: "#CBD5E1" },
      "&.Mui-focused fieldset": {
        borderColor: "#2563EB",
        borderWidth: "2px",
      },
    },
    "& .MuiInputLabel-root.Mui-focused": {
      color: "#2563EB",
    },
  };

  return (
    <Box
      sx={{
        width: "100%",
        height: "calc(100vh - 120px)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Top Header */}
      <Box
        sx={{
          mb: 3,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography
          sx={{
            fontWeight: 800,
            color: "#0F172A",
            letterSpacing: "-0.02em",
          }}
          variant="h4"
        >
          Daily Production Logs
        </Typography>

        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleOpenModal}
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
          Add Production Item
        </Button>
      </Box>

      {/* Global Alerts */}
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

      {/* Search Bar */}
      <Box sx={{ mb: 3 }}>
        <SearchBar
          value={searchQuery}
          onChange={(val) => {
            setSearchQuery(val);
            setPage(1);
          }}
          placeholder="Search by product..."
          maxWidth={{ xs: "100%", sm: 400 }}
        />
      </Box>

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
          boxShadow: "none",
          flexGrow: 1,
          minHeight: 0,
        }}
      >
        <TableContainer sx={{ flexGrow: 1 }}>
          <Table
            stickyHeader
            sx={{
              "& .MuiTableCell-root": {
                borderRight: "1px solid #dfe2e6ff",
                borderBottom: "1px solid #dfe2e6ff !important",
                px: 1,
              },
              "& .MuiTableHead-root .MuiTableCell-root": {
                borderRight: "1px solid #dfe2e6ff",
                borderBottom: "1px solid #dfe2e6ff !important",
                borderTop: "1px solid #dfe2e6ff",
                bgcolor: "#F8FAFC",
                color: "#475569",
                fontWeight: 700,
                fontSize: "0.75rem",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                whiteSpace: "nowrap",
                py: 1.2,
              },
              "& .MuiTableHead-root .MuiTableRow-root:first-of-type .MuiTableCell-root": {
                top: 0,
                zIndex: 3,
              },
              "& .MuiTableHead-root .MuiTableRow-root:nth-of-type(2) .MuiTableCell-root": {
                top: "37px",
                zIndex: 2,
                bgcolor: "#F8FAFC",
                fontSize: "0.7rem",
                py: 0.8,
              },
            }}
          >
            <TableHead>
              <TableRow>
                <TableCell align="center" rowSpan={2}>
                  Date
                </TableCell>
                <TableCell align="center" rowSpan={2}>
                  Status
                </TableCell>
                <TableCell align="center" rowSpan={2}>
                  Product
                </TableCell>
                <TableCell align="center" rowSpan={2}>
                  Qty
                </TableCell>
                <TableCell align="center" rowSpan={2}>
                  Damages
                </TableCell>
                <TableCell align="center" rowSpan={2}>
                  Cement
                </TableCell>
                <TableCell align="center" rowSpan={2}>
                  QD
                </TableCell>
                <TableCell align="center" rowSpan={2}>
                  RS
                </TableCell>
                <TableCell align="center" rowSpan={2}>
                  1/2 M
                </TableCell>
                <TableCell align="center" rowSpan={2}>
                  3/4 M
                </TableCell>
                <TableCell align="center" colSpan={2}>
                  Other Materials
                </TableCell>
                <TableCell align="center" colSpan={2} sx={{ borderRight: "none !important" }}>
                  Products Used
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell align="center">Name</TableCell>
                <TableCell align="center">Amount</TableCell>
                <TableCell align="center">Name</TableCell>
                <TableCell align="center" sx={{ borderRight: "none !important" }}>Amount</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={14} align="center" sx={{ py: 8 }}>
                    <CircularProgress size={30} />
                    <Typography
                      variant="body2"
                      sx={{ mt: 1.5, color: "#64748B" }}
                    >
                      Loading daily production logs...
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : filteredItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={14} align="center" sx={{ py: 8 }}>
                    <Typography
                      variant="subtitle1"
                      sx={{ fontWeight: 700, color: "#334155" }}
                    >
                      No Production Records Found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredItems.slice((page - 1) * 10, page * 10).map((row) => {
                  const st = row.status || "STORED";
                  const stConfig = STATUS_CONFIG[st] || STATUS_CONFIG.STORED;
                  const otherMaterials =
                    row.materials?.filter(
                      (r) => !DEFAULT_MATERIAL_NAMES.includes(r.itemName),
                    ) || [];
                  const productUsagesList = row.productUsages || [];

                  const numOther = otherMaterials.length;
                  const numProd = productUsagesList.length;
                  const rowCount = Math.max(1, numOther, numProd);

                  return (
                    <React.Fragment key={row.id}>
                      {Array.from({ length: rowCount }).map((_, subIdx) => {
                        const isFirstSub = subIdx === 0;

                        return (
                          <TableRow
                            key={`${row.id}-sub-${subIdx}`}
                            hover
                            sx={{
                              "&:hover": { bgcolor: "#F8FAFC !important" },
                              transition: "background-color 0.15s ease",
                            }}
                          >
                            {/* Main 10 columns rendered on first sub-row with rowSpan */}
                            {isFirstSub && (
                              <>
                                <TableCell
                                  align="center"
                                  rowSpan={rowCount}
                                  sx={{
                                    py: 1.8,
                                    fontSize: "0.875rem",
                                    color: "#334155",
                                    fontWeight: 500,
                                    whiteSpace: "nowrap",
                                    verticalAlign: "middle",
                                  }}
                                >
                                  {new Date(row.reportDate).toLocaleDateString()}
                                </TableCell>
                                <TableCell
                                  align="center"
                                  rowSpan={rowCount}
                                  sx={{
                                    py: 1.8,
                                    whiteSpace: "nowrap",
                                    verticalAlign: "middle",
                                  }}
                                >
                                  <Chip
                                    label={stConfig.label}
                                    size="small"
                                    sx={{
                                      bgcolor: stConfig.bg,
                                      color: stConfig.color,
                                      fontWeight: 700,
                                      fontSize: "0.75rem",
                                      border: `1px solid ${stConfig.border}`,
                                      height: 24,
                                      boxShadow: "none",
                                    }}
                                  />
                                </TableCell>
                                <TableCell
                                  align="center"
                                  rowSpan={rowCount}
                                  sx={{
                                    py: 1.8,
                                    fontSize: "0.875rem",
                                    color: "#0F172A",
                                    fontWeight: 600,
                                    verticalAlign: "middle",
                                  }}
                                >
                                  {row.productType}
                                </TableCell>
                                <TableCell
                                  align="center"
                                  rowSpan={rowCount}
                                  sx={{
                                    py: 1.8,
                                    whiteSpace: "nowrap",
                                    verticalAlign: "middle",
                                  }}
                                >
                                  <Chip
                                    icon={
                                      <TrendingUpIcon
                                        style={{ color: "#059669", fontSize: 15 }}
                                      />
                                    }
                                    label={`+${row.qtyProduced}`}
                                    size="small"
                                    sx={{
                                      bgcolor: "#ECFDF5",
                                      color: "#059669",
                                      fontWeight: 700,
                                      fontSize: "0.8rem",
                                      border: "1px solid rgba(16, 185, 129, 0.2)",
                                      height: 24,
                                      boxShadow: "none",
                                    }}
                                  />
                                </TableCell>
                                <TableCell
                                  align="center"
                                  rowSpan={rowCount}
                                  sx={{
                                    py: 1.8,
                                    whiteSpace: "nowrap",
                                    verticalAlign: "middle",
                                  }}
                                >
                                  {row.damages > 0 ? (
                                    <Chip
                                      icon={
                                        <ReportProblemOutlinedIcon
                                          style={{ color: "#DC2626", fontSize: 15 }}
                                        />
                                      }
                                      label={`-${row.damages}`}
                                      size="small"
                                      sx={{
                                        bgcolor: "#FEF2F2",
                                        color: "#DC2626",
                                        fontWeight: 700,
                                        fontSize: "0.8rem",
                                        border: "1px solid rgba(239, 68, 68, 0.2)",
                                        height: 24,
                                        boxShadow: "none",
                                      }}
                                    />
                                  ) : (
                                    "-"
                                  )}
                                </TableCell>
                                <TableCell
                                  align="center"
                                  rowSpan={rowCount}
                                  sx={{
                                    py: 1.8,
                                    fontSize: "0.875rem",
                                    color: "#334155",
                                    verticalAlign: "middle",
                                  }}
                                >
                                  {getMaterialAmount(row.materials, "Cement")}
                                </TableCell>
                                <TableCell
                                  align="center"
                                  rowSpan={rowCount}
                                  sx={{
                                    py: 1.8,
                                    fontSize: "0.875rem",
                                    color: "#334155",
                                    verticalAlign: "middle",
                                  }}
                                >
                                  {getMaterialAmount(row.materials, "Quarry Dust")}
                                </TableCell>
                                <TableCell
                                  align="center"
                                  rowSpan={rowCount}
                                  sx={{
                                    py: 1.8,
                                    fontSize: "0.875rem",
                                    color: "#334155",
                                    verticalAlign: "middle",
                                  }}
                                >
                                  {getMaterialAmount(row.materials, "River Sand")}
                                </TableCell>
                                <TableCell
                                  align="center"
                                  rowSpan={rowCount}
                                  sx={{
                                    py: 1.8,
                                    fontSize: "0.875rem",
                                    color: "#334155",
                                    verticalAlign: "middle",
                                  }}
                                >
                                  {getMaterialAmount(row.materials, "1/2 Metal")}
                                </TableCell>
                                <TableCell
                                  align="center"
                                  rowSpan={rowCount}
                                  sx={{
                                    py: 1.8,
                                    fontSize: "0.875rem",
                                    color: "#334155",
                                    verticalAlign: "middle",
                                  }}
                                >
                                  {getMaterialAmount(row.materials, "3/4 Metal")}
                                </TableCell>
                              </>
                            )}

                            {/* Other Materials - Name & Amount */}
                            {(() => {
                              if (numOther <= 1) {
                                if (!isFirstSub) return null;
                                return (
                                  <>
                                    <TableCell
                                      align="center"
                                      rowSpan={rowCount}
                                      sx={{
                                        py: 1.5,
                                        fontSize: "0.8125rem",
                                        fontWeight: 600,
                                        color: numOther === 1 ? "#334155" : "#94A3B8",
                                        minWidth: 100,
                                        verticalAlign: "middle",
                                      }}
                                    >
                                      {numOther === 1 ? otherMaterials[0].itemName : "-"}
                                    </TableCell>
                                    <TableCell
                                      align="center"
                                      rowSpan={rowCount}
                                      sx={{
                                        py: 1.5,
                                        fontSize: "0.8125rem",
                                        fontWeight: 700,
                                        color: numOther === 1 ? "#16A34A" : "#94A3B8",
                                        minWidth: 70,
                                        verticalAlign: "middle",
                                      }}
                                    >
                                      {numOther === 1 ? otherMaterials[0].amount : "-"}
                                    </TableCell>
                                  </>
                                );
                              } else {
                                const item = otherMaterials[subIdx];
                                return (
                                  <>
                                    <TableCell
                                      align="center"
                                      sx={{
                                        py: 1.5,
                                        fontSize: "0.8125rem",
                                        fontWeight: 600,
                                        color: item ? "#334155" : "#94A3B8",
                                        minWidth: 100,
                                        verticalAlign: "middle",
                                      }}
                                    >
                                      {item ? item.itemName : "-"}
                                    </TableCell>
                                    <TableCell
                                      align="center"
                                      sx={{
                                        py: 1.5,
                                        fontSize: "0.8125rem",
                                        fontWeight: 700,
                                        color: item ? "#16A34A" : "#94A3B8",
                                        minWidth: 70,
                                        verticalAlign: "middle",
                                      }}
                                    >
                                      {item ? item.amount : "-"}
                                    </TableCell>
                                  </>
                                );
                              }
                            })()}

                            {/* Products Used - Name (Blue) & Amount (Green) */}
                            {(() => {
                              if (numProd <= 1) {
                                if (!isFirstSub) return null;
                                return (
                                  <>
                                    <TableCell
                                      align="center"
                                      rowSpan={rowCount}
                                      sx={{
                                        py: 1.5,
                                        fontSize: "0.8125rem",
                                        fontWeight: 600,
                                        color: numProd === 1 ? "#2563EB" : "#94A3B8",
                                        minWidth: 120,
                                        verticalAlign: "middle",
                                      }}
                                    >
                                      {numProd === 1 ? productUsagesList[0].productName : "-"}
                                    </TableCell>
                                    <TableCell
                                      align="center"
                                      rowSpan={rowCount}
                                      sx={{
                                        py: 1.5,
                                        fontSize: "0.8125rem",
                                        fontWeight: 700,
                                        color: numProd === 1 ? "#16A34A" : "#94A3B8",
                                        minWidth: 70,
                                        verticalAlign: "middle",
                                        borderRight: "none !important",
                                      }}
                                    >
                                      {numProd === 1 ? productUsagesList[0].amount : "-"}
                                    </TableCell>
                                  </>
                                );
                              } else {
                                const pu = productUsagesList[subIdx];
                                return (
                                  <>
                                    <TableCell
                                      align="center"
                                      sx={{
                                        py: 1.5,
                                        fontSize: "0.8125rem",
                                        fontWeight: 600,
                                        color: pu ? "#2563EB" : "#94A3B8",
                                        minWidth: 120,
                                        verticalAlign: "middle",
                                      }}
                                    >
                                      {pu ? pu.productName : "-"}
                                    </TableCell>
                                    <TableCell
                                      align="center"
                                      sx={{
                                        py: 1.5,
                                        fontSize: "0.8125rem",
                                        fontWeight: 700,
                                        color: pu ? "#16A34A" : "#94A3B8",
                                        minWidth: 70,
                                        verticalAlign: "middle",
                                        borderRight: "none !important",
                                      }}
                                    >
                                      {pu ? pu.amount : "-"}
                                    </TableCell>
                                  </>
                                );
                              }
                            })()}
                          </TableRow>
                        );
                      })}
                    </React.Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {filteredItems.length > 0 && (
          <Box
            sx={{
              p: 1.5,
              px: 2.5,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderTop: "1px solid #E2E8F0",
              bgcolor: "#FFFFFF",
            }}
          >
            <Typography
              variant="body2"
              sx={{ color: "#64748B", fontSize: "0.85rem" }}
            >
              Showing {Math.min((page - 1) * 10 + 1, filteredItems.length)} -{" "}
              {Math.min(page * 10, filteredItems.length)} of{" "}
              {filteredItems.length} records
            </Typography>
            <Pagination
              count={Math.max(1, Math.ceil(filteredItems.length / 10))}
              page={page}
              onChange={(_, p) => setPage(p)}
              shape="rounded"
              color="primary"
              size="small"
            />
          </Box>
        )}
      </Paper>

      {/* ============================================================== */}
      {/* 2-COLUMN MODERN MODAL WITH RAW MATERIALS & BUILT PRODUCTS       */}
      {/* ============================================================== */}
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="xl"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: "20px",
              boxShadow: "none",
              border: "1px solid #E2E8F0",
              bgcolor: "#FFFFFF",
              backgroundImage: "none",
              maxWidth: { xs: "96%", sm: 1140, md: 1180 },
              width: "100%",
            },
          },
        }}
      >
        {/* Title Header */}
        <DialogTitle
          sx={{
            p: 3,
            px: 3.5,
            borderBottom: "1px solid #E2E8F0",
            bgcolor: "#FFFFFF",
          }}
        >
          <Typography
            variant="h6"
            sx={{
              fontWeight: 800,
              color: "#0F172A",
              fontSize: "1.25rem",
              letterSpacing: "-0.01em",
              lineHeight: 1.2,
            }}
          >
            Add Production Item
          </Typography>
          <Typography
            variant="body2"
            sx={{ color: "#64748B", fontSize: "0.825rem", mt: 0.3 }}
          >
            Record manufactured output, status, raw materials, and consumed
            products
          </Typography>
        </DialogTitle>

        <DialogContent sx={{ p: 0 }}>
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", md: "row" },
              width: "100%",
              minHeight: 490,
            }}
          >
            {/* -------------------------------------------------------- */}
            {/* LEFT COLUMN: Production Output Details                   */}
            {/* -------------------------------------------------------- */}
            <Box
              sx={{
                flex: 1,
                p: 3.5,
                display: "flex",
                flexDirection: "column",
                gap: 2.5,
                boxSizing: "border-box",
                width: { xs: "100%", md: "46%" },
              }}
            >
              {/* Report Date */}
              <TextField
                label="Report Date"
                type="date"
                fullWidth
                variant="outlined"
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
                error={!!formErrors.reportDate}
                helperText={formErrors.reportDate}
                sx={textFieldSx}
                slotProps={{
                  inputLabel: { shrink: true },
                }}
              />

              {/* Product Selection / Entry (Select existing or type new) */}
              <Autocomplete
                freeSolo
                options={existingProductNames}
                value={productType}
                onInputChange={(_, newVal) => setProductType(newVal)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Product Name / Type"
                    error={!!formErrors.productType}
                    helperText={formErrors.productType}
                    sx={textFieldSx}
                  />
                )}
              />

              {/* Status Selector */}
              <TextField
                select
                label="Production Status"
                fullWidth
                value={status}
                onChange={(e) =>
                  setStatus(e.target.value as ProductionStatusType)
                }
                error={!!formErrors.status}
                helperText={formErrors.status}
                sx={textFieldSx}
              >
                {(Object.keys(STATUS_CONFIG) as ProductionStatusType[]).map(
                  (stKey) => {
                    const cfg = STATUS_CONFIG[stKey];
                    return (
                      <MenuItem key={stKey} value={stKey}>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            width: "100%",
                          }}
                        >
                          <Typography
                            sx={{ fontWeight: 600, color: "#1E293B" }}
                          >
                            {cfg.label}
                          </Typography>
                          <Chip
                            label={cfg.label}
                            size="small"
                            sx={{
                              bgcolor: cfg.bg,
                              color: cfg.color,
                              fontWeight: 700,
                              fontSize: "0.7rem",
                              height: 22,
                              border: `1px solid ${cfg.border}`,
                            }}
                          />
                        </Box>
                      </MenuItem>
                    );
                  },
                )}
              </TextField>

              {/* Quantity Produced and Damages */}
              <Box sx={{ display: "flex", gap: 2 }}>
                <TextField
                  label="Qty Produced"
                  type="number"
                  fullWidth
                  variant="outlined"
                  value={qtyProduced}
                  onChange={(e) => setQtyProduced(e.target.value)}
                  error={!!formErrors.qtyProduced}
                  helperText={formErrors.qtyProduced || "Manufactured units"}
                  sx={textFieldSx}
                />

                <TextField
                  label="Damages"
                  type="number"
                  fullWidth
                  variant="outlined"
                  value={damages}
                  onChange={(e) => setDamages(e.target.value)}
                  error={!!formErrors.damages}
                  helperText={formErrors.damages || "Damaged/scrap units"}
                  sx={textFieldSx}
                />
              </Box>

              {/* Net Yield Calculation Card */}
              <Box
                sx={{
                  bgcolor: "#F8FAFC",
                  borderRadius: "14px",
                  p: 2,
                  border: "1px solid #E2E8F0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Box>
                  <Typography
                    variant="caption"
                    sx={{ color: "#64748B", fontWeight: 700 }}
                  >
                    NET PRODUCTIVE YIELD
                  </Typography>
                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: 800,
                      color: netYield > 0 ? "#059669" : "#64748B",
                      mt: 0.25,
                    }}
                  >
                    {netYield}{" "}
                    <Typography
                      component="span"
                      variant="caption"
                      sx={{ color: "#64748B", fontWeight: 600 }}
                    >
                      usable units
                    </Typography>
                  </Typography>
                </Box>

                <Chip
                  label={
                    parsedDamages > 0
                      ? `${parsedDamages} damaged`
                      : "Zero damages"
                  }
                  size="small"
                  sx={{
                    bgcolor: parsedDamages > 0 ? "#FEF2F2" : "#ECFDF5",
                    color: parsedDamages > 0 ? "#DC2626" : "#059669",
                    fontWeight: 700,
                    fontSize: "0.725rem",
                    border: "1px solid",
                    borderColor:
                      parsedDamages > 0
                        ? "rgba(239, 68, 68, 0.2)"
                        : "rgba(16, 185, 129, 0.2)",
                  }}
                />
              </Box>
            </Box>

            {/* -------------------------------------------------------- */}
            {/* RIGHT COLUMN: Consumed Raw Materials & Produced Products */}
            {/* -------------------------------------------------------- */}
            <Box
              sx={{
                flex: 1.2,
                p: 3.5,
                bgcolor: "#F8FAFC",
                borderLeft: { xs: "none", md: "1px solid #E2E8F0" },
                borderTop: { xs: "1px solid #E2E8F0", md: "none" },
                display: "flex",
                flexDirection: "column",
                gap: 2.5,
                boxSizing: "border-box",
                width: { xs: "100%", md: "54%" },
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Box sx={{ display: "flex", gap: 1 }}>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={handleAddMaterialRow}
                    sx={{
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      textTransform: "none",
                      color: "#2563EB",
                      borderColor: "#93C5FD",
                      bgcolor: "#FFFFFF",
                      boxShadow: "none",
                      "&:hover": {
                        bgcolor: alpha("#2563EB", 0.05),
                        boxShadow: "none",
                      },
                    }}
                  >
                    + Add Material
                  </Button>

                  <Button
                    size="small"
                    variant="contained"
                    onClick={handleAddProductUsageRow}
                    sx={{
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      textTransform: "none",
                      bgcolor: "#2563EB",
                      boxShadow: "none",
                      "&:hover": {
                        bgcolor: "#1D4ED8",
                        boxShadow: "none",
                      },
                    }}
                  >
                    + Add Product
                  </Button>
                </Box>
              </Box>

              {formErrors.inputs && (
                <Alert
                  severity="error"
                  icon={false}
                  sx={{ py: 0.5, borderRadius: "10px" }}
                >
                  {formErrors.inputs}
                </Alert>
              )}

              {/* Scrollable Container for all consumed rows */}
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                  maxHeight: 360,
                  overflowY: "auto",
                  pr: 0.5,
                }}
              >
                {/* 1. Raw Materials Section */}
                {materials.length > 0 && (
                  <Box
                    sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      <Typography
                        variant="caption"
                        sx={{
                          color: "#64748B",
                          fontWeight: 700,
                          textTransform: "uppercase",
                        }}
                      >
                        Raw Materials ({materials.length})
                      </Typography>
                    </Box>

                    {materials.map((mat, index) => {
                      const selectedInv = getInventoryItem(mat.itemId);
                      const currentStock = selectedInv?.currentStock ?? 0;
                      const amtNum = parseFloat(mat.amount);
                      const isOverStock =
                        selectedInv && !isNaN(amtNum) && amtNum > currentStock;

                      return (
                        <Box
                          key={`mat-${index}`}
                          sx={{
                            p: 1.75,
                            bgcolor: "#FFFFFF",
                            borderRadius: "12px",
                            border: isOverStock
                              ? "1.5px solid #EF4444"
                              : "1px solid #E2E8F0",
                            display: "flex",
                            flexDirection: "column",
                            gap: 1,
                          }}
                        >
                          <Box
                            sx={{
                              display: "flex",
                              gap: 1.5,
                              alignItems: "flex-end",
                            }}
                          >
                            {/* Material Select */}
                            <TextField
                              select
                              size="small"
                              label="Raw Material"
                              value={mat.itemId}
                              onChange={(e) =>
                                handleMaterialChange(
                                  index,
                                  "itemId",
                                  e.target.value,
                                )
                              }
                              sx={{ flex: 1.4, ...textFieldSx }}
                            >
                              <MenuItem value="" disabled>
                                <em>Select raw material</em>
                              </MenuItem>
                              {inventoryItems.map((inv) => (
                                <MenuItem key={inv.itemId} value={inv.itemId}>
                                  <Box
                                    sx={{
                                      display: "flex",
                                      justifyContent: "space-between",
                                      width: "100%",
                                      gap: 2,
                                    }}
                                  >
                                    <Typography
                                      sx={{
                                        fontWeight: 600,
                                        color: "#1E293B",
                                        fontSize: "0.825rem",
                                      }}
                                    >
                                      {inv.itemName}
                                    </Typography>
                                    <Typography
                                      variant="caption"
                                      sx={{
                                        color:
                                          (inv.currentStock ?? 0) <= 0
                                            ? "#EF4444"
                                            : "#64748B",
                                        fontWeight: 600,
                                      }}
                                    >
                                      Stock: {inv.currentStock ?? 0}{" "}
                                      {inv.unitOfMeasure}
                                    </Typography>
                                  </Box>
                                </MenuItem>
                              ))}
                            </TextField>

                            {/* Qty Used */}
                            <TextField
                              size="small"
                              label="Qty Used"
                              type="number"
                              value={mat.amount}
                              onChange={(e) =>
                                handleMaterialChange(
                                  index,
                                  "amount",
                                  e.target.value,
                                )
                              }
                              error={isOverStock}
                              slotProps={{
                                input: {
                                  endAdornment: selectedInv ? (
                                    <InputAdornment position="end">
                                      <Typography
                                        variant="caption"
                                        sx={{
                                          color: "#64748B",
                                          fontWeight: 600,
                                        }}
                                      >
                                        {selectedInv.unitOfMeasure}
                                      </Typography>
                                    </InputAdornment>
                                  ) : null,
                                },
                              }}
                              sx={{ flex: 1, ...textFieldSx }}
                            />

                            {/* Delete Action Button */}
                            <Button
                              size="small"
                              onClick={() => handleRemoveMaterialRow(index)}
                              sx={{
                                height: 40,
                                minHeight: 40,
                                maxHeight: 40,
                                minWidth: 40,
                                px: 1.5,
                                bgcolor: "#FEF2F2",
                                color: "#DC2626",
                                border: "1px solid rgba(239, 68, 68, 0.15)",
                                borderRadius: "10px",
                                fontWeight: 700,
                                fontSize: "0.8rem",
                                textTransform: "none",
                                flexShrink: 0,
                                "&:hover": { bgcolor: "#FEE2E2" },
                              }}
                            >
                              Remove
                            </Button>
                          </Box>

                          {/* Available stock badge */}
                          {selectedInv && (
                            <Box
                              sx={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                pt: 0.25,
                              }}
                            >
                              <Typography
                                variant="caption"
                                sx={{
                                  color: isOverStock ? "#DC2626" : "#64748B",
                                  fontWeight: 600,
                                  fontSize: "0.725rem",
                                }}
                              >
                                {isOverStock ? (
                                  `Exceeds available stock (${currentStock} ${selectedInv.unitOfMeasure})`
                                ) : (
                                  <>
                                    Available:{" "}
                                    <strong style={{ color: "#0F172A" }}>
                                      {currentStock} {selectedInv.unitOfMeasure}
                                    </strong>
                                  </>
                                )}
                              </Typography>

                              {!isNaN(amtNum) && amtNum > 0 && !isOverStock && (
                                <Typography
                                  variant="caption"
                                  sx={{
                                    color: "#059669",
                                    fontWeight: 700,
                                    fontSize: "0.725rem",
                                  }}
                                >
                                  Remaining:{" "}
                                  {(currentStock - amtNum).toFixed(1)}{" "}
                                  {selectedInv.unitOfMeasure}
                                </Typography>
                              )}
                            </Box>
                          )}
                        </Box>
                      );
                    })}
                  </Box>
                )}

                {/* 2. Produced Products Used Section */}
                {productUsages.length > 0 && (
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 1.5,
                      mt: materials.length > 0 ? 1 : 0,
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      <Typography
                        variant="caption"
                        sx={{
                          color: "#2563EB",
                          fontWeight: 700,
                          textTransform: "uppercase",
                        }}
                      >
                        Manufactured Products Used ({productUsages.length})
                      </Typography>
                    </Box>

                    {productUsages.map((pu, index) => {
                      const bp = getBuiltProduct(pu.productName);
                      const currentStock = bp?.currentStock ?? 0;
                      const amtNum = parseFloat(pu.amount);
                      const isOverStock =
                        bp && !isNaN(amtNum) && amtNum > currentStock;

                      return (
                        <Box
                          key={`prod-${index}`}
                          sx={{
                            p: 1.75,
                            bgcolor: "#FFFFFF",
                            borderRadius: "12px",
                            border: isOverStock
                              ? "1.5px solid #EF4444"
                              : "1.5px solid #BFDBFE",
                            display: "flex",
                            flexDirection: "column",
                            gap: 1,
                          }}
                        >
                          <Box
                            sx={{
                              display: "flex",
                              gap: 1.5,
                              alignItems: "flex-end",
                            }}
                          >
                            {/* Product Select */}
                            <TextField
                              select
                              size="small"
                              label="Select Built Product"
                              value={pu.productName}
                              onChange={(e) =>
                                handleProductUsageChange(
                                  index,
                                  "productName",
                                  e.target.value,
                                )
                              }
                              sx={{ flex: 1.4, ...textFieldSx }}
                            >
                              <MenuItem value="" disabled>
                                <em>Select built product</em>
                              </MenuItem>
                              {builtProductOptions.map((bProd) => (
                                <MenuItem
                                  key={bProd.productName}
                                  value={bProd.productName}
                                >
                                  <Box
                                    sx={{
                                      display: "flex",
                                      justifyContent: "space-between",
                                      width: "100%",
                                      gap: 2,
                                    }}
                                  >
                                    <Typography
                                      sx={{
                                        fontWeight: 600,
                                        color: "#1E293B",
                                        fontSize: "0.825rem",
                                      }}
                                    >
                                      {bProd.productName}
                                    </Typography>
                                    <Typography
                                      variant="caption"
                                      sx={{
                                        color:
                                          bProd.currentStock <= 0
                                            ? "#EF4444"
                                            : "#2563EB",
                                        fontWeight: 700,
                                      }}
                                    >
                                      Available: {bProd.currentStock}{" "}
                                      {bProd.unitOfMeasure}
                                    </Typography>
                                  </Box>
                                </MenuItem>
                              ))}
                            </TextField>

                            {/* Qty Used */}
                            <TextField
                              size="small"
                              label="Qty Consumed"
                              type="number"
                              value={pu.amount}
                              onChange={(e) =>
                                handleProductUsageChange(
                                  index,
                                  "amount",
                                  e.target.value,
                                )
                              }
                              error={isOverStock}
                              slotProps={{
                                input: {
                                  endAdornment: (
                                    <InputAdornment position="end">
                                      <Typography
                                        variant="caption"
                                        sx={{
                                          color: "#64748B",
                                          fontWeight: 600,
                                        }}
                                      >
                                        {bp?.unitOfMeasure || "PCS"}
                                      </Typography>
                                    </InputAdornment>
                                  ),
                                },
                              }}
                              sx={{ flex: 1, ...textFieldSx }}
                            />

                            {/* Delete Action Button */}
                            <Button
                              size="small"
                              onClick={() => handleRemoveProductUsageRow(index)}
                              sx={{
                                height: 40,
                                minHeight: 40,
                                maxHeight: 40,
                                minWidth: 40,
                                px: 1.5,
                                bgcolor: "#FEF2F2",
                                color: "#DC2626",
                                border: "1px solid rgba(239, 68, 68, 0.15)",
                                borderRadius: "10px",
                                fontWeight: 700,
                                fontSize: "0.8rem",
                                textTransform: "none",
                                flexShrink: 0,
                                "&:hover": { bgcolor: "#FEE2E2" },
                              }}
                            >
                              Remove
                            </Button>
                          </Box>

                          {/* Available product stock badge */}
                          {bp && (
                            <Box
                              sx={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                pt: 0.25,
                              }}
                            >
                              <Typography
                                variant="caption"
                                sx={{
                                  color: isOverStock ? "#DC2626" : "#2563EB",
                                  fontWeight: 600,
                                  fontSize: "0.725rem",
                                }}
                              >
                                {isOverStock ? (
                                  `Exceeds available stock (${currentStock} ${bp.unitOfMeasure})`
                                ) : (
                                  <>
                                    Available Stock:{" "}
                                    <strong style={{ color: "#0F172A" }}>
                                      {currentStock} {bp.unitOfMeasure}
                                    </strong>
                                  </>
                                )}
                              </Typography>

                              {!isNaN(amtNum) && amtNum > 0 && !isOverStock && (
                                <Typography
                                  variant="caption"
                                  sx={{
                                    color: "#059669",
                                    fontWeight: 700,
                                    fontSize: "0.725rem",
                                  }}
                                >
                                  Remaining:{" "}
                                  {(currentStock - amtNum).toFixed(0)}{" "}
                                  {bp.unitOfMeasure}
                                </Typography>
                              )}
                            </Box>
                          )}
                        </Box>
                      );
                    })}
                  </Box>
                )}
              </Box>

              {/* Over-deduction warning alert */}
              {hasOverDeductions && (
                <Alert
                  severity="warning"
                  icon={false}
                  sx={{
                    borderRadius: "12px",
                    bgcolor: "#FFFBEB",
                    color: "#92400E",
                    border: "1px solid rgba(217, 119, 6, 0.2)",
                    py: 0.5,
                  }}
                >
                  <Typography variant="caption" sx={{ fontWeight: 600 }}>
                    Some material or product quantities exceed current stock
                    balances. Please verify inventory counts.
                  </Typography>
                </Alert>
              )}
            </Box>
          </Box>
        </DialogContent>

        {/* Modal Actions Footer */}
        <DialogActions
          sx={{
            p: 3,
            px: 3.5,
            pt: 2,
            gap: 1.5,
            borderTop: "1px solid #E2E8F0",
            bgcolor: "#FFFFFF",
          }}
        >
          <Button
            onClick={() => setOpen(false)}
            color="inherit"
            sx={{
              fontWeight: 600,
              textTransform: "none",
              color: "#64748B",
              px: 2,
            }}
          >
            Cancel
          </Button>

          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={submitting}
            sx={{
              fontWeight: 700,
              textTransform: "none",
              bgcolor: "#2563EB",
              px: 3,
              py: 1,
              borderRadius: "10px",
              boxShadow: "none",
              "&:hover": {
                bgcolor: "#1D4ED8",
                boxShadow: "none",
              },
            }}
          >
            {submitting ? (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <CircularProgress size={16} color="inherit" />
                <span>Recording...</span>
              </Box>
            ) : (
              "Record Production"
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success Notification */}
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
          sx={{ borderRadius: "10px" }}
        >
          {successMsg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
