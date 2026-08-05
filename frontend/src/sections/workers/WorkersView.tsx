"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
  Paper,
  Alert,
  IconButton,
  Snackbar,
  Chip,
} from "@mui/material";
import { GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import AddIcon from "@mui/icons-material/Add";
import { z } from "zod";
import CustomTable from "@/components/table/CustomTable";

const nicRegex = /^([0-9]{9}[vVxX]|[0-9]{12})$/;
const phoneRegex = /^(?:0|(?:\+94))[0-9]{9}$/;

const workerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  status: z.string().optional(),
  nicNumber: z
    .string()
    .min(1, "NIC is required")
    .regex(nicRegex, "Invalid Sri Lankan NIC format"),
  contactNumber: z
    .string()
    .min(1, "Contact is required")
    .regex(phoneRegex, "Invalid Sri Lankan contact number"),
  address: z.string().min(1, "Address is required"),
});

interface Worker {
  id: string;
  name: string;
  status: string;
  contactNumber?: string;
  nicNumber?: string;
  address?: string;
  startDate?: string;
}

export default function WorkersView() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const [open, setOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentWorker, setCurrentWorker] = useState<Partial<Worker>>({
    name: "",
    status: "",
    nicNumber: "",
    contactNumber: "",
    address: "",
  });
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [workerToDelete, setWorkerToDelete] = useState<Worker | null>(null);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");

  const [activateDialogOpen, setActivateDialogOpen] = useState(false);
  const [workerToActivate, setWorkerToActivate] = useState<Worker | null>(null);
  const [activateConfirmationText, setActivateConfirmationText] = useState("");

  const fetchWorkers = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/workers");
      if (!res.ok) throw new Error("Failed to fetch workers");
      const data = await res.json();
      setWorkers(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkers();
  }, []);

  const handleOpen = (worker?: Worker) => {
    if (worker) {
      setCurrentWorker(worker);
      setIsEditing(true);
    } else {
      setCurrentWorker({
        name: "",
        nicNumber: "",
        contactNumber: "",
        address: "",
      });
      setIsEditing(false);
    }
    setValidationErrors({});
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setCurrentWorker({ name: "", status: "" });
  };

  const handleSave = async () => {
    try {
      setValidationErrors({});
      const parsed = workerSchema.safeParse(currentWorker);
      if (!parsed.success) {
        const errors: Record<string, string> = {};
        for (const issue of parsed.error.issues) {
          const field = issue.path[0]?.toString();
          if (field && !errors[field]) {
            errors[field] = issue.message;
          }
        }
        setValidationErrors(errors);
        return;
      }

      const method = isEditing ? "PUT" : "POST";
      const url = isEditing
        ? `/api/workers/${currentWorker.id}`
        : "/api/workers";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(currentWorker),
      });

      if (!res.ok) throw new Error("Failed to save worker");

      handleClose();
      fetchWorkers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async () => {
    if (!workerToDelete) return;
    try {
      const res = await fetch(`/api/workers/${workerToDelete.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to deactivate worker");
      fetchWorkers();
      setDeleteDialogOpen(false);
      setWorkerToDelete(null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleActivate = async () => {
    if (!workerToActivate) return;
    try {
      const res = await fetch(`/api/workers/${workerToActivate.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...workerToActivate, status: "ACTIVE" }),
      });
      if (!res.ok) throw new Error("Failed to activate worker");
      fetchWorkers();
      setActivateDialogOpen(false);
      setWorkerToActivate(null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const columns: GridColDef[] = [
    { field: "name", headerName: "Name", width: 200 },
    { field: "nicNumber", headerName: "NIC", width: 130 },
    { field: "contactNumber", headerName: "Contact", width: 130 },
    { 
      field: "startDate", 
      headerName: "Start Date", 
      width: 180,
      renderCell: (params) => {
        if (!params.value) return "N/A";
        // Safely format array [2026, 8, 5] or string "2026-08-05" from backend
        if (Array.isArray(params.value) && params.value.length >= 3) {
          return `${params.value[0]}-${String(params.value[1]).padStart(2, '0')}-${String(params.value[2]).padStart(2, '0')}`;
        }
        return String(params.value);
      }
    },
    { field: "address", headerName: "Address", flex: 1 },
    {
      field: "status",
      headerName: "Status",
      flex: 1,
      renderCell: (params) => (
        <Chip
          label={params.value}
          size="medium"
          sx={{
            bgcolor:
              params.value === "ACTIVE"
                ? "rgba(205, 219, 50, 0.2)"
                : "rgba(0,0,0,0.05)",
            color: params.value === "ACTIVE" ? "#5a6311" : "text.secondary",
            fontWeight: "bold",
            fontSize: "0.7rem",
            height: 24,
          }}
        />
      ),
    },
    {
      field: "actions",
      headerName: "Actions",
      sortable: false,
      width: 120,
      renderCell: (params: GridRenderCellParams) => (
        <Box>
          <IconButton
            size="small"
            sx={{ color: "text.secondary", mr: 1 }}
            onClick={() => {
              if (params.row.status === "DEACTIVATED") {
                setWorkerToActivate(params.row);
                setActivateConfirmationText("");
                setActivateDialogOpen(true);
              } else {
                handleOpen(params.row);
              }
            }}
          >
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            color="error"
            onClick={() => {
              setWorkerToDelete(params.row);
              setDeleteConfirmationText("");
              setDeleteDialogOpen(true);
            }}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      ),
    },
  ];

  return (
    <Box sx={{ width: "100%", height: "calc(100vh - 120px)", display: "flex", flexDirection: "column" }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          mb: 4,
          alignItems: "center",
        }}
      >
        <Typography variant="h4" sx={{ fontWeight: "bold" }}>
          Workers Directory
        </Typography>
        <Box sx={{ display: "flex", gap: 2 }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpen()}
            sx={{ fontWeight: "bold" }}
          >
            Add Worker
          </Button>
        </Box>
      </Box>

      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError("")}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert
          onClose={() => setError("")}
          severity="error"
          variant="filled"
          sx={{ width: "100%" }}
        >
          {error}
        </Alert>
      </Snackbar>

      <Box sx={{ display: "flex", mb: 3 }}>
        <TextField
          placeholder="Search by name..."
          variant="outlined"
          size="small"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ width: 300 }}
        />
      </Box>

      <Box sx={{ flexGrow: 1, width: "100%", mt: 2, minHeight: 0 }}>
        <CustomTable
          rows={workers.filter((worker) => worker.name.toLowerCase().includes(searchQuery.toLowerCase()))}
          columns={columns}
          loading={loading}
        />
      </Box>

      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3 } } }}
      >
        <DialogTitle sx={{ fontWeight: "bold" }}>
          {isEditing ? "Edit Worker" : "Add New Worker"}
        </DialogTitle>
        <DialogContent
          dividers
          sx={{ borderBottom: "none", borderTop: "1px solid #f0f0f0" }}
        >
          <TextField
            autoFocus
            margin="normal"
            label="Worker Name"
            type="text"
            fullWidth
            variant="outlined"
            value={currentWorker.name}
            onChange={(e) =>
              setCurrentWorker({ ...currentWorker, name: e.target.value })
            }
            error={!!validationErrors.name}
            helperText={validationErrors.name}
          />
          <TextField
            margin="dense"
            label="NIC Number"
            type="text"
            fullWidth
            variant="outlined"
            value={currentWorker.nicNumber || ""}
            onChange={(e) =>
              setCurrentWorker({ ...currentWorker, nicNumber: e.target.value })
            }
            error={!!validationErrors.nicNumber}
            helperText={
              validationErrors.nicNumber || "e.g. 962311684V or 199623110684"
            }
          />
          <TextField
            margin="dense"
            label="Contact Number"
            type="text"
            fullWidth
            variant="outlined"
            value={currentWorker.contactNumber || ""}
            onChange={(e) =>
              setCurrentWorker({
                ...currentWorker,
                contactNumber: e.target.value,
              })
            }
            error={!!validationErrors.contactNumber}
            helperText={validationErrors.contactNumber || "e.g. 0771234567"}
          />
          <TextField
            margin="dense"
            label="Address"
            type="text"
            fullWidth
            multiline
            rows={2}
            variant="outlined"
            value={currentWorker.address || ""}
            onChange={(e) =>
              setCurrentWorker({ ...currentWorker, address: e.target.value })
            }
            error={!!validationErrors.address}
            helperText={validationErrors.address}
            sx={{ mb: 2 }}
          />
          {/* Status field removed as requested */}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleClose} sx={{ color: "text.secondary" }}>
            Cancel
          </Button>
          <Button onClick={handleSave} variant="contained" disableElevation>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog 
        open={deleteDialogOpen} 
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: "16px", p: 1 } } }}
      >
        <DialogTitle sx={{ fontWeight: "bold", color: "error.main" }}>
          Deactivate Worker?
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2, mt: 1 }}>
            This will mark <strong>{workerToDelete?.name}</strong> as DEACTIVATED. They will still appear in records but their status will be changed.
          </Typography>
          <Typography variant="body2" sx={{ mb: 1, fontWeight: "bold" }}>
            Please type <strong>DELETE</strong> to confirm:
          </Typography>
          <TextField
            fullWidth
            variant="outlined"
            size="small"
            value={deleteConfirmationText}
            onChange={(e) => setDeleteConfirmationText(e.target.value)}
            placeholder="DELETE"
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteDialogOpen(false)} color="inherit" sx={{ fontWeight: "bold" }}>
            Cancel
          </Button>
          <Button
            onClick={handleDelete}
            color="error"
            variant="contained"
            disabled={deleteConfirmationText !== "DELETE"}
            sx={{ fontWeight: "bold", borderRadius: "8px" }}
          >
            Deactivate
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog 
        open={activateDialogOpen} 
        onClose={() => setActivateDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: "16px", p: 1 } } }}
      >
        <DialogTitle sx={{ fontWeight: "bold", color: "success.main" }}>
          Activate Worker?
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2, mt: 1 }}>
            Do we need to activate <strong>{workerToActivate?.name}</strong> again? This will allow you to edit their data and assign tasks.
          </Typography>
          <Typography variant="body2" sx={{ mb: 1, fontWeight: "bold" }}>
            Please type <strong>YES</strong> to confirm:
          </Typography>
          <TextField
            fullWidth
            variant="outlined"
            size="small"
            value={activateConfirmationText}
            onChange={(e) => setActivateConfirmationText(e.target.value)}
            placeholder="YES"
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setActivateDialogOpen(false)} color="inherit" sx={{ fontWeight: "bold" }}>
            Cancel
          </Button>
          <Button
            onClick={handleActivate}
            color="success"
            variant="contained"
            disabled={activateConfirmationText !== "YES"}
            sx={{ fontWeight: "bold", borderRadius: "8px" }}
          >
            Activate
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
