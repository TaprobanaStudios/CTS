"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  TextField,
  Alert,
  Button,
  Chip,
  CircularProgress,
  InputAdornment,
  Autocomplete,
  Paper,
  Snackbar,
} from "@mui/material";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import { z } from "zod";
import {
  ProductStock,
  STATUS_CONFIG,
  CURRENCY,
  formatMoney,
  formatQty,
} from "../production/types";
import { todayInSriLanka } from "@/utils/datetime";

const saleSchema = z.object({
  saleDate: z.string().min(1, "Sale date is required"),
  productName: z.string().min(1, "Select the product that was sold"),
  quantity: z.number().int("Must be a whole number").min(1, "Must sell at least 1 unit"),
  unitPrice: z.number({ message: "Selling price is required" }).nonnegative("Selling price cannot be negative"),
});

type FormErrors = Partial<Record<"saleDate" | "productName" | "quantity" | "unitPrice", string>>;

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

const labelSx = {
  fontSize: "0.68rem",
  fontWeight: 700,
  color: "#94A3B8",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
};

const tileSx = {
  p: 2,
  bgcolor: "#F8FAFC",
  borderRadius: "12px",
  border: "1px solid #E2E8F0",
  minWidth: 0,
};

const tileValueSx = { fontSize: "1.25rem", fontWeight: 800, color: "#0F172A", lineHeight: 1.4 };
const tileHintSx = { fontSize: "0.74rem", color: "#64748B" };

export default function SalesFormView() {
  const [products, setProducts] = useState<ProductStock[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  // Bumped after a sale so product balances are read again
  const [reloadToken, setReloadToken] = useState(0);

  const [saleDate, setSaleDate] = useState(todayInSriLanka);
  const [product, setProduct] = useState<ProductStock | null>(null);
  const [quantity, setQuantity] = useState("");
  const [unitPrice, setUnitPrice] = useState("");

  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/sales/products", { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load products");
        return res.json();
      })
      .then((data: ProductStock[]) => {
        setProducts(data);
        setLoadingData(false);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setSubmitError(err instanceof Error ? err.message : "Failed to load products");
        setLoadingData(false);
      });

    return () => controller.abort();
  }, [reloadToken]);

  // A field's message goes away as soon as the field is edited
  const clearError = (field: keyof FormErrors) =>
    setFormErrors((errors) => (errors[field] ? { ...errors, [field]: undefined } : errors));

  const resetForm = () => {
    setSaleDate(todayInSriLanka());
    setProduct(null);
    setQuantity("");
    setUnitPrice("");
    setFormErrors({});
    setSubmitError("");
    setLoadingData(true);
    setReloadToken((token) => token + 1);
  };

  const qty = parseInt(quantity, 10);
  const hasQty = !isNaN(qty) && qty > 0;
  const price = parseFloat(unitPrice);
  const hasPrice = unitPrice.trim() !== "" && !isNaN(price) && price >= 0;

  const stock = product?.currentStock ?? 0;
  const overStock = Boolean(product) && hasQty && qty > stock;
  const unitCost = product?.unitMaterialCost ?? null;

  const revenue = hasQty && hasPrice ? qty * price : null;
  const materialCost = hasQty && unitCost != null ? qty * unitCost : null;
  const profit = revenue != null && materialCost != null ? revenue - materialCost : null;

  // What still has to be filled in before the sale can be recorded, in form order
  const missing: string[] = [];
  if (!saleDate) missing.push("sale date");
  if (!product) missing.push("product");
  if (quantity.trim() === "" || !Number.isInteger(Number(quantity)) || Number(quantity) < 1) missing.push("quantity");
  if (!hasPrice) missing.push("selling price");
  const formComplete = missing.length === 0;

  const handleSubmit = async () => {
    setSubmitError("");

    const parsed = saleSchema.safeParse({
      saleDate,
      productName: product?.productName ?? "",
      quantity: quantity === "" ? 0 : Number(quantity),
      unitPrice: unitPrice.trim() === "" ? undefined : Number(unitPrice),
    });

    if (!parsed.success) {
      const errors: FormErrors = {};
      parsed.error.issues.forEach((issue) => {
        const field = issue.path[0] as keyof FormErrors;
        if (!errors[field]) errors[field] = issue.message;
      });
      setFormErrors(errors);
      return;
    }
    setFormErrors({});

    try {
      setSubmitting(true);
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || "Failed to record sale");
      }

      setSuccessMsg(`Sold ${formatQty(parsed.data.quantity)} PCS of ${parsed.data.productName}`);
      resetForm();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to record sale");
    } finally {
      setSubmitting(false);
    }
  };

  const sold = STATUS_CONFIG.SOLD;

  return (
    <Box sx={{ width: "100%", display: "flex", flexDirection: "column", gap: 2.5 }}>
      {/* Page Header */}
      <Box>
        <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 1.5 }}>
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
            Record Sale
          </Typography>
          <Chip
            label={sold.label}
            size="small"
            sx={{
              bgcolor: sold.bg,
              color: sold.color,
              fontWeight: 700,
              fontSize: "0.75rem",
              border: `1px solid ${sold.border}`,
              height: 24,
            }}
          />
        </Box>
        <Typography variant="body2" sx={{ color: "#64748B", mt: 0.5, fontWeight: 500 }}>
          Take sold products out of stock and record what they were sold for.
        </Typography>
      </Box>

      {/* ---------------- Sale details ---------------- */}
      <Paper elevation={0} sx={{ ...cardSx, display: "flex", flexDirection: "column", gap: 2.5 }}>
        <Box
          sx={{
            display: "grid",
            gap: 2,
            alignItems: "start",
            gridTemplateColumns: {
              xs: "1fr 1fr",
              md: "200px minmax(0, 1fr) 170px 200px",
            },
            gridTemplateAreas: {
              xs: `"date date" "product product" "qty price"`,
              md: `"date product qty price"`,
            },
          }}
        >
          <TextField
            label="Sale Date"
            type="date"
            fullWidth
            value={saleDate}
            onChange={(e) => {
              setSaleDate(e.target.value);
              clearError("saleDate");
            }}
            error={!!formErrors.saleDate}
            helperText={formErrors.saleDate}
            sx={{ ...fieldSx, gridArea: "date" }}
          />

          {/* Type to search the manufactured products */}
          <Autocomplete
            options={products}
            value={product}
            loading={loadingData}
            onChange={(_, selected) => {
              setProduct(selected);
              clearError("productName");
            }}
            getOptionLabel={(option) => option.productName}
            isOptionEqualToValue={(option, value) => option.productName === value.productName}
            getOptionDisabled={(option) => option.currentStock <= 0}
            autoHighlight
            openOnFocus
            noOptionsText="No product found"
            sx={{ gridArea: "product", minWidth: 0 }}
            renderOption={(props, option) => {
              const { key, ...optionProps } = props;
              return (
                <Box component="li" key={key} {...optionProps} sx={{ display: "flex", alignItems: "baseline", gap: 2 }}>
                  <Typography sx={{ fontWeight: 600, color: "#1E293B", fontSize: "0.9rem", flexGrow: 1 }}>
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
              );
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Product"
                placeholder="Search product"
                error={!!formErrors.productName}
                helperText={formErrors.productName}
                sx={fieldSx}
              />
            )}
          />

          <TextField
            label="Quantity"
            type="number"
            fullWidth
            placeholder="0"
            value={quantity}
            onChange={(e) => {
              setQuantity(e.target.value);
              clearError("quantity");
            }}
            error={!!formErrors.quantity || overStock}
            helperText={overStock ? `Only ${formatQty(stock)} PCS in stock` : formErrors.quantity}
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
            label="Selling Price"
            type="number"
            fullWidth
            placeholder="0.00"
            value={unitPrice}
            onChange={(e) => {
              setUnitPrice(e.target.value);
              clearError("unitPrice");
            }}
            error={!!formErrors.unitPrice}
            helperText={formErrors.unitPrice || "per piece"}
            slotProps={{
              htmlInput: { min: 0, step: "0.01", inputMode: "decimal" },
              input: {
                startAdornment: (
                  <InputAdornment position="start" sx={adornmentSx}>
                    {CURRENCY}
                  </InputAdornment>
                ),
              },
            }}
            sx={{ ...fieldSx, gridArea: "price" }}
          />
        </Box>

        {/* What the chosen product has in stock and what it cost to make */}
        <Box
          sx={{
            display: "grid",
            gap: 1.5,
            gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(0, 1fr))" },
          }}
        >
          <Box sx={tileSx}>
            <Typography sx={labelSx}>Stock</Typography>
            {product ? (
              <>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Typography sx={tileValueSx}>{formatQty(stock)}</Typography>
                  <ArrowForwardRoundedIcon sx={{ color: "#CBD5E1", fontSize: 18 }} />
                  <Typography
                    sx={{ ...tileValueSx, color: overStock ? "#EF4444" : hasQty ? "#2563EB" : "#0F172A" }}
                  >
                    {formatQty(stock - (hasQty ? qty : 0))}
                  </Typography>
                  <Typography sx={{ fontSize: "0.75rem", color: "#64748B", fontWeight: 700 }}>PCS</Typography>
                </Box>
                <Typography sx={{ ...tileHintSx, color: overStock ? "#DC2626" : "#64748B" }}>
                  {overStock ? "Not enough in stock" : "now → after this sale"}
                </Typography>
              </>
            ) : (
              <Typography sx={{ ...tileHintSx, mt: 0.5 }}>Select a product to see its stock</Typography>
            )}
          </Box>

          <Box sx={tileSx}>
            <Typography sx={labelSx}>Material cost per piece</Typography>
            <Typography sx={tileValueSx}>{unitCost != null ? formatMoney(unitCost) : `${CURRENCY} –`}</Typography>
            <Typography sx={tileHintSx}>
              {!product
                ? "Select a product"
                : unitCost != null
                  ? "Average of its productions that had material costs"
                  : "No production of this product has material costs yet"}
            </Typography>
          </Box>

          <Box sx={tileSx}>
            <Typography sx={labelSx}>Material cost of this sale</Typography>
            <Typography sx={tileValueSx}>
              {materialCost != null ? formatMoney(materialCost) : `${CURRENCY} –`}
            </Typography>
            <Typography sx={tileHintSx}>
              {materialCost != null
                ? `${formatQty(qty)} PCS × ${formatMoney(unitCost!)}`
                : unitCost != null
                  ? "Enter the quantity"
                  : "Needs a material cost per piece"}
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* ---------------- Totals and actions ---------------- */}
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
          <Box sx={{ display: "flex", flexWrap: "wrap", columnGap: { xs: 2.5, md: 5 }, rowGap: 1 }}>
            <Box>
              <Typography sx={labelSx}>Sale total</Typography>
              <Typography sx={{ fontSize: { xs: "1.05rem", md: "1.3rem" }, fontWeight: 800, color: "#0F172A", lineHeight: 1.35 }}>
                {revenue != null ? formatMoney(revenue) : `${CURRENCY} –`}
              </Typography>
              <Typography sx={tileHintSx}>
                {revenue != null ? `${formatQty(qty)} PCS × ${formatMoney(price)}` : "Quantity × selling price"}
              </Typography>
            </Box>
            <Box>
              <Typography sx={labelSx}>Profit over material cost</Typography>
              <Typography
                sx={{
                  fontSize: { xs: "1.05rem", md: "1.3rem" },
                  fontWeight: 800,
                  lineHeight: 1.35,
                  color: profit == null ? "#0F172A" : profit >= 0 ? "#059669" : "#DC2626",
                }}
              >
                {profit != null ? formatMoney(profit) : `${CURRENCY} –`}
              </Typography>
              <Typography sx={tileHintSx}>
                {profit != null ? "Sale total − material cost" : "Shown when the material cost is known"}
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
              // Stays off until every required field is filled in and the quantity is in stock
              disabled={submitting || loadingData || overStock || !formComplete}
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
              {submitting ? <CircularProgress size={22} color="inherit" /> : "Record Sale"}
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
