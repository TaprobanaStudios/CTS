"use client";

import * as React from "react";
import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import {
  Box,
  Typography,
  TextField,
  Alert,
  Button,
  MenuItem,
  IconButton,
  CircularProgress,
  InputAdornment,
  Autocomplete,
  ButtonBase,
  Paper,
  Snackbar,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import { z } from "zod";
import {
  InventoryItem,
  ProductStock,
  SELECTABLE_STATUSES,
  SelectableProductionStatus,
  STATUS_CONFIG,
  StockBatch,
  CURRENCY,
  formatMoney,
  formatQty,
} from "./types";
import { formatDate, todayInSriLanka } from "@/utils/datetime";

interface MaterialRow {
  itemId: string;
  // "" lets the backend take from the oldest stock first
  batchId: string;
  amount: string;
  // Only used for stocks that were loaded without a buying cost
  unitCost: string;
}

interface ProductUsageRow {
  productName: string;
  amount: string;
}

const productionSchema = z
  .object({
    reportDate: z.string().min(1, "Report date is required"),
    productType: z.string().min(1, "Product is required"),
    status: z.enum(SELECTABLE_STATUSES),
    qtyProduced: z.number().int("Must be a whole number").min(1, "Must produce at least 1 unit"),
    damages: z.number().int("Must be a whole number").min(0, "Damages cannot be negative"),
  })
  .refine((data) => data.damages <= data.qtyProduced, {
    message: "Damages cannot exceed quantity produced",
    path: ["damages"],
  });

type FormErrors = Partial<
  Record<"reportDate" | "productType" | "status" | "qtyProduced" | "damages" | "inputs", string>
>;

const groupByItem = (batches: StockBatch[]) => {
  const map = new Map<string, StockBatch[]>();
  batches.forEach((batch) => {
    map.set(batch.itemId, [...(map.get(batch.itemId) ?? []), batch]);
  });
  return map;
};

// Oldest stock with quantity left: the one that should normally be used up first
const defaultBatchId = (itemId: string, byItem: Map<string, StockBatch[]>) =>
  byItem.get(itemId)?.[0]?.batchId ?? "";

const cardSx = {
  p: { xs: 2, md: 3 },
  bgcolor: "#FFFFFF",
  border: "1px solid #E2E8F0",
  borderRadius: "16px",
  boxShadow: "none",
};

const fieldSx = {
  width: "100%",
  "& .MuiOutlinedInput-root": {
    borderRadius: "12px",
    bgcolor: "#FFFFFF",
    // Inputs, date pickers, selects and search boxes each have their own natural height;
    // fixing it keeps a row of them level. Multi-line boxes keep growing with their text.
    height: 44,
    "&.MuiInputBase-sizeSmall": { height: 40 },
    "&.MuiInputBase-multiline": { height: "auto" },
    "&.MuiAutocomplete-inputRoot": { py: 0 },
    "& fieldset": { borderColor: "#E2E8F0" },
    "&:hover fieldset": { borderColor: "#CBD5E1" },
    "&.Mui-focused fieldset": { borderColor: "#2563EB", borderWidth: "2px" },
  },
  "& .MuiFormHelperText-root": { mx: 0.25 },
};

const adornmentSx = {
  "& .MuiTypography-root": { fontSize: "0.75rem", fontWeight: 700, color: "#64748B" },
};

const sectionTitleSx = { fontSize: "1rem", fontWeight: 800, color: "#0F172A", lineHeight: 1.3 };
const sectionHintSx = { fontSize: "0.8rem", color: "#64748B", mt: 0.25 };

const columnLabelSx = {
  fontSize: "0.68rem",
  fontWeight: 700,
  color: "#94A3B8",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
};

const addButtonSx = {
  fontSize: "0.8rem",
  fontWeight: 700,
  color: "#2563EB",
  border: "1px solid #BFDBFE",
  bgcolor: "#FFFFFF",
  borderRadius: "10px",
  py: 0.6,
  px: 1.5,
  flexShrink: 0,
  "&:hover": { bgcolor: "#EFF6FF" },
};

const removeButtonSx = {
  gridArea: "remove",
  // Same height as the fields beside it
  width: 40,
  height: 40,
  borderRadius: "10px",
  color: "#DC2626",
  bgcolor: "#FEF2F2",
  border: "1px solid rgba(239, 68, 68, 0.15)",
  "&:hover": { bgcolor: "#FEE2E2" },
};

// One line on wide screens; stacked on tablets and phones
const materialGridSx = {
  display: "grid",
  columnGap: 1.25,
  rowGap: 1,
  alignItems: "center",
  gridTemplateColumns: {
    xs: "minmax(0, 1fr) minmax(0, 1fr) 40px",
    lg: "minmax(0, 1fr) minmax(0, 1.25fr) minmax(0, 1.1fr) 130px 150px 120px 40px",
  },
  gridTemplateAreas: {
    xs: `"material material remove" "stock stock stock" "info info info" "qty cost cost" "line line line"`,
    lg: `"material stock info qty cost line remove"`,
  },
};

const productGridSx = {
  display: "grid",
  columnGap: 1.25,
  rowGap: 1,
  alignItems: "center",
  gridTemplateColumns: {
    xs: "minmax(0, 1fr) 40px",
    md: "minmax(0, 1.4fr) minmax(0, 1fr) 150px 40px",
  },
  gridTemplateAreas: {
    xs: `"product remove" "info info" "qty qty"`,
    md: `"product info qty remove"`,
  },
};

export default function ProductionFormView() {
  // Reference data
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [batches, setBatches] = useState<StockBatch[]>([]);
  // Manufactured products with their stock (already net of what was used or sold)
  const [builtProductOptions, setBuiltProductOptions] = useState<ProductStock[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [reportDate, setReportDate] = useState(todayInSriLanka);
  // The production bin card links here with ?product=<name> to start with that product
  const searchParams = useSearchParams();
  const [productType, setProductType] = useState(() => searchParams.get("product") ?? "");
  const [status, setStatus] = useState<SelectableProductionStatus>("STORED");
  const [qtyProduced, setQtyProduced] = useState("");
  const [damages, setDamages] = useState("0");
  const [materials, setMaterials] = useState<MaterialRow[]>([]);
  const [productUsages, setProductUsages] = useState<ProductUsageRow[]>([]);

  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // Set by the first save attempt: from then on, incomplete material rows are marked
  const [showRowErrors, setShowRowErrors] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  // Bumped after a save so stocks and product balances are read again
  const [reloadToken, setReloadToken] = useState(0);

  const batchesByItem = useMemo(() => groupByItem(batches), [batches]);

  useEffect(() => {
    const controller = new AbortController();
    const getJson = (url: string) =>
      fetch(url, { signal: controller.signal }).then((res) => {
        if (!res.ok) throw new Error("Failed to load stock data");
        return res.json();
      });

    Promise.all([
      getJson("/api/inventory/current"),
      getJson("/api/inventory/batches"),
      getJson("/api/sales/products"),
    ])
      .then(([inventory, openBatches, productStocks]) => {
        const items: InventoryItem[] = Array.isArray(inventory) ? inventory : inventory.content || [];
        setInventoryItems(items);
        setBatches(openBatches);
        setBuiltProductOptions(productStocks);
        setLoadingData(false);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setSubmitError(err instanceof Error ? err.message : "Failed to load stock data");
        setLoadingData(false);
      });

    return () => controller.abort();
  }, [reloadToken]);

  // Back to an empty form; stock data is read again so balances are current
  const resetForm = () => {
    setReportDate(todayInSriLanka());
    setProductType("");
    setStatus("STORED");
    setQtyProduced("");
    setDamages("0");
    setMaterials([]);
    setProductUsages([]);
    setFormErrors({});
    setShowRowErrors(false);
    setSubmitError("");
    setLoadingData(true);
    setReloadToken((token) => token + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const getInventoryItem = (id: string) => inventoryItems.find((item) => item.itemId === id);
  const getBuiltProduct = (name: string) =>
    builtProductOptions.find((p) => p.productName.toLowerCase() === name.toLowerCase());

  // A field's message goes away as soon as the field is edited
  const clearError = (field: keyof FormErrors) =>
    setFormErrors((errors) => (errors[field] ? { ...errors, [field]: undefined } : errors));

  const updateMaterial = (index: number, patch: Partial<MaterialRow>) => {
    setMaterials((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
    clearError("inputs");
  };

  const updateProductUsage = (index: number, patch: Partial<ProductUsageRow>) =>
    setProductUsages((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  // Quantity requested per stock / per material across all rows, so two rows cannot
  // together take more than what is there
  const { usedByBatch, usedByItem } = useMemo(() => {
    const byBatch = new Map<string, number>();
    const byItem = new Map<string, number>();
    materials.forEach((row) => {
      const amount = parseFloat(row.amount);
      if (!row.itemId || isNaN(amount) || amount <= 0) return;
      byItem.set(row.itemId, (byItem.get(row.itemId) ?? 0) + amount);
      if (row.batchId) byBatch.set(row.batchId, (byBatch.get(row.batchId) ?? 0) + amount);
    });
    return { usedByBatch: byBatch, usedByItem: byItem };
  }, [materials]);

  const materialRows = materials.map((row) => {
    const item = getInventoryItem(row.itemId);
    const itemBatches = batchesByItem.get(row.itemId) ?? [];
    const batch = itemBatches.find((b) => b.batchId === row.batchId);
    const amount = parseFloat(row.amount);
    const hasAmount = !isNaN(amount) && amount > 0;
    const totalStock = item?.currentStock ?? 0;
    const enteredCost = row.unitCost.trim() !== "" && Number(row.unitCost) >= 0 ? Number(row.unitCost) : null;

    // A chosen stock is a hard limit; without one the whole material stock is the limit
    const overBatch = Boolean(batch) && hasAmount && (usedByBatch.get(row.batchId) ?? 0) > batch!.remainingQty;
    const overStock = !batch && Boolean(item) && hasAmount && (usedByItem.get(row.itemId) ?? 0) > totalStock;

    // The price can be typed in only where a stock that would be used has none recorded
    const needsCost = batch
      ? batch.unitCost == null
      : itemBatches.length === 0 || itemBatches.some((b) => b.unitCost == null);
    const knownCost = batch?.unitCost ?? null;

    // What is still missing on the row; quantity used and unit cost are mandatory
    const missingItem = !item;
    const missingAmount = Boolean(item) && !hasAmount;
    const missingCost = Boolean(item) && needsCost && enteredCost == null;

    // Line cost follows what the backend will do: chosen stock, or oldest stocks first
    let lineCost: number | null = null;
    if (hasAmount) {
      if (batch) {
        const cost = batch.unitCost ?? enteredCost;
        lineCost = cost != null ? amount * cost : null;
      } else {
        let left = amount;
        let total: number | null = 0;
        for (const b of itemBatches) {
          if (left <= 0) break;
          const taken = Math.min(left, b.remainingQty);
          const cost = b.unitCost ?? enteredCost;
          total = total != null && cost != null ? total + taken * cost : null;
          left -= taken;
        }
        if (left > 0) total = total != null && enteredCost != null ? total + left * enteredCost : null;
        lineCost = total;
      }
    }

    return {
      row, item, itemBatches, batch, amount, hasAmount, totalStock,
      overBatch, overStock, needsCost, knownCost, lineCost,
      missingItem, missingAmount, missingCost,
    };
  });

  const productRows = productUsages.map((row) => {
    const product = getBuiltProduct(row.productName);
    const amount = parseFloat(row.amount);
    const overStock = Boolean(product) && !isNaN(amount) && amount > (product?.currentStock ?? 0);
    return { row, product, amount, overStock };
  });

  // Asking for more than there is always blocks the save: stock may never go negative
  const hasBlockingOverUse = materialRows.some((r) => r.overBatch || r.overStock);
  const hasStockWarnings = materialRows.some((r) => r.overStock) || productRows.some((r) => r.overStock);
  // "Only 12 BAGS of Cement", one per material or product that is short
  const overStockDetails = [
    ...materialRows
      .filter((r) => r.overStock && r.item)
      .map((r) => `only ${formatQty(Math.max(0, r.totalStock))} ${r.item!.unitOfMeasure} of ${r.item!.itemName}`),
    ...productRows
      .filter((r) => r.overStock && r.product)
      .map((r) => `only ${formatQty(r.product!.currentStock)} PCS of ${r.product!.productName}`),
  ].filter((detail, index, all) => all.indexOf(detail) === index);

  const parsedQty = parseInt(qtyProduced, 10) || 0;
  const parsedDamages = parseInt(damages, 10) || 0;
  const netYield = Math.max(0, parsedQty - parsedDamages);

  const usedRows = materialRows.filter((r) => r.item && r.hasAmount);
  const costedRows = usedRows.filter((r) => r.lineCost != null);
  const totalMaterialCost = costedRows.reduce((sum, r) => sum + (r.lineCost ?? 0), 0);
  const uncostedCount = usedRows.length - costedRows.length;

  // What still has to be filled in before the entry can be recorded, in form order
  const qtyNumber = Number(qtyProduced);
  const damagesNumber = Number(damages);
  const missing: string[] = [];
  if (!reportDate) missing.push("report date");
  if (!productType.trim()) missing.push("product");
  if (qtyProduced.trim() === "" || !Number.isInteger(qtyNumber) || qtyNumber < 1) missing.push("quantity produced");
  if (damages.trim() === "" || !Number.isInteger(damagesNumber) || damagesNumber < 0 || damagesNumber > qtyNumber) {
    missing.push("damages");
  }
  if (materialRows.length === 0) missing.push("at least one material");
  else if (materialRows.some((r) => r.missingItem)) missing.push("the material on every row");
  if (materialRows.some((r) => r.missingAmount)) missing.push("quantity used for every material");
  if (materialRows.some((r) => r.missingCost)) missing.push("unit cost for every material");
  const formComplete = missing.length === 0;

  const handleSubmit = async () => {
    setFormErrors({});
    setSubmitError("");

    setShowRowErrors(true);
    const incompleteRows = materialRows.filter((r) => r.missingItem || r.missingAmount || r.missingCost).length;

    const validMaterials = materials
      .filter((m) => m.itemId !== "" && m.amount !== "" && Number(m.amount) > 0)
      .map((m) => ({
        itemId: m.itemId,
        amount: Number(m.amount),
        batchId: m.batchId || undefined,
        unitCost: m.unitCost.trim() !== "" && Number(m.unitCost) >= 0 ? Number(m.unitCost) : undefined,
      }));

    const validProductUsages = productUsages
      .filter((pu) => pu.productName !== "" && pu.amount !== "" && Number(pu.amount) > 0)
      .map((pu) => ({ productName: pu.productName.trim(), amount: Number(pu.amount) }));

    const parsed = productionSchema.safeParse({
      reportDate,
      productType: productType.trim(),
      status,
      qtyProduced: qtyProduced === "" ? 0 : Number(qtyProduced),
      damages: damages === "" ? 0 : Number(damages),
    });

    const errors: FormErrors = {};
    if (!parsed.success) {
      parsed.error.issues.forEach((issue) => {
        const field = issue.path[0] as keyof FormErrors;
        if (!errors[field]) errors[field] = issue.message;
      });
    }
    if (incompleteRows > 0) {
      errors.inputs =
        "Every material needs its quantity used and a unit cost. Fill in the fields marked in red, or remove the row.";
    } else if (validMaterials.length === 0) {
      errors.inputs = "Add at least one material used in this production";
    }
    if (!parsed.success || errors.inputs) {
      setFormErrors(errors);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/production/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportDate: parsed.data.reportDate,
          productionItems: [
            {
              productType: parsed.data.productType,
              status: parsed.data.status,
              qtyProduced: parsed.data.qtyProduced,
              damages: parsed.data.damages,
              materials: validMaterials,
              productUsages: validProductUsages,
            },
          ],
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || "Failed to record production item");
      }

      setSuccessMsg(`${parsed.data.productType} recorded: ${parsed.data.qtyProduced} produced`);
      resetForm();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to record production item");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ width: "100%", display: "flex", flexDirection: "column", gap: 2.5 }}>
      {/* Page Header */}
      <Box>
        <Typography
          variant="h4"
          sx={{
            fontWeight: 800,
            color: "#0F172A",
            letterSpacing: "-0.02em",
            lineHeight: 1.2,
            fontSize: { xs: "1.5rem", sm: "2.125rem" },
          }}
        >
          Add Production Item
        </Typography>
        <Typography variant="body2" sx={{ color: "#64748B", mt: 0.5, fontWeight: 500 }}>
          Record what was produced, then the materials and stocks it used.
        </Typography>
      </Box>

      {/* ---------------- 1. Production output ---------------- */}
      <Paper elevation={0} sx={{ ...cardSx, display: "flex", flexDirection: "column", gap: 2.5 }}>
        <Box>
          <Typography sx={sectionTitleSx}>1. Production output</Typography>
          <Typography sx={sectionHintSx}>What was made, how many, and where it went.</Typography>
        </Box>

        <Box
          sx={{
            display: "grid",
            gap: 2,
            alignItems: "start",
            gridTemplateColumns: {
              xs: "1fr 1fr",
              md: "200px minmax(0, 1fr) 170px 170px",
            },
            gridTemplateAreas: {
              xs: `"date date" "product product" "qty damages"`,
              md: `"date product qty damages"`,
            },
          }}
        >
          <TextField
            label="Report Date"
            type="date"
            fullWidth
            value={reportDate}
            onChange={(e) => {
              setReportDate(e.target.value);
              clearError("reportDate");
            }}
            error={!!formErrors.reportDate}
            helperText={formErrors.reportDate}
            sx={{ ...fieldSx, gridArea: "date" }}
          />

          {/* Pick an existing product or type a new one */}
          <Autocomplete
            freeSolo
            options={builtProductOptions.map((p) => p.productName)}
            inputValue={productType}
            onInputChange={(_, value) => {
              setProductType(value);
              clearError("productType");
            }}
            sx={{ gridArea: "product" }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Product"
                placeholder="Select or type a product name"
                error={!!formErrors.productType}
                helperText={formErrors.productType}
                sx={fieldSx}
              />
            )}
          />

          <TextField
            label="Qty Produced"
            type="number"
            fullWidth
            placeholder="0"
            value={qtyProduced}
            onChange={(e) => {
              setQtyProduced(e.target.value);
              clearError("qtyProduced");
              clearError("damages");
            }}
            error={!!formErrors.qtyProduced}
            helperText={formErrors.qtyProduced}
            slotProps={{
              htmlInput: { min: 0, step: 1, inputMode: "numeric" },
              input: {
                endAdornment: (
                  <InputAdornment position="end" sx={adornmentSx}>
                    PCS
                  </InputAdornment>
                ),
              },
            }}
            sx={{ ...fieldSx, gridArea: "qty" }}
          />

          <TextField
            label="Damages"
            type="number"
            fullWidth
            value={damages}
            onChange={(e) => {
              setDamages(e.target.value);
              clearError("damages");
            }}
            error={!!formErrors.damages}
            helperText={formErrors.damages}
            slotProps={{
              htmlInput: { min: 0, step: 1, inputMode: "numeric" },
              input: {
                endAdornment: (
                  <InputAdornment position="end" sx={adornmentSx}>
                    PCS
                  </InputAdornment>
                ),
              },
            }}
            sx={{ ...fieldSx, gridArea: "damages" }}
          />
        </Box>

        <Box
          sx={{
            display: "grid",
            gap: 2,
            alignItems: "stretch",
            gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1fr) 356px" },
          }}
        >
          <Box sx={{ display: "flex", flexDirection: "column" }}>
            <Typography sx={{ fontWeight: 600, color: "#475569", fontSize: "0.875rem", mb: "6px" }}>
              Production Status
            </Typography>
            <Box
              role="radiogroup"
              aria-label="Production Status"
              sx={{
                flexGrow: 1,
                display: "grid",
                gridTemplateColumns: `repeat(${SELECTABLE_STATUSES.length}, minmax(0, 1fr))`,
                gap: 1.5,
              }}
            >
              {SELECTABLE_STATUSES.map((key) => {
                const cfg = STATUS_CONFIG[key];
                const selected = status === key;
                return (
                  <ButtonBase
                    key={key}
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setStatus(key)}
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-start",
                      textAlign: "left",
                      gap: 0.25,
                      p: 1.75,
                      borderRadius: "12px",
                      border: "1.5px solid",
                      borderColor: selected ? cfg.color : "#E2E8F0",
                      bgcolor: selected ? cfg.bg : "#FFFFFF",
                      transition: "border-color 0.15s ease, background-color 0.15s ease",
                      "&:hover": { borderColor: cfg.color },
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        width: "100%",
                      }}
                    >
                      <Typography
                        sx={{ fontWeight: 700, fontSize: "0.95rem", color: selected ? cfg.color : "#0F172A" }}
                      >
                        {cfg.label}
                      </Typography>
                      <CheckCircleRoundedIcon sx={{ fontSize: 18, color: selected ? cfg.color : "#E2E8F0" }} />
                    </Box>
                    <Typography sx={{ fontSize: "0.78rem", color: "#64748B", lineHeight: 1.3 }}>
                      {cfg.desc}
                    </Typography>
                  </ButtonBase>
                );
              })}
            </Box>
          </Box>

          {/* Usable output: built like the status column, so the two boxes line up top and bottom */}
          <Box sx={{ display: "flex", flexDirection: "column" }}>
            <Typography sx={{ fontWeight: 600, color: "#475569", fontSize: "0.875rem", mb: "6px" }}>
              Usable Output
            </Typography>
          <Box
            sx={{
              flexGrow: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 1.5,
              px: 2,
              py: 1.5,
              bgcolor: "#F8FAFC",
              borderRadius: "12px",
              border: "1px solid #E2E8F0",
            }}
          >
            <Box>
              <Typography
                sx={{
                  fontSize: "1.5rem",
                  fontWeight: 800,
                  lineHeight: 1.3,
                  color: netYield > 0 ? "#059669" : "#64748B",
                }}
              >
                {netYield.toLocaleString("en-US")}{" "}
                <Box component="span" sx={{ fontSize: "0.75rem", color: "#64748B", fontWeight: 700 }}>
                  PCS
                </Box>
              </Typography>
            </Box>
            <Typography sx={{ fontSize: "0.8rem", color: "#64748B", textAlign: "right" }}>
              {parsedQty.toLocaleString("en-US")} produced
              <br />
              {parsedDamages > 0 ? (
                <Box component="span" sx={{ color: "#DC2626", fontWeight: 700 }}>
                  − {parsedDamages.toLocaleString("en-US")} damaged
                </Box>
              ) : (
                "no damages"
              )}
            </Typography>
          </Box>
          </Box>
        </Box>
      </Paper>

      {/* ---------------- 2. Materials used ---------------- */}
      <Paper elevation={0} sx={{ ...cardSx, display: "flex", flexDirection: "column", gap: 2 }}>
        <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 1.5 }}>
          <Box>
            <Typography sx={sectionTitleSx}>2. Materials used</Typography>
            <Typography sx={sectionHintSx}>
              Pick each material and the stock it came from. Quantity used and unit cost are required; if the
              stock was loaded without a price, enter it here.
            </Typography>
          </Box>
          <Button
            size="small"
            startIcon={<AddIcon sx={{ fontSize: 16 }} />}
            onClick={() =>
              setMaterials((rows) => [{ itemId: "", batchId: "", amount: "", unitCost: "" }, ...rows])
            }
            sx={addButtonSx}
          >
            Add Material
          </Button>
        </Box>

        {formErrors.inputs && (
          <Alert severity="error" icon={false} sx={{ py: 0.25, borderRadius: "10px" }}>
            {formErrors.inputs}
          </Alert>
        )}

        {loadingData ? (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 5, justifyContent: "center" }}>
            <CircularProgress size={22} />
            <Typography sx={{ color: "#64748B", fontSize: "0.85rem" }}>
              Loading materials and stocks...
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
            {materialRows.length === 0 ? (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.25,
                  p: 2.5,
                  borderRadius: "12px",
                  border: "1.5px dashed #CBD5E1",
                  color: "#64748B",
                }}
              >
                <Inventory2OutlinedIcon sx={{ fontSize: 20 }} />
                <Typography sx={{ fontSize: "0.85rem" }}>
                  No materials added yet. Use “Add Material” to pick one and the stock it came from.
                </Typography>
              </Box>
            ) : (
              // Column headings, shown only when a row fits on one line
              <Box sx={{ ...materialGridSx, display: { xs: "none", lg: "grid" }, px: 1.75 }}>
                <Typography sx={{ ...columnLabelSx, gridArea: "material" }}>Material</Typography>
                <Typography sx={{ ...columnLabelSx, gridArea: "stock" }}>Stock</Typography>
                <Typography sx={{ ...columnLabelSx, gridArea: "info" }}>Available</Typography>
                <Typography sx={{ ...columnLabelSx, gridArea: "qty" }}>Qty used</Typography>
                <Typography sx={{ ...columnLabelSx, gridArea: "cost" }}>Unit cost</Typography>
                <Typography sx={{ ...columnLabelSx, gridArea: "line", textAlign: "right" }}>Line cost</Typography>
              </Box>
            )}

            {materialRows.map(
              (
                {
                  row, item, itemBatches, batch, hasAmount, totalStock, overBatch, overStock, needsCost, knownCost,
                  lineCost, missingItem, missingAmount, missingCost,
                },
                index,
              ) => {
                const unit = item?.unitOfMeasure ?? "";
                const hasError = overBatch || overStock;
                return (
                  <Box
                    key={`mat-${index}`}
                    sx={{
                      ...materialGridSx,
                      p: 1.75,
                      bgcolor: "#F8FAFC",
                      borderRadius: "12px",
                      border: "1px solid",
                      borderColor: hasError ? "#FCA5A5" : "#E2E8F0",
                    }}
                  >
                    {/* Type to search: the material list can be long */}
                    <Autocomplete
                      size="small"
                      options={inventoryItems}
                      value={item ?? null}
                      onChange={(_, selected) => {
                        const itemId = selected?.itemId ?? "";
                        updateMaterial(index, {
                          itemId,
                          batchId: defaultBatchId(itemId, batchesByItem),
                          unitCost: "",
                        });
                      }}
                      getOptionLabel={(option) => option.itemName}
                      isOptionEqualToValue={(option, value) => option.itemId === value.itemId}
                      autoHighlight
                      openOnFocus
                      noOptionsText="No material found"
                      // The field is narrow; let the list be wide enough for name and stock on one line
                      slotProps={{ popper: { placement: "bottom-start", sx: { minWidth: 320 } } }}
                      sx={{ gridArea: "material", minWidth: 0 }}
                      renderOption={(props, option) => {
                        const { key, ...optionProps } = props;
                        return (
                          <Box
                            component="li"
                            key={key}
                            {...optionProps}
                            sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 2 }}
                          >
                            <Typography sx={{ fontWeight: 600, color: "#1E293B", fontSize: "0.9rem" }}>
                              {option.itemName}
                            </Typography>
                            <Typography
                              sx={{
                                fontSize: "0.75rem",
                                fontWeight: 600,
                                flexShrink: 0,
                                color: (option.currentStock ?? 0) <= 0 ? "#EF4444" : "#64748B",
                              }}
                            >
                              {formatQty(option.currentStock ?? 0)} {option.unitOfMeasure}
                            </Typography>
                          </Box>
                        );
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          placeholder="Search material"
                          error={showRowErrors && missingItem}
                          slotProps={{
                            ...params.slotProps,
                            htmlInput: { ...params.slotProps.htmlInput, "aria-label": "Material" },
                          }}
                          sx={fieldSx}
                        />
                      )}
                    />

                    {/* Which loaded stock the material is taken from */}
                    <TextField
                      select
                      size="small"
                      disabled={!item || itemBatches.length === 0}
                      value={row.batchId}
                      onChange={(e) => updateMaterial(index, { batchId: e.target.value, unitCost: "" })}
                      slotProps={{
                        select: {
                          displayEmpty: true,
                          renderValue: (value) => {
                            if (!item) return <Box component="span" sx={{ color: "#94A3B8" }}>Select stock</Box>;
                            if (itemBatches.length === 0) return "No stock loaded";
                            const selected = itemBatches.find((b) => b.batchId === value);
                            return selected ? selected.batchCode : "Auto · oldest first";
                          },
                        },
                        htmlInput: { "aria-label": "Stock" },
                      }}
                      sx={{ ...fieldSx, gridArea: "stock" }}
                    >
                      <MenuItem value="">
                        <Box>
                          <Typography sx={{ fontWeight: 600, fontSize: "0.9rem", color: "#1E293B" }}>
                            Auto · oldest first
                          </Typography>
                          <Typography sx={{ fontSize: "0.75rem", color: "#64748B" }}>
                            Take from the oldest stocks until the quantity is covered
                          </Typography>
                        </Box>
                      </MenuItem>
                      {itemBatches.map((b) => (
                        <MenuItem key={b.batchId} value={b.batchId}>
                          <Box
                            sx={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              width: "100%",
                              gap: 3,
                            }}
                          >
                            <Box>
                              <Typography sx={{ fontWeight: 700, fontSize: "0.9rem", color: "#1E293B" }}>
                                {b.batchCode}
                              </Typography>
                              <Typography sx={{ fontSize: "0.75rem", color: "#64748B" }}>
                                Loaded {formatDate(b.receivedDate)} · {formatQty(b.remainingQty)} of{" "}
                                {formatQty(b.qtyReceived)} {b.unitOfMeasure} left
                              </Typography>
                            </Box>
                            <Typography
                              sx={{
                                fontSize: "0.82rem",
                                fontWeight: 700,
                                flexShrink: 0,
                                color: b.unitCost != null ? "#0F172A" : "#B45309",
                              }}
                            >
                              {b.unitCost != null ? formatMoney(b.unitCost) : "No cost yet"}
                            </Typography>
                          </Box>
                        </MenuItem>
                      ))}
                    </TextField>

                    {/* What the selected stock holds */}
                    <Box sx={{ gridArea: "info", minWidth: 0 }}>
                      {!item ? (
                        <Typography sx={{ fontSize: "0.8rem", color: "#94A3B8" }}>-</Typography>
                      ) : (
                        <>
                          <Typography
                            sx={{
                              fontSize: "0.85rem",
                              fontWeight: 700,
                              color: hasError ? "#DC2626" : "#0F172A",
                              lineHeight: 1.3,
                            }}
                          >
                            {batch
                              ? `${formatQty(batch.remainingQty)} of ${formatQty(batch.qtyReceived)} ${unit}`
                              : `${formatQty(totalStock)} ${unit}`}
                          </Typography>
                          <Typography
                            sx={{
                              fontSize: "0.74rem",
                              lineHeight: 1.3,
                              color: hasError ? "#DC2626" : "#64748B",
                              fontWeight: hasError ? 700 : 400,
                            }}
                          >
                            {overBatch
                              ? "Not enough in this stock. Add another row for the rest."
                              : overStock
                                ? "More than is available in inventory"
                                : batch
                                  ? `Loaded ${formatDate(batch.receivedDate)}`
                                  : itemBatches.length === 0
                                    ? "No stock loaded for this material"
                                    : `across ${itemBatches.length} stock${itemBatches.length === 1 ? "" : "s"}`}
                          </Typography>
                        </>
                      )}
                    </Box>

                    <TextField
                      size="small"
                      type="number"
                      placeholder="Qty *"
                      value={row.amount}
                      onChange={(e) => updateMaterial(index, { amount: e.target.value })}
                      error={hasError || (showRowErrors && missingAmount)}
                      slotProps={{
                        htmlInput: { min: 0, step: "any", inputMode: "decimal", "aria-label": "Quantity used" },
                        input: {
                          endAdornment: unit ? (
                            <InputAdornment position="end" sx={adornmentSx}>
                              {unit}
                            </InputAdornment>
                          ) : undefined,
                        },
                      }}
                      sx={{ ...fieldSx, gridArea: "qty" }}
                    />

                    {/* Price of the stock; editable only where none was recorded when it was loaded */}
                    {item && !needsCost ? (
                      <Box sx={{ gridArea: "cost", minWidth: 0 }}>
                        <Typography sx={{ fontSize: "0.88rem", fontWeight: 700, color: "#0F172A", lineHeight: 1.3 }}>
                          {knownCost != null ? formatMoney(knownCost) : "From stocks"}
                        </Typography>
                        <Typography sx={{ fontSize: "0.74rem", color: "#64748B", lineHeight: 1.3 }}>
                          {knownCost != null ? `per ${unit}` : "each stock's own price"}
                        </Typography>
                      </Box>
                    ) : (
                      <TextField
                        size="small"
                        type="number"
                        placeholder="Unit cost *"
                        disabled={!item}
                        value={row.unitCost}
                        onChange={(e) => updateMaterial(index, { unitCost: e.target.value })}
                        error={showRowErrors && missingCost}
                        slotProps={{
                          htmlInput: { min: 0, step: "0.01", inputMode: "decimal", "aria-label": "Unit cost" },
                          input: {
                            startAdornment: (
                              <InputAdornment position="start" sx={adornmentSx}>
                                {CURRENCY}
                              </InputAdornment>
                            ),
                          },
                        }}
                        sx={{ ...fieldSx, gridArea: "cost" }}
                      />
                    )}

                    <Box
                      sx={{
                        gridArea: "line",
                        display: "flex",
                        justifyContent: { xs: "space-between", lg: "flex-end" },
                        alignItems: "baseline",
                        gap: 1,
                        minWidth: 0,
                      }}
                    >
                      <Typography sx={{ ...columnLabelSx, display: { lg: "none" } }}>Line cost</Typography>
                      <Typography
                        sx={{
                          fontSize: "0.9rem",
                          fontWeight: 800,
                          whiteSpace: "nowrap",
                          fontVariantNumeric: "tabular-nums",
                          color: lineCost != null ? "#0F172A" : "#94A3B8",
                        }}
                      >
                        {lineCost != null ? formatMoney(lineCost) : hasAmount ? "No cost" : "-"}
                      </Typography>
                    </Box>

                    <IconButton
                      aria-label="Remove material"
                      onClick={() => setMaterials((rows) => rows.filter((_, i) => i !== index))}
                      sx={removeButtonSx}
                    >
                      <DeleteOutlineRoundedIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Box>
                );
              },
            )}
          </Box>
        )}

        {hasStockWarnings && (
          <Alert severity="warning" sx={{ borderRadius: "12px" }}>
            <Typography sx={{ fontWeight: 700, fontSize: "0.85rem" }}>
              Some quantities are more than what is available in inventory.
            </Typography>
            <Typography sx={{ fontSize: "0.82rem" }}>
              {overStockDetails.join("; ")}. Using more than is available would make the stock negative and
              affect balances, costs and reports across the whole system, so this cannot be saved. Load the
              stock first or reduce the quantity.
            </Typography>
          </Alert>
        )}
      </Paper>

      {/* ---------------- 3. Products used ---------------- */}
      <Paper elevation={0} sx={{ ...cardSx, display: "flex", flexDirection: "column", gap: 2 }}>
        <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 1.5 }}>
          <Box>
            <Typography sx={sectionTitleSx}>3. Products used (optional)</Typography>
            <Typography sx={sectionHintSx}>
              Manufactured products that went into this one, such as blocks that were re-processed.
            </Typography>
          </Box>
          <Button
            size="small"
            startIcon={<AddIcon sx={{ fontSize: 16 }} />}
            onClick={() => setProductUsages((rows) => [...rows, { productName: "", amount: "" }])}
            sx={addButtonSx}
          >
            Add Product
          </Button>
        </Box>

        {productRows.map(({ row, product, amount, overStock }, index) => (
          <Box
            key={`prod-${index}`}
            sx={{
              ...productGridSx,
              p: 1.75,
              bgcolor: "#F8FAFC",
              borderRadius: "12px",
              border: "1px solid",
              borderColor: overStock ? "#FCA5A5" : "#E2E8F0",
            }}
          >
            <TextField
              select
              size="small"
              value={row.productName}
              onChange={(e) => updateProductUsage(index, { productName: e.target.value })}
              slotProps={{
                select: {
                  displayEmpty: true,
                  renderValue: (value) =>
                    value ? (
                      (value as string)
                    ) : (
                      <Box component="span" sx={{ color: "#94A3B8" }}>
                        Select product
                      </Box>
                    ),
                },
                htmlInput: { "aria-label": "Product used" },
              }}
              sx={{ ...fieldSx, gridArea: "product" }}
            >
              {builtProductOptions.length === 0 && (
                <MenuItem value="" disabled>
                  No manufactured products yet
                </MenuItem>
              )}
              {builtProductOptions.map((option) => (
                <MenuItem key={option.productName} value={option.productName}>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "baseline",
                      width: "100%",
                      gap: 2,
                    }}
                  >
                    <Typography sx={{ fontWeight: 600, color: "#1E293B", fontSize: "0.9rem" }}>
                      {option.productName}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        flexShrink: 0,
                        color: option.currentStock <= 0 ? "#EF4444" : "#64748B",
                      }}
                    >
                      {formatQty(option.currentStock)} PCS
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
            </TextField>

            <Box sx={{ gridArea: "info", minWidth: 0 }}>
              {product ? (
                <Typography
                  sx={{
                    fontSize: "0.82rem",
                    color: overStock ? "#DC2626" : "#64748B",
                    fontWeight: overStock ? 700 : 500,
                  }}
                >
                  {overStock
                    ? `More than the ${formatQty(product.currentStock)} PCS in stock`
                    : `${formatQty(product.currentStock)} PCS available${
                        !isNaN(amount) && amount > 0
                          ? ` · ${formatQty(product.currentStock - amount)} left after this`
                          : ""
                      }`}
                </Typography>
              ) : (
                <Typography sx={{ fontSize: "0.8rem", color: "#94A3B8" }}>-</Typography>
              )}
            </Box>

            <TextField
              size="small"
              type="number"
              placeholder="Qty"
              value={row.amount}
              onChange={(e) => updateProductUsage(index, { amount: e.target.value })}
              error={overStock}
              slotProps={{
                htmlInput: { min: 0, step: 1, inputMode: "numeric", "aria-label": "Quantity used" },
                input: {
                  endAdornment: (
                    <InputAdornment position="end" sx={adornmentSx}>
                      PCS
                    </InputAdornment>
                  ),
                },
              }}
              sx={{ ...fieldSx, gridArea: "qty" }}
            />

            <IconButton
              aria-label="Remove product"
              onClick={() => setProductUsages((rows) => rows.filter((_, i) => i !== index))}
              sx={removeButtonSx}
            >
              <DeleteOutlineRoundedIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Box>
        ))}
      </Paper>

      {/* ---------------- Totals and actions: the last section of the page ---------------- */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, md: 3 },
          bgcolor: "#FFFFFF",
          border: "1px solid #E2E8F0",
          borderRadius: "16px",
          boxShadow: "none",
          display: "flex",
          flexDirection: "column",
          gap: 1.25,
        }}
      >
        {submitError && (
          <Alert severity="error" sx={{ py: 0, borderRadius: "10px" }}>
            {submitError}
          </Alert>
        )}
        {/* Why the button is off */}
        {!loadingData && !formComplete && (
          <Typography sx={{ fontSize: "0.78rem", color: "#B45309", fontWeight: 600 }}>
            Still needed before recording: {missing.join(", ")}.
          </Typography>
        )}

        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            alignItems: { xs: "stretch", md: "center" },
            justifyContent: "space-between",
            gap: { xs: 1.25, md: 3 },
          }}
        >
          <Box sx={{ display: "flex", gap: { xs: 2.5, md: 5 } }}>
            <Box>
              <Typography sx={columnLabelSx}>Material cost</Typography>
              <Typography sx={{ fontSize: { xs: "1.05rem", md: "1.3rem" }, fontWeight: 800, color: "#0F172A", lineHeight: 1.35 }}>
                {costedRows.length > 0 ? formatMoney(totalMaterialCost) : `${CURRENCY} –`}
              </Typography>
              <Typography sx={{ fontSize: "0.72rem", color: uncostedCount > 0 ? "#B45309" : "#64748B" }}>
                {usedRows.length === 0
                  ? "Enter quantities to see the cost"
                  : uncostedCount > 0
                    ? `${uncostedCount} material${uncostedCount === 1 ? "" : "s"} without a cost not included`
                    : "All materials costed"}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: "flex", gap: 1.5, flexShrink: 0 }}>
            <Button
              onClick={resetForm}
              color="inherit"
              disabled={submitting}
              sx={{
                fontWeight: 700,
                color: "#475569",
                borderRadius: "10px",
                px: 3,
                py: 1.1,
                flex: { xs: 1, md: "none" },
                "&:hover": { bgcolor: "#F1F5F9" },
              }}
            >
              Clear
            </Button>
            <Button
              onClick={handleSubmit}
              variant="contained"
              // Stays off until every required field is filled in and nothing exceeds the stock
              disabled={submitting || loadingData || hasBlockingOverUse || !formComplete}
              disableElevation
              sx={{
                fontWeight: 700,
                borderRadius: "10px",
                px: 4,
                py: 1.1,
                flex: { xs: 2, md: "none" },
                bgcolor: "#2563EB",
                "&:hover": { bgcolor: "#1D4ED8" },
              }}
            >
              {submitting ? <CircularProgress size={22} color="inherit" /> : "Record Production"}
            </Button>
          </Box>
        </Box>
      </Paper>

      <Snackbar
        open={!!successMsg}
        autoHideDuration={5000}
        onClose={() => setSuccessMsg("")}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
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
