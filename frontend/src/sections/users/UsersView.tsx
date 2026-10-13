"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  Snackbar,
  TextField,
  Typography,
} from "@mui/material";
import PersonAddAltOutlinedIcon from "@mui/icons-material/PersonAddAltOutlined";
import KeyOutlinedIcon from "@mui/icons-material/KeyOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import CustomTable, { CustomTableColumn } from "@/components/table/CustomTable";
import { useAuth, UserRole } from "@/auth/AuthContext";
import { formatDateTime } from "@/utils/datetime";

interface UserRow {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  active: boolean;
  createdAt: string | null;
}

// Which form is open, and for whom
type OpenForm =
  | { kind: "create" }
  | { kind: "reset"; user: UserRow }
  | { kind: "own" }
  | null;

interface StaffOption {
  id: string;
  name: string;
  status: string;
  // WORKER until they are given a login
  role: "WORKER" | "CLERK" | "ADMIN";
}

const MIN_PASSWORD_LENGTH = 8;

const fieldSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: "12px",
    bgcolor: "#FFFFFF",
    // Same height as the plain text boxes below it
    "&.MuiAutocomplete-inputRoot": { py: "2px" },
    "& fieldset": { borderColor: "#E2E8F0" },
    "&.Mui-focused fieldset": { borderColor: "#2563EB", borderWidth: "2px" },
  },
  "& .MuiFormHelperText-root": { mx: 0.25 },
  // Edge adds its own show-password eye; ours replaces it
  "& input::-ms-reveal, & input::-ms-clear": { display: "none" },
};

const headerButtonSx = {
  borderRadius: "10px",
  fontWeight: 700,
  textTransform: "none",
  height: 40,
  px: 2.25,
  boxShadow: "none",
};

async function send(url: string, method: string, body: unknown) {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.message || "The request failed");
  }
}

export default function UsersView() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState<{ key: number; rows: UserRow[] }>({ key: -1, rows: [] });
  const [reloadToken, setReloadToken] = useState(0);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [openForm, setOpenForm] = useState<OpenForm>(null);

  // Loading is derived: the list on screen belongs to an older request
  const loading = users.key !== reloadToken;

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/users", { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load login accounts");
        return res.json();
      })
      .then((rows: UserRow[]) => setUsers({ key: reloadToken, rows }))
      .catch((err) => {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : "Failed to load login accounts");
        setUsers((prev) => ({ ...prev, key: reloadToken }));
      });
    return () => controller.abort();
  }, [reloadToken]);

  const reload = () => setReloadToken((token) => token + 1);

  const setActive = async (row: UserRow, active: boolean) => {
    try {
      await send(`/api/users/${row.id}/active`, "PUT", { active });
      setSuccessMsg(`${row.fullName} was ${active ? "reactivated" : "deactivated"}`);
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "The request failed");
    }
  };

  const columns: CustomTableColumn[] = [
    {
      field: "fullName",
      headerName: "Name",
      minWidth: 180,
      renderCell: (params) => (
        <Typography sx={{ fontSize: "0.875rem", fontWeight: 700, color: "#0F172A" }}>
          {params.value}
          {params.row.username === me.username && (
            <Box component="span" sx={{ color: "#64748B", fontWeight: 500 }}>
              {" "}
              (you)
            </Box>
          )}
        </Typography>
      ),
    },
    {
      field: "username",
      headerName: "Username",
      minWidth: 140,
      renderCell: (params) => (
        <Typography sx={{ fontSize: "0.85rem", color: "#334155", fontWeight: 600 }}>{params.value}</Typography>
      ),
    },
    {
      field: "role",
      headerName: "Role",
      minWidth: 110,
      renderCell: (params) => (
        <Chip
          label={params.value === "ADMIN" ? "Admin" : "Clerk"}
          size="small"
          sx={{
            height: 24,
            fontSize: "0.74rem",
            fontWeight: 700,
            bgcolor: params.value === "ADMIN" ? "#F5F3FF" : "#EFF6FF",
            color: params.value === "ADMIN" ? "#7C3AED" : "#2563EB",
          }}
        />
      ),
    },
    {
      field: "active",
      headerName: "Status",
      minWidth: 120,
      mobileSlot: "badge",
      renderCell: (params) => (
        <Chip
          label={params.value ? "Active" : "Deactivated"}
          size="small"
          sx={{
            height: 24,
            fontSize: "0.74rem",
            fontWeight: 700,
            bgcolor: params.value ? "#ECFDF5" : "#FEF2F2",
            color: params.value ? "#059669" : "#DC2626",
          }}
        />
      ),
    },
    {
      field: "createdAt",
      headerName: "Created",
      minWidth: 180,
      renderCell: (params) => (
        <Typography sx={{ fontSize: "0.825rem", color: "#64748B" }}>{formatDateTime(params.value)}</Typography>
      ),
    },
    {
      field: "actions",
      headerName: "Actions",
      minWidth: 250,
      sortable: false,
      mobileSlot: "footer",
      renderCell: (params) => {
        const row = params.row as UserRow;
        // Admin accounts are not managed from here; an admin changes their own password above
        if (row.role === "ADMIN") {
          return <Typography sx={{ fontSize: "0.8rem", color: "#94A3B8" }}>-</Typography>;
        }
        return (
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            <Button
              size="small"
              variant="outlined"
              onClick={() => setOpenForm({ kind: "reset", user: row })}
              sx={{ borderRadius: "8px", fontWeight: 700, fontSize: "0.75rem", py: 0.3 }}
            >
              Set password
            </Button>
            <Button
              size="small"
              variant="outlined"
              color={row.active ? "error" : "success"}
              onClick={() => setActive(row, !row.active)}
              sx={{ borderRadius: "8px", fontWeight: 700, fontSize: "0.75rem", py: 0.3 }}
            >
              {row.active ? "Deactivate" : "Reactivate"}
            </Button>
          </Box>
        );
      },
    },
  ];

  return (
    <Box
      sx={{
        width: "100%",
        // One screen tall on laptops, so the table scrolls instead of the page
        height: { xs: "auto", md: "calc(100vh - var(--page-chrome, 48px))" },
        display: "flex",
        flexDirection: "column",
        gap: 2.5,
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          justifyContent: "space-between",
          alignItems: { xs: "stretch", sm: "center" },
          gap: 1.5,
        }}
      >
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
            Login Accounts
          </Typography>
          <Typography variant="body2" sx={{ color: "#64748B", mt: 0.5, fontWeight: 500 }}>
            Give a staff member a login as a clerk and set their password. Clerks cannot change a password themselves.
          </Typography>
        </Box>

        <Box sx={{ display: "flex", gap: 1.5, flexShrink: 0 }}>
          <Button
            variant="outlined"
            startIcon={<KeyOutlinedIcon />}
            onClick={() => setOpenForm({ kind: "own" })}
            sx={{ ...headerButtonSx, borderColor: "#CBD5E1", color: "#334155", bgcolor: "#FFFFFF" }}
          >
            Change my password
          </Button>
          <Button
            variant="contained"
            startIcon={<PersonAddAltOutlinedIcon />}
            onClick={() => setOpenForm({ kind: "create" })}
            sx={{ ...headerButtonSx, bgcolor: "#2563EB", "&:hover": { bgcolor: "#1D4ED8", boxShadow: "none" } }}
          >
            Add Clerk
          </Button>
        </Box>
      </Box>

      <Box sx={{ flex: { md: "1 1 0" }, minHeight: { md: 240 } }}>
        <CustomTable rows={users.rows} columns={columns} loading={loading} emptyMessage="No login accounts yet" />
      </Box>

      {openForm && (
        <UserFormDialog
          form={openForm}
          onClose={() => setOpenForm(null)}
          onDone={(message) => {
            setSuccessMsg(message);
            reload();
          }}
        />
      )}

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
      <Snackbar
        open={!!successMsg}
        autoHideDuration={5000}
        onClose={() => setSuccessMsg("")}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert severity="success" variant="filled" onClose={() => setSuccessMsg("")}>
          {successMsg}
        </Alert>
      </Snackbar>
    </Box>
  );
}

/** One dialog for the three password forms: new clerk, a clerk's new password, and the admin's own. */
function UserFormDialog({
  form,
  onClose,
  onDone,
}: {
  form: NonNullable<OpenForm>;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const [username, setUsername] = useState("");
  // Active staff who have no login yet; null while they load
  const [staffOptions, setStaffOptions] = useState<StaffOption[] | null>(null);
  const [staffMember, setStaffMember] = useState<StaffOption | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // One switch shows or hides every password box in the form
  const passwordSlotProps = {
    input: {
      endAdornment: (
        <InputAdornment position="end">
          <IconButton
            edge="end"
            aria-label={showPassword ? "Hide password" : "Show password"}
            onClick={() => setShowPassword((shown) => !shown)}
            onMouseDown={(e) => e.preventDefault()}
          >
            {showPassword ? <VisibilityOffOutlinedIcon /> : <VisibilityOutlinedIcon />}
          </IconButton>
        </InputAdornment>
      ),
    },
  };

  const isCreate = form.kind === "create";
  useEffect(() => {
    if (!isCreate) return;
    const controller = new AbortController();
    fetch("/api/workers", { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load staff");
        return res.json();
      })
      .then((staff: StaffOption[]) =>
        setStaffOptions(
          staff
            .filter((person) => person.status === "ACTIVE" && person.role === "WORKER")
            .sort((a, b) => a.name.localeCompare(b.name)),
        ),
      )
      .catch((err) => {
        if (controller.signal.aborted) return;
        setStaffOptions([]);
        setSubmitError(err instanceof Error ? err.message : "Failed to load staff");
      });
    return () => controller.abort();
  }, [isCreate]);

  const passwordTooShort = password !== "" && password.length < MIN_PASSWORD_LENGTH;
  const mismatch = confirm !== "" && confirm !== password;
  const complete =
    password.length >= MIN_PASSWORD_LENGTH &&
    confirm === password &&
    (form.kind !== "create" || (username.trim() !== "" && staffMember !== null)) &&
    (form.kind !== "own" || currentPassword !== "");

  const title =
    form.kind === "create"
      ? "Add Clerk"
      : form.kind === "reset"
        ? `Set a new password for ${form.user.fullName}`
        : "Change my password";

  const handleSubmit = async () => {
    setSubmitError("");
    setSubmitting(true);
    try {
      if (form.kind === "create") {
        await send("/api/users", "POST", { workerId: staffMember?.id, username: username.trim(), password });
        onDone(`${staffMember?.name} is now a clerk and signs in as "${username.trim().toLowerCase()}"`);
      } else if (form.kind === "reset") {
        await send(`/api/users/${form.user.id}/password`, "PUT", { newPassword: password });
        onDone(`Password set for ${form.user.fullName}. They have been signed out.`);
      } else {
        await send("/api/auth/change-password", "POST", { currentPassword, newPassword: password });
        onDone("Your password was changed");
      }
      onClose();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "The request failed");
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open
      onClose={submitting ? undefined : onClose}
      maxWidth="xs"
      fullWidth
      slotProps={{
        paper: { sx: { borderRadius: "16px", boxShadow: "none", border: "1px solid #E2E8F0", backgroundImage: "none" } },
      }}
    >
      <DialogTitle component="div" sx={{ p: 3, pb: 1 }}>
        <Typography component="h2" sx={{ fontWeight: 800, color: "#0F172A", fontSize: "1.15rem" }}>
          {title}
        </Typography>
        <Typography sx={{ color: "#64748B", fontSize: "0.82rem", mt: 0.5 }}>
          {form.kind === "create"
            ? "Pick a staff member and choose their username and password. They become a clerk and can sign in."
            : form.kind === "reset"
              ? "Their old password stops working and they are signed out everywhere."
              : "You will keep using this session; use the new password next time you sign in."}
        </Typography>
      </DialogTitle>
      <DialogContent sx={{ px: 3, pt: "12px !important", display: "flex", flexDirection: "column", gap: 2 }}>
        {form.kind === "create" && (
          <>
            <Autocomplete
              options={staffOptions ?? []}
              loading={staffOptions === null}
              value={staffMember}
              onChange={(_, option) => setStaffMember(option)}
              getOptionLabel={(option) => option.name}
              getOptionKey={(option) => option.id}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              noOptionsText="No staff without a login. Add the person on the Staff page first."
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Staff Member"
                  autoFocus
                  helperText="Only active staff who do not have a login yet are listed"
                  sx={fieldSx}
                />
              )}
            />
            <TextField
              label="Username"
              fullWidth
              autoComplete="off"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              helperText="3 to 30 characters: letters, numbers, dot, dash or underscore"
              sx={fieldSx}
            />
          </>
        )}
        {form.kind === "own" && (
          <TextField
            label="Current Password"
            type={showPassword ? "text" : "password"}
            slotProps={passwordSlotProps}
            fullWidth
            autoFocus
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            sx={fieldSx}
          />
        )}
        <TextField
          label={form.kind === "create" ? "Password" : "New Password"}
          type={showPassword ? "text" : "password"}
          slotProps={passwordSlotProps}
          fullWidth
          autoFocus={form.kind === "reset"}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={passwordTooShort}
          helperText={`At least ${MIN_PASSWORD_LENGTH} characters`}
          sx={fieldSx}
        />
        <TextField
          label="Confirm Password"
          type={showPassword ? "text" : "password"}
          slotProps={passwordSlotProps}
          fullWidth
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          error={mismatch}
          helperText={mismatch ? "The two passwords do not match" : undefined}
          sx={fieldSx}
        />
        {submitError && (
          <Alert severity="error" sx={{ borderRadius: "10px" }}>
            {submitError}
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 3, pt: 1.5, gap: 1.5, "& > :not(style) ~ :not(style)": { ml: 0 } }}>
        <Button
          onClick={onClose}
          color="inherit"
          disabled={submitting}
          sx={{ fontWeight: 700, color: "#475569", borderRadius: "10px", px: 3, py: 1 }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disableElevation
          disabled={!complete || submitting}
          sx={{ fontWeight: 700, borderRadius: "10px", px: 3.5, py: 1, bgcolor: "#2563EB", "&:hover": { bgcolor: "#1D4ED8" } }}
        >
          {submitting ? <CircularProgress size={22} color="inherit" /> : form.kind === "create" ? "Create Account" : "Save Password"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
