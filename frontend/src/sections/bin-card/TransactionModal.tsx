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
  alpha,
  Grid,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { z } from "zod";
import { Item } from "./BinCardView";

const transactionSchema = z.object({
  amount: z.number().positive("Amount must be greater than 0"),
  authorizedBy: z.string().min(1, "Authorized By Name is required"),
  remarks: z.string().min(1, "Remarks are required"),
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

export default function TransactionModal({
  open,
  type,
  onClose,
  onSuccess,
  onError,
  items,
  initialItemId = "",
}: TransactionModalProps) {
  const [transactionItemId, setTransactionItemId] =
    useState<string>(initialItemId);
  const [amount, setAmount] = useState("");
  const [authorizedBy, setAuthorizedBy] = useState("");
  const [remarks, setRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<{
    amount?: string;
    authorizedBy?: string;
    remarks?: string;
  }>({});

  const isLoad = type === "load";

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setTransactionItemId(initialItemId);
      setAmount("");
      setAuthorizedBy("");
      setRemarks("");
      setFormErrors({});
      setSubmitting(false);
    }
  }, [open, initialItemId]);

  const selectedItem = items.find((i) => i.itemId === transactionItemId);
  const currentStock = selectedItem?.currentStock ?? 0;

  const formatNumber = (num: number) => {
    return Math.round((num + Number.EPSILON) * 100) / 100;
  };

  // Real-time over-deduction check and math
  const numAmount = parseFloat(amount);
  const hasValidAmount = !isNaN(numAmount) && numAmount > 0;
  const isOverDeducting = !isLoad && hasValidAmount && numAmount > currentStock;

  const projectedStock = formatNumber(
    isLoad
      ? currentStock + (hasValidAmount ? numAmount : 0)
      : currentStock - (hasValidAmount ? numAmount : 0),
  );

  const handleSubmit = async () => {
    if (isOverDeducting) return;

    const result = transactionSchema.safeParse({
      amount: hasValidAmount ? numAmount : 0,
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
          authorizedBy: result.data.authorizedBy,
          remarks: result.data.remarks,
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || `Failed to ${type} stock`);
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
      bgcolor: "#F8FAFC",
      "& fieldset": { borderColor: "#E2E8F0" },
      "&:hover fieldset": { borderColor: "#CBD5E1" },
      "&.Mui-focused fieldset": {
        borderColor: isLoad ? "#10B981" : "#EF4444",
        borderWidth: "2px",
      },
    },
    "& .MuiInputLabel-root.Mui-focused": {
      color: isLoad ? "#10B981" : "#EF4444",
    },
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: "20px",
            boxShadow: "none",
            border: "1px solid #E2E8F0",
            bgcolor: "#FFFFFF",
            backgroundImage: "none",
          },
        },
      }}
    >
      <DialogTitle
        sx={{
          p: 3,
          display: "flex",
          alignItems: "center",
          gap: 2,
          borderBottom: "1px solid #E2E8F0",
        }}
      >
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: "12px",
            bgcolor: isLoad ? alpha("#10B981", 0.1) : alpha("#EF4444", 0.1),
            color: isLoad ? "#10B981" : "#EF4444",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {isLoad ? <AddIcon /> : <RemoveIcon />}
        </Box>
        <Typography
          variant="h6"
          sx={{
            fontWeight: 800,
            color: "#0F172A",
            fontSize: "1.25rem",
            letterSpacing: "-0.01em",
          }}
        >
          {isLoad ? "Load Stock into Bin Card" : "Deduct Stock from Bin Card"}
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "row" },
            width: "100%",
            minHeight: "100%",
          }}
        >
          {/* Left Column: Form Fields */}
          <Box
            sx={{
              flex: 1,
              p: 4,
              display: "flex",
              flexDirection: "column",
              gap: 3,
              boxSizing: "border-box",
              width: "50%",
            }}
          >
            <TextField
              select
              label="Select Material / Item"
              fullWidth
              value={transactionItemId}
              onChange={(e) => {
                setTransactionItemId(e.target.value);
                setAmount("");
                setFormErrors({});
              }}
              sx={textFieldSx}
            >
              <MenuItem value="" disabled>
                <em>Select a material</em>
              </MenuItem>
              {items.map((item) => (
                <MenuItem key={item.itemId} value={item.itemId}>
                  <Typography sx={{ fontWeight: 600, color: "#1E293B" }}>
                    {item.itemName}
                  </Typography>
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label={`Quantity - (${selectedItem?.unitOfMeasure || "Units"})`}
              type="number"
              variant="outlined"
              fullWidth
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              error={!!formErrors.amount || isOverDeducting}
              helperText={
                isOverDeducting
                  ? `Exceeds available stock (${formatNumber(currentStock)} ${selectedItem?.unitOfMeasure || ""})`
                  : formErrors.amount ||
                    (isLoad
                      ? "Enter the quantity of material to adjust"
                      : "Enter the quantity of material to deduct/issue")
              }
              sx={{
                ...textFieldSx,
                "& .MuiFormHelperText-root": {
                  color: isOverDeducting ? "#EF4444" : undefined,
                  fontWeight: isOverDeducting ? 600 : 400,
                },
              }}
            />

            <TextField
              label="Authorized By"
              variant="outlined"
              fullWidth
              value={authorizedBy}
              onChange={(e) => setAuthorizedBy(e.target.value)}
              error={!!formErrors.authorizedBy}
              helperText={
                formErrors.authorizedBy ||
                "Name of the person authorizing this transaction"
              }
              sx={textFieldSx}
            />
          </Box>

          {/* Right Column: Visuals & Remarks */}
          <Box
            sx={{
              flex: 1,
              p: 4,
              bgcolor: "#F8FAFC",
              borderLeft: "1px solid #E2E8F0",
              display: "flex",
              flexDirection: "column",
              gap: 3,
              boxSizing: "border-box",
              width: "50%",
            }}
          >
            {/* Projected Balance Card */}
            {!isLoad && (
              <Box
                sx={{
                  width: "100%",
                  bgcolor: "#FFFFFF",
                  borderRadius: "16px",
                  p: 2.5,
                  border: "1px solid #E2E8F0",
                  boxShadow: "none",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                  boxSizing: "border-box",
                }}
              >
                <Typography
                  variant="overline"
                  sx={{
                    color: "#64748B",
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                  }}
                >
                  Available Stock Balance
                </Typography>

                {!selectedItem ? (
                  <Typography
                    sx={{ color: "#94A3B8", mt: 0.5, fontSize: "0.9rem" }}
                  >
                    Please select a material
                  </Typography>
                ) : (
                  <>
                    <Typography
                      sx={{
                        fontSize: "2.25rem",
                        fontWeight: 800,
                        color: isOverDeducting
                          ? "#EF4444"
                          : hasValidAmount
                            ? isLoad
                              ? "#10B981"
                              : "#F59E0B"
                            : "#0F172A",
                        lineHeight: 1.1,
                        mt: 0.5,
                        mb: 0.25,
                        transition: "color 0.2s ease",
                      }}
                    >
                      {projectedStock}
                    </Typography>

                    {hasValidAmount ? (
                      <Typography
                        variant="body2"
                        sx={{ color: "#64748B", fontWeight: 600, mt: 0.5 }}
                      >
                        {formatNumber(currentStock)} {isLoad ? "+" : "-"}{" "}
                        {formatNumber(numAmount)} ={" "}
                        {formatNumber(projectedStock)}{" "}
                        {selectedItem.unitOfMeasure}
                      </Typography>
                    ) : (
                      <Typography
                        variant="subtitle2"
                        sx={{ color: "#64748B", fontWeight: 600 }}
                      >
                        {selectedItem.unitOfMeasure}
                      </Typography>
                    )}

                    {/* Over deduction visual warning */}
                    {isOverDeducting && (
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                          mt: 1.5,
                          color: "#EF4444",
                        }}
                      >
                        <WarningAmberIcon fontSize="small" />
                        <Typography variant="caption" sx={{ fontWeight: 700 }}>
                          Insufficient Stock
                        </Typography>
                      </Box>
                    )}
                  </>
                )}
              </Box>
            )}
            <TextField
              label="Remarks / Reference Note"
              variant="outlined"
              fullWidth
              multiline
              rows={isLoad ? 9 : 5}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              error={!!formErrors.remarks}
              helperText={
                formErrors.remarks ||
                "Provide reason or invoice/batch reference"
              }
              sx={{
                ...textFieldSx,
                width: "100%",
                "& .MuiOutlinedInput-root": {
                  ...textFieldSx["& .MuiOutlinedInput-root"],
                  bgcolor: "#FFFFFF",
                  width: "100%",
                },
              }}
            />
          </Box>
        </Box>
      </DialogContent>

      <DialogActions
        sx={{
          p: 3,
          pt: 2,
          gap: 1.5,
          borderTop: "1px solid #E2E8F0",
          bgcolor: "#FFFFFF",
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
            bgcolor: isLoad ? "#10B981" : "#EF4444",
            "&:hover": {
              bgcolor: isLoad ? "#059669" : "#DC2626",
            },
            "&.Mui-disabled": {
              bgcolor: isLoad ? alpha("#10B981", 0.5) : alpha("#EF4444", 0.5),
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
