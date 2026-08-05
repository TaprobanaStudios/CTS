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
} from "@mui/material";
import { GridColDef } from "@mui/x-data-grid";
import AddIcon from "@mui/icons-material/Add";
import CustomTable from "@/components/table/CustomTable";

interface InventoryItem {
  itemId: string;
  itemName: string;
  unitOfMeasure: string;
  currentStock: number;
  updatedAt?: string;
}

export default function InventoryView() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

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
      setInventory(data);
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
      fetchInventory(); // refresh list
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredInventory = inventory.filter((item) =>
    item.itemName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const columns: GridColDef[] = [
    { field: "itemName", headerName: "Item Name", flex: 1, minWidth: 200 },
    { field: "unitOfMeasure", headerName: "Unit", flex: 0.5, minWidth: 100 },
    {
      field: "currentStock",
      headerName: "Current Stock",
      flex: 1,
      minWidth: 150,
      renderCell: (params) => {
        return (
          <Typography variant="body2" color={params.value < 0 ? "error" : "text.primary"} sx={{ fontWeight: 'bold' }}>
            {params.value}
          </Typography>
        );
      },
    },
    {
      field: "updatedAt",
      headerName: "Last Updated",
      flex: 1,
      minWidth: 150,
      renderCell: (params) => {
        if (!params.value) return "N/A";
        return (
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
                {new Date(params.value).toLocaleString()}
            </Typography>
        );
      },
    }
  ];

  return (
    <Box sx={{ width: "100%", height: "calc(100vh - 120px)", display: "flex", flexDirection: "column" }}>
      <Box sx={{ mb: 3, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
          Inventory Storage
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpen(true)}
          sx={{ borderRadius: "10px", py: 1 }}
        >
          Add Item
        </Button>
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

      <Box sx={{ display: "flex", mb: 3 }}>
        <TextField
          placeholder="Search by item name..."
          variant="outlined"
          size="small"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ width: 300 }}
        />
      </Box>

      <Box sx={{ flexGrow: 1, minHeight: 0 }}>
        <CustomTable
          rows={filteredInventory}
          columns={columns}
          loading={loading}
        />
      </Box>

      {/* Add Item Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: "bold" }}>Add New Item</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 3 }}>
            <TextField
              label="Item Name"
              variant="outlined"
              fullWidth
              value={newItem.name}
              onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
              placeholder="e.g. Aluminum Sheets"
            />
            <TextField
              select
              label="Unit of Measure"
              variant="outlined"
              fullWidth
              value={newItem.unitOfMeasure}
              onChange={(e) => setNewItem({ ...newItem, unitOfMeasure: e.target.value })}
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
                "ROLLS"
              ].map((unit) => (
                <MenuItem key={unit} value={unit}>
                  {unit}
                </MenuItem>
              ))}
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button onClick={() => setOpen(false)} color="inherit" sx={{ fontWeight: 600 }}>
            Cancel
          </Button>
          <Button
            onClick={handleAddItem}
            variant="contained"
            disabled={submitting || !newItem.name || !newItem.unitOfMeasure}
            sx={{ fontWeight: 600 }}
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
        <Alert severity="success" variant="filled" onClose={() => setSuccessMsg("")}>
          {successMsg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
