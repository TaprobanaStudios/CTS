"use client";

import * as React from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  TextField,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";

export interface EditRecordField {
  name: string;
  label: string;
  type: "date" | "number" | "text" | "multiline";
  // Whole numbers only (pieces); otherwise decimals are allowed
  integer?: boolean;
  required?: boolean;
  disabled?: boolean;
  helperText?: string;
  startAdornment?: string;
  endAdornment?: string;
  // Take half the row on wider screens
  half?: boolean;
}

interface EditRecordDialogProps {
  title: string;
  subtitle?: string;
  fields: EditRecordField[];
  initialValues: Record<string, string>;
  onClose: () => void;
  // Receives every field plus `editedBy` and `editRemark`; throw an Error to show its message in the dialog
  onSubmit: (values: Record<string, string>) => Promise<void>;
}

const DEFAULT_EDITED_BY = "Admin";
const CONFIRM_WORD = "yes";

const fieldSx = {
  width: "100%",
  "& .MuiOutlinedInput-root": {
    borderRadius: "12px",
    bgcolor: "#FFFFFF",
    "& fieldset": { borderColor: "#E2E8F0" },
    "&:hover fieldset": { borderColor: "#CBD5E1" },
    "&.Mui-focused fieldset": { borderColor: "#2563EB", borderWidth: "2px" },
    "&.Mui-disabled": { bgcolor: "#F8FAFC" },
  },
  "& .MuiFormHelperText-root": { mx: 0.25 },
};

const adornmentSx = {
  "& .MuiTypography-root": { fontSize: "0.75rem", fontWeight: 700, color: "#64748B" },
};

/**
 * A small form for correcting one saved record. It always asks who is making the
 * change, so the record can show "edited by ... at ...". Mount it only while a
 * record is being edited; its fields start from `initialValues`.
 */
export default function EditRecordDialog({
  title,
  subtitle,
  fields,
  initialValues,
  onClose,
  onSubmit,
}: EditRecordDialogProps) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));

  const [values, setValues] = React.useState<Record<string, string>>({
    ...initialValues,
    editedBy: DEFAULT_EDITED_BY,
  });
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [submitError, setSubmitError] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  // Second step: the user has to type "yes" before the change is saved
  const [confirming, setConfirming] = React.useState(false);
  const [confirmText, setConfirmText] = React.useState("");

  // Has any field of the record itself been changed? (Who is editing and why do not count.)
  const hasChanges = fields.some((field) => {
    if (field.disabled) return false;
    const before = (initialValues[field.name] ?? "").trim();
    const after = (values[field.name] ?? "").trim();
    // "60" and "60.00" are the same quantity
    if (field.type === "number" && before !== "" && after !== "") return Number(before) !== Number(after);
    return before !== after;
  });

  const setValue = (name: string, value: string) => {
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => (current[name] ? { ...current, [name]: "" } : current));
  };

  const handleSubmit = () => {
    const nextErrors: Record<string, string> = {};
    fields.forEach((field) => {
      if (field.disabled) return;
      const value = (values[field.name] ?? "").trim();
      if (field.required && value === "") {
        nextErrors[field.name] = `${field.label} is required`;
      } else if (field.type === "number" && value !== "") {
        const number = Number(value);
        if (isNaN(number) || number < 0) nextErrors[field.name] = "Enter a valid number";
        else if (field.integer && !Number.isInteger(number)) nextErrors[field.name] = "Must be a whole number";
      }
    });
    if (!(values.editedBy ?? "").trim()) nextErrors.editedBy = "Say who is making this change";
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    // Valid: ask for the typed confirmation before anything is saved
    setSubmitError("");
    setConfirmText("");
    setConfirming(true);
  };

  const confirmed = confirmText.trim().toLowerCase() === CONFIRM_WORD;

  const handleConfirmedSave = async () => {
    if (!confirmed) return;
    setSubmitting(true);
    try {
      await onSubmit(values);
      onClose();
    } catch (err) {
      // Back to the form, with the reason shown there
      setSubmitError(err instanceof Error ? err.message : "Failed to save the change");
      setConfirming(false);
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open
      onClose={submitting ? undefined : onClose}
      maxWidth="sm"
      fullWidth
      fullScreen={fullScreen}
      slotProps={{
        paper: {
          sx: {
            borderRadius: { xs: 0, sm: "20px" },
            boxShadow: "none",
            border: { xs: "none", sm: "1px solid #E2E8F0" },
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
            bgcolor: "#EFF6FF",
            color: "#2563EB",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <EditOutlinedIcon />
        </Box>
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography
            component="h2"
            sx={{ fontWeight: 800, color: "#0F172A", fontSize: { xs: "1.1rem", sm: "1.25rem" }, lineHeight: 1.2 }}
          >
            {title}
          </Typography>
          {subtitle && (
            <Typography sx={{ color: "#64748B", fontSize: "0.8rem", mt: 0.25, overflowWrap: "anywhere" }}>
              {subtitle}
            </Typography>
          )}
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
          bgcolor: "#F8FAFC",
          display: "grid",
          gridTemplateColumns: { xs: "minmax(0, 1fr)", sm: "repeat(2, minmax(0, 1fr))" },
          gap: 2.25,
          alignItems: "start",
        }}
      >
        {fields.map((field) => (
          <TextField
            key={field.name}
            label={field.label}
            type={field.type === "multiline" ? "text" : field.type}
            multiline={field.type === "multiline"}
            rows={field.type === "multiline" ? 2 : undefined}
            fullWidth
            disabled={field.disabled}
            value={values[field.name] ?? ""}
            onChange={(e) => setValue(field.name, e.target.value)}
            error={!!errors[field.name]}
            helperText={errors[field.name] || field.helperText}
            slotProps={{
              htmlInput:
                field.type === "number"
                  ? { min: 0, step: field.integer ? 1 : "any", inputMode: field.integer ? "numeric" : "decimal" }
                  : undefined,
              input: {
                startAdornment: field.startAdornment ? (
                  <InputAdornment position="start" sx={adornmentSx}>
                    {field.startAdornment}
                  </InputAdornment>
                ) : undefined,
                endAdornment: field.endAdornment ? (
                  <InputAdornment position="end" sx={adornmentSx}>
                    {field.endAdornment}
                  </InputAdornment>
                ) : undefined,
              },
            }}
            sx={{
              ...fieldSx,
              gridColumn: { sm: field.half ? "auto" : "1 / -1" },
              ...(field.type === "multiline" && { "& .MuiOutlinedInput-input": { p: "10px 14px" } }),
            }}
          />
        ))}

        {/* Stored with the record and shown beside it afterwards */}
        <TextField
          label="Edited By"
          fullWidth
          value={values.editedBy ?? ""}
          onChange={(e) => setValue("editedBy", e.target.value)}
          error={!!errors.editedBy}
          helperText={errors.editedBy || "Saved with the entry, along with the date and time of this change"}
          sx={{ ...fieldSx, gridColumn: "1 / -1" }}
        />

        <TextField
          label="Reason for this change (optional)"
          fullWidth
          multiline
          rows={2}
          value={values.editRemark ?? ""}
          onChange={(e) => setValue("editRemark", e.target.value)}
          placeholder="e.g. counted again, 2 bags were missed"
          helperText="Shown beside the entry and kept in the Edit History"
          sx={{ ...fieldSx, gridColumn: "1 / -1", "& .MuiOutlinedInput-input": { p: "10px 14px" } }}
        />

        {submitError && (
          <Alert severity="warning" sx={{ gridColumn: "1 / -1", borderRadius: "10px" }}>
            <Typography sx={{ fontWeight: 700, fontSize: "0.85rem" }}>This change was not saved</Typography>
            <Typography sx={{ fontSize: "0.85rem" }}>{submitError}</Typography>
          </Alert>
        )}
      </DialogContent>

      <DialogActions
        sx={{
          p: { xs: 2, sm: 3 },
          py: { xs: 1.5, sm: 2 },
          gap: 1.5,
          borderTop: "1px solid #E2E8F0",
          "& > :not(style) ~ :not(style)": { ml: 0 },
        }}
      >
        <Button
          onClick={onClose}
          color="inherit"
          disabled={submitting}
          sx={{ fontWeight: 700, color: "#475569", borderRadius: "10px", px: 3, py: 1, flex: { xs: 1, sm: "none" } }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disableElevation
          // Nothing to save until a value has actually been changed
          disabled={submitting || !hasChanges}
          sx={{
            fontWeight: 700,
            borderRadius: "10px",
            px: 4,
            py: 1,
            flex: { xs: 2, sm: "none" },
            bgcolor: "#2563EB",
            "&:hover": { bgcolor: "#1D4ED8" },
          }}
        >
          Save Changes
        </Button>
      </DialogActions>

      {/* Confirmation: saving changes balances, costs and reports, so it must be deliberate */}
      <Dialog
        open={confirming}
        onClose={submitting ? undefined : () => setConfirming(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: { sx: { borderRadius: "16px", boxShadow: "none", border: "1px solid #E2E8F0", backgroundImage: "none" } },
        }}
      >
        <DialogTitle component="div" sx={{ p: 3, pb: 1.5 }}>
          <Typography component="h2" sx={{ fontWeight: 800, color: "#0F172A", fontSize: "1.15rem" }}>
            Are you sure you want to save this change?
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ px: 3, pb: 1, display: "flex", flexDirection: "column", gap: 2 }}>
          <Typography sx={{ color: "#475569", fontSize: "0.875rem" }}>
            You are changing a saved record. Stock balances, costs and reports that depend on it will be
            updated, and the change will be kept in the Edit History under the name{" "}
            <Box component="span" sx={{ fontWeight: 700, color: "#0F172A" }}>
              {(values.editedBy ?? "").trim()}
            </Box>
            .
          </Typography>
          <TextField
            label={`Type "${CONFIRM_WORD}" to confirm`}
            fullWidth
            autoFocus
            autoComplete="off"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && confirmed && !submitting) handleConfirmedSave();
            }}
            placeholder={CONFIRM_WORD}
            sx={fieldSx}
          />
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1.5, gap: 1.5, "& > :not(style) ~ :not(style)": { ml: 0 } }}>
          <Button
            onClick={() => setConfirming(false)}
            color="inherit"
            disabled={submitting}
            sx={{ fontWeight: 700, color: "#475569", borderRadius: "10px", px: 3, py: 1 }}
          >
            Go Back
          </Button>
          <Button
            onClick={handleConfirmedSave}
            variant="contained"
            disableElevation
            disabled={!confirmed || submitting}
            sx={{
              fontWeight: 700,
              borderRadius: "10px",
              px: 3.5,
              py: 1,
              bgcolor: "#2563EB",
              "&:hover": { bgcolor: "#1D4ED8" },
            }}
          >
            {submitting ? <CircularProgress size={22} color="inherit" /> : "Yes, Save Changes"}
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
}
