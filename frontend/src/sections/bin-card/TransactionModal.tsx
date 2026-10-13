import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  TextField,
  MenuItem,
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  alpha,
  useMediaQuery,
  Alert,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import CloseIcon from "@mui/icons-material/Close";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { z } from "zod";
import { Item } from "./BinCardView";

const DEFAULT_AUTHORIZED_BY = "Admin";
const CURRENCY = "Rs.";

// Loading stock only needs material, quantity and authorizer; a deduction must say why
const buildTransactionSchema = (remarksRequired: boolean) =>
  z.object({
    amount: z.number().positive("Amount must be greater than 0"),
    unitCost: z.number().nonnegative("Unit cost cannot be negative").optional(),
    authorizedBy: z.string().trim().min(1, "Authorized By Name is required"),
    remarks: remarksRequired
      ? z.string().trim().min(1, "Remarks are required")
      : z.string().trim(),
  });

interface TransactionModalProps {
  open: boolean;
  type: "load" | "deduct";
  onClose: () => void;
  onSuccess: (successMessage: string) => void;
  onError: (errorMessage: string) => void;
  items: Item[];
  initialItemId?: string;
}

const formatNumber = (num: number) => Math.round((num + Number.EPSILON) * 100) / 100;

const formatMoney = (num: number) =>
  `${CURRENCY} ${num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export default function TransactionModal({
  open,
  type,
  onClose,
  onSuccess,
  onError,
  items,
  initialItemId = "",
}: TransactionModalProps) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));

  const [transactionItemId, setTransactionItemId] =
    useState<string>(initialItemId);
  const [amount, setAmount] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [authorizedBy, setAuthorizedBy] = useState(DEFAULT_AUTHORIZED_BY);
  const [remarks, setRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<{
    amount?: string;
    unitCost?: string;
    authorizedBy?: string;
    remarks?: string;
  }>({});

  const isLoad = type === "load";
  const accent = isLoad ? "#10B981" : "#EF4444";
  const accentDark = isLoad ? "#059669" : "#DC2626";

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setTransactionItemId(initialItemId);
      setAmount("");
      setUnitCost("");
      setAuthorizedBy(DEFAULT_AUTHORIZED_BY);
      setRemarks("");
      setFormErrors({});
      setSubmitting(false);
    }
  }, [open, initialItemId]);

  const selectedItem = items.find((i) => i.itemId === transactionItemId);
  const currentStock = selectedItem?.currentStock ?? 0;
  const unit = selectedItem?.unitOfMeasure || "";

  // Real-time over-deduction check and math
  const numAmount = parseFloat(amount);
  const hasValidAmount = !isNaN(numAmount) && numAmount > 0;
  const isOverDeducting = !isLoad && hasValidAmount && numAmount > currentStock;

  const projectedStock = formatNumber(
    isLoad
      ? currentStock + (hasValidAmount ? numAmount : 0)
      : currentStock - (hasValidAmount ? numAmount : 0),
  );

  const numUnitCost = parseFloat(unitCost);
  const hasUnitCost = isLoad && !isNaN(numUnitCost) && numUnitCost >= 0;
  const totalCost = hasUnitCost && hasValidAmount ? numAmount * numUnitCost : null;

  const handleSubmit = async () => {
    if (isOverDeducting) return;

    const result = buildTransactionSchema(!isLoad).safeParse({
      amount: hasValidAmount ? numAmount : 0,
      // Buying cost is optional and only applies when loading stock
      unitCost: isLoad && unitCost.trim() !== "" ? Number(unitCost) : undefined,
      authorizedBy,
      remarks,
    });

    if (!result.success) {
      const formattedErrors: any = {};
      result.error.issues.forEach((issue) => {
        formattedErrors[issue.path[0]] = issue.message;
      });
      setFormErrors(formattedErrors);
      return;
    }
    setFormErrors({});

    if (!transactionItemId) {
      onError("Please select a material.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/inventory/${type}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: transactionItemId,
          itemName: selectedItem?.itemName || "",
          amount: result.data.amount,
          unitCost: result.data.unitCost,
          authorizedBy: result.data.authorizedBy,
          remarks: result.data.remarks,
        }),
      });

      if (!res.ok) {
        // The server explains why, e.g. how much is actually available
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || `Failed to ${type} stock`);
      }

      onSuccess(`Successfully ${isLoad ? "loaded" : "deducted"} stock!`);
      onClose();
    } catch (err: any) {
      onError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Modern TextField Styles
  const textFieldSx = {
    width: "100%",
    "& .MuiOutlinedInput-root": {
      width: "100%",
      borderRadius: "12px",
      bgcolor: "#FFFFFF",
      "& fieldset": { borderColor: "#E2E8F0" },
      "&:hover fieldset": { borderColor: "#CBD5E1" },
      "&.Mui-focused fieldset": {
        borderColor: accent,
        borderWidth: "2px",
      },
    },
    "& .MuiInputLabel-root.Mui-focused": {
      color: accent,
    },
    "& .MuiFormHelperText-root": { mx: 0.25 },
  };

  const adornmentSx = {
    "& .MuiTypography-root": { fontSize: "0.8rem", fontWeight: 700, color: "#64748B" },
  };

  const balanceLabelSx = {
    fontSize: "0.68rem",
    fontWeight: 700,
    color: "#94A3B8",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  };

  const balanceUnit = (
    <Box component="span" sx={{ fontSize: "0.75rem", color: "#64748B", fontWeight: 700 }}>
      {unit}
    </Box>
  );

  const optionalTag = (
    <Box component="span" sx={{ color: "#94A3B8", fontWeight: 500 }}>
      {" "}
      (optional)
    </Box>
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      fullScreen={fullScreen}
      slotProps={{
        paper: {
          sx: {
            borderRadius: { xs: 0, sm: "20px" },
            boxShadow: "none",
            border: { xs: "none", sm: "1px solid #E2E8F0" },
            bgcolor: "#FFFFFF",
            backgroundImage: "none",
          },
        },
      }}
    >
      {/* Rendered as a div: the title holds block content, which a heading cannot contain */}
      <DialogTitle
        component="div"
        sx={{
          p: { xs: 2, sm: 3 },
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          borderBottom: "1px solid #E2E8F0",
        }}
      >
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: "12px",
            bgcolor: alpha(accent, 0.1),
            color: accent,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {isLoad ? <AddIcon /> : <RemoveIcon />}
        </Box>
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography
            component="h2"
            sx={{
              fontWeight: 800,
              color: "#0F172A",
              fontSize: { xs: "1.1rem", sm: "1.25rem" },
              letterSpacing: "-0.01em",
              lineHeight: 1.2,
            }}
          >
            {isLoad ? "Load Stock" : "Deduct Stock"}
          </Typography>
          <Typography sx={{ color: "#64748B", fontSize: "0.8rem", mt: 0.25 }}>
            {isLoad
              ? "Add received material to the bin card"
              : "Issue or write off material from the bin card"}
          </Typography>
        </Box>
        <IconButton
          aria-label="Close"
          onClick={onClose}
          disabled={submitting}
          size="small"
          sx={{ color: "#64748B", alignSelf: "flex-start" }}
        >
          <CloseIcon sx={{ fontSize: 20 }} />
        </IconButton>
      </DialogTitle>

      <DialogContent
        sx={{
          // DialogTitle zeroes the top padding of the content that follows it
          p: { xs: 2, sm: 3 },
          pt: { xs: "16px !important", sm: "24px !important" },
          display: "flex",
          flexDirection: "column",
          gap: 2.5,
          bgcolor: "#F8FAFC",
        }}
      >
        <TextField
          select
          label="Material"
          fullWidth
          value={transactionItemId}
          onChange={(e) => {
            setTransactionItemId(e.target.value);
            setAmount("");
            setFormErrors({});
          }}
          slotProps={{ select: { displayEmpty: true } }}
          sx={textFieldSx}
        >
          <MenuItem value="" disabled>
            <Typography sx={{ color: "#94A3B8" }}>Select a material</Typography>
          </MenuItem>
          {items.map((item) => (
            <MenuItem key={item.itemId} value={item.itemId}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  gap: 2,
                  width: "100%",
                }}
              >
                <Typography sx={{ fontWeight: 600, color: "#1E293B" }}>
                  {item.itemName}
                </Typography>
                <Typography sx={{ fontSize: "0.75rem", color: "#64748B", flexShrink: 0 }}>
                  {formatNumber(item.currentStock ?? 0)} {item.unitOfMeasure}
                </Typography>
              </Box>
            </MenuItem>
          ))}
        </TextField>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: isLoad ? "1fr 1fr" : "1fr" },
            gap: 2.5,
            alignItems: "start",
          }}
        >
          <TextField
            label="Quantity"
            type="number"
            variant="outlined"
            fullWidth
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            error={!!formErrors.amount || isOverDeducting}
            helperText={
              isOverDeducting
                ? `Only ${formatNumber(currentStock)} ${unit} is available in inventory`
                : formErrors.amount
            }
            slotProps={{
              htmlInput: { min: 0, step: "any", inputMode: "decimal" },
              input: {
                endAdornment: unit ? (
                  <InputAdornment position="end" sx={adornmentSx}>
                    {unit}
                  </InputAdornment>
                ) : undefined,
              },
            }}
            sx={textFieldSx}
          />

          {isLoad && (
            <TextField
              label={
                <>
                  Unit Cost
                  {optionalTag}
                </>
              }
              type="number"
              variant="outlined"
              fullWidth
              placeholder="0.00"
              value={unitCost}
              onChange={(e) => setUnitCost(e.target.value)}
              error={!!formErrors.unitCost}
              helperText={
                formErrors.unitCost ||
                (totalCost != null
                  ? `Total: ${formatMoney(totalCost)}`
                  : `Buying cost per ${unit || "unit"}`)
              }
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
              sx={textFieldSx}
            />
          )}
        </Box>

        {/* Stock balance preview: current -> after this transaction */}
        {selectedItem && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 1.5,
              p: 2,
              bgcolor: "#FFFFFF",
              borderRadius: "14px",
              border: "1px solid",
              borderColor: isOverDeducting ? "#FECACA" : "#E2E8F0",
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={balanceLabelSx}>Current Stock</Typography>
              <Typography
                sx={{ fontSize: "1.25rem", fontWeight: 800, color: "#0F172A", lineHeight: 1.3 }}
              >
                {formatNumber(currentStock)} {balanceUnit}
              </Typography>
            </Box>

            <ArrowForwardRoundedIcon sx={{ color: "#CBD5E1", flexShrink: 0 }} />

            <Box sx={{ minWidth: 0, textAlign: "right" }}>
              <Typography sx={balanceLabelSx}>
                {isLoad ? "After Load" : "After Deduction"}
              </Typography>
              <Typography
                sx={{
                  fontSize: "1.25rem",
                  fontWeight: 800,
                  lineHeight: 1.3,
                  color: isOverDeducting ? "#EF4444" : hasValidAmount ? accentDark : "#0F172A",
                  transition: "color 0.2s ease",
                }}
              >
                {projectedStock} {balanceUnit}
              </Typography>
              {isOverDeducting && (
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    gap: 0.5,
                    color: "#EF4444",
                  }}
                >
                  <WarningAmberIcon sx={{ fontSize: 14 }} />
                  <Typography variant="caption" sx={{ fontWeight: 700 }}>
                    Insufficient Stock
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        )}

        {/* Why the deduction is refused, and what going ahead would have broken */}
        {isOverDeducting && (
          <Alert severity="warning" sx={{ borderRadius: "12px" }}>
            <Typography sx={{ fontWeight: 700, fontSize: "0.85rem" }}>
              Only {formatNumber(currentStock)} {unit} of {selectedItem?.itemName} is available in inventory.
            </Typography>
            <Typography sx={{ fontSize: "0.82rem" }}>
              Deducting {formatNumber(numAmount)} {unit} would make the stock negative and affect balances,
              costs and reports across the whole system. Load the stock first or reduce the quantity.
            </Typography>
          </Alert>
        )}

        <TextField
          label="Authorized By"
          variant="outlined"
          fullWidth
          value={authorizedBy}
          onChange={(e) => setAuthorizedBy(e.target.value)}
          // Never leave the authorizer empty: fall back to the default on blur
          onBlur={() => {
            if (!authorizedBy.trim()) setAuthorizedBy(DEFAULT_AUTHORIZED_BY);
          }}
          error={!!formErrors.authorizedBy}
          helperText={formErrors.authorizedBy}
          sx={textFieldSx}
        />

        <TextField
          label={
            <>
              Remarks / Reference Note
              {isLoad && optionalTag}
            </>
          }
          variant="outlined"
          fullWidth
          multiline
          rows={2}
          placeholder={
            isLoad ? "Supplier, invoice or batch reference" : "Reason for this deduction"
          }
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          error={!!formErrors.remarks}
          helperText={formErrors.remarks}
          sx={{
            ...textFieldSx,
            "& .MuiOutlinedInput-input": { p: "10px 14px" },
          }}
        />
      </DialogContent>

      <DialogActions
        sx={{
          p: { xs: 2, sm: 3 },
          py: { xs: 1.5, sm: 2 },
          gap: 1.5,
          borderTop: "1px solid #E2E8F0",
          bgcolor: "#FFFFFF",
          "& > :not(style) ~ :not(style)": { ml: 0 },
        }}
      >
        <Button
          onClick={onClose}
          color="inherit"
          disabled={submitting}
          sx={{
            fontWeight: 700,
            color: "#475569",
            borderRadius: "10px",
            px: 3,
            py: 1,
            flex: { xs: 1, sm: "none" },
            "&:hover": { bgcolor: "#F1F5F9" },
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={
            submitting || !amount || !transactionItemId || isOverDeducting
          }
          disableElevation
          sx={{
            fontWeight: 700,
            borderRadius: "10px",
            px: 4,
            py: 1,
            flex: { xs: 2, sm: "none" },
            bgcolor: accent,
            "&:hover": {
              bgcolor: accentDark,
            },
            "&.Mui-disabled": {
              bgcolor: alpha(accent, 0.5),
              color: "#FFFFFF",
            },
          }}
        >
          {submitting ? (
            <CircularProgress size={24} color="inherit" />
          ) : isLoad ? (
            "Confirm Load"
          ) : (
            "Confirm Deduction"
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
