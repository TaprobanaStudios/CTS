"use client";

import * as React from "react";
import { useState, useEffect } from "react";
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
  Stack,
} from "@mui/material";
import { GridColDef } from "@mui/x-data-grid";
import CustomTable from "@/components/table/CustomTable";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import { z } from "zod";

const transactionSchema = z.object({
  amount: z
    .number()
    .positive("Amount must be greater than 0"),
  authorizedBy: z.string().min(1, "Authorized By Name is required"),
  remarks: z.string().min(1, "Remarks are required"),
});

interface Item {
  itemId: string;
  itemName: string;
  unitOfMeasure: string;
}

interface InventoryLog {
  id: string;
  transactionDate: string;
  openingStock: number;
  qtyIn: number;
  qtyOut: number;
  closingStock: number;
  authorizedBy: string;
  remarks: string;
  item?: {
    id: string;
    name: string;
    unitOfMeasure: string;
  };
}

export default function BinView() {
  const [items, setItems] = useState<Item[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [logs, setLogs] = useState<InventoryLog[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Modals state
  const [loadOpen, setLoadOpen] = useState(false);
  const [deductOpen, setDeductOpen] = useState(false);
  const [transactionItemId, setTransactionItemId] = useState<string>("");
  const [amount, setAmount] = useState("");
  const [authorizedBy, setAuthorizedBy] = useState("");
  const [remarks, setRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<{
    amount?: string;
    authorizedBy?: string;
    remarks?: string;
  }>({});

  useEffect(() => {
    // Fetch all items for the dropdown
    const fetchItems = async () => {
      try {
        const res = await fetch("/api/inventory/current");
        if (!res.ok) throw new Error("Failed to fetch items");
        const data = await res.json();
        setItems(data);
      } catch (err: any) {
        setError("Failed to load items: " + err.message);
      }
    };
    fetchItems();
  }, []);

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      try {
        const url = selectedItemId
          ? `/api/inventory/bin/${selectedItemId}`
          : "/api/inventory/bin/all";
        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to fetch bin logs");
        const data = await res.json();
        setLogs(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, [selectedItemId]);

  const handleTransaction = async (type: "load" | "deduct") => {
    setFormErrors({});
    setError("");

    const parsed = transactionSchema.safeParse({
      amount: amount === "" ? undefined : Number(amount),
      authorizedBy: authorizedBy.trim(),
      remarks: remarks.trim(),
    });

    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      setFormErrors({
        amount: fieldErrors.amount?.[0],
        authorizedBy: fieldErrors.authorizedBy?.[0],
        remarks: fieldErrors.remarks?.[0],
      });
      return;
    }

    if (!transactionItemId) {
      setError("Please select an item to load or deduct.");
      return;
    }

    const selectedItem = items.find((i) => i.itemId === transactionItemId);
    if (!selectedItem) return;

    try {
      setSubmitting(true);

      const payload = {
        itemId: selectedItem.itemId,
        itemName: selectedItem.itemName,
        amount: parsed.data.amount,
        authorizedBy: parsed.data.authorizedBy,
        remarks,
      };

      const res = await fetch(`/api/inventory/${type}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(`Failed to ${type} stock`);

      setSuccessMsg(
        `Stock ${type === "load" ? "loaded" : "deducted"} successfully!`,
      );
      setLoadOpen(false);
      setDeductOpen(false);

      // Reset form
      setAmount("");
      setAuthorizedBy("");
      setRemarks("");
      setTransactionItemId("");

      // Refresh logs by triggering the effect
      const currentSelected = selectedItemId;
      setSelectedItemId("");
      setTimeout(() => setSelectedItemId(currentSelected), 10);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const columns: GridColDef[] = [
    {
      field: "transactionDate",
      headerName: "Date",
      flex: 1,
      minWidth: 150,
      renderCell: (params) => (
        <Typography variant="body2">
          {new Date(params.value).toLocaleDateString()}
        </Typography>
      ),
    },
    {
      field: "itemName",
      headerName: "Item",
      flex: 1,
      minWidth: 120,
      renderCell: (params) => (
        <Typography variant="body2">{params.row.item?.name || "-"}</Typography>
      ),
    },
    {
      field: "openingStock",
      headerName: "Opening",
      flex: 0.5,
      minWidth: 100,
      renderCell: (params) => (
        <Typography variant="body2" color="text.secondary">
          {params.value != null ? params.value : "-"}
        </Typography>
      ),
    },
    {
      field: "qtyIn",
      headerName: "In (+)",
      flex: 0.5,
      minWidth: 100,
      renderCell: (params) => (
        <Typography
          variant="body2"
          sx={{ 
            color: params.value > 0 ? '#4caf50' : '#8a8a8a',
            fontWeight: "bold" 
          }}
        >
          {params.value > 0 ? `+${params.value}` : "-"}
        </Typography>
      ),
    },
    {
      field: "qtyOut",
      headerName: "Out (-)",
      flex: 0.5,
      minWidth: 100,
      renderCell: (params) => (
        <Typography
          variant="body2"
          sx={{ 
            color: params.value > 0 ? '#f44336' : '#8a8a8a',
            fontWeight: "bold" 
          }}
        >
          {params.value > 0 ? `-${params.value}` : "-"}
        </Typography>
      ),
    },
    {
      field: "closingStock",
      headerName: "Closing",
      flex: 0.5,
      minWidth: 100,
      renderCell: (params) => (
        <Typography variant="body2" sx={{ fontWeight: "bold" }}>
          {params.value != null ? params.value : "-"}
        </Typography>
      ),
    },
    {
      field: "authorizedBy",
      headerName: "Authorized By",
      flex: 1,
      minWidth: 150,
    },
    { field: "remarks", headerName: "Remarks", flex: 1.5, minWidth: 200 },
  ];

  const selectedItemName =
    items.find((i) => i.itemId === selectedItemId)?.itemName || "Item";

  return (
    <Box
      sx={{
        width: "100%",
        height: "calc(100vh - 120px)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box
        sx={{
          mb: 3,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography variant="h4" sx={{ fontWeight: "bold" }}>
          Bin Card Viewer
        </Typography>

        <Stack direction="row" spacing={2}>
          <Button
            variant="contained"
            color="success"
            startIcon={<AddIcon />}
            onClick={() => {
              setTransactionItemId(selectedItemId);
              setLoadOpen(true);
            }}
            sx={{ borderRadius: "10px" }}
          >
            Load Stock
          </Button>
          <Button
            variant="contained"
            color="error"
            startIcon={<RemoveIcon />}
            onClick={() => {
              setTransactionItemId(selectedItemId);
              setDeductOpen(true);
            }}
            sx={{ borderRadius: "10px" }}
          >
            Deduct Stock
          </Button>
        </Stack>
      </Box>

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

      <Box sx={{ mb: 3, width: 400 }}>
        <TextField
          select
          label="Select Item to View Bin"
          fullWidth
          value={selectedItemId}
          onChange={(e) => setSelectedItemId(e.target.value)}
        >
          <MenuItem value="">
            <em>All Items</em>
          </MenuItem>
          {items.map((item) => (
            <MenuItem key={item.itemId} value={item.itemId}>
              {item.itemName} ({item.unitOfMeasure})
            </MenuItem>
          ))}
        </TextField>
      </Box>

      <Box sx={{ flexGrow: 1, minHeight: 0 }}>
        <CustomTable rows={logs} columns={columns} loading={loading} />
      </Box>

      {/* Transaction Modal (Load or Deduct) */}
      <Dialog
        open={loadOpen || deductOpen}
        onClose={() => {
          setLoadOpen(false);
          setDeductOpen(false);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: "bold" }}>
          {loadOpen ? "Load Stock" : "Deduct Stock"}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 3 }}>
            <TextField
              select
              label="Select Item"
              fullWidth
              value={transactionItemId}
              onChange={(e) => setTransactionItemId(e.target.value)}
            >
              <MenuItem value="" disabled>
                <em>Select an item</em>
              </MenuItem>
              {items.map((item) => (
                <MenuItem key={item.itemId} value={item.itemId}>
                  {item.itemName} ({item.unitOfMeasure})
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Amount"
              type="number"
              variant="outlined"
              fullWidth
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              error={!!formErrors.amount}
              helperText={formErrors.amount || "Enter the quantity of the item"}
            />
            <TextField
              label="Authorized By (Name)"
              variant="outlined"
              fullWidth
              value={authorizedBy}
              onChange={(e) => setAuthorizedBy(e.target.value)}
              error={!!formErrors.authorizedBy}
              helperText={
                formErrors.authorizedBy || "Name of the supervisor/manager"
              }
            />
            <TextField
              label="Remarks"
              variant="outlined"
              fullWidth
              multiline
              rows={3}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              error={!!formErrors.remarks}
              helperText={
                formErrors.remarks ||
                "e.g. Delivery from Supplier XYZ or Used for special project"
              }
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button
            onClick={() => {
              setLoadOpen(false);
              setDeductOpen(false);
            }}
            color="inherit"
            sx={{ fontWeight: 600 }}
          >
            Cancel
          </Button>
          <Button
            onClick={() => handleTransaction(loadOpen ? "load" : "deduct")}
            variant="contained"
            color={loadOpen ? "success" : "error"}
            disabled={submitting || !amount || !transactionItemId}
            sx={{ fontWeight: 600 }}
          >
            {submitting
              ? "Processing..."
              : loadOpen
                ? "Load Stock"
                : "Deduct Stock"}
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
