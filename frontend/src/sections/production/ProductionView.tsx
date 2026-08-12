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
  IconButton
} from "@mui/material";
import { GridColDef } from "@mui/x-data-grid";
import CustomTable from "@/components/table/CustomTable";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import { z } from "zod";

const productionSchema = z.object({
  reportDate: z.string().min(1, "Date is required"),
  workerName: z.string().min(1, "Worker is required"),
  productType: z.string().min(1, "Product type is required"),
  qtyProduced: z.number().min(1, "Must produce at least 1"),
  damages: z.number().min(0, "Cannot be negative"),
  materials: z.array(z.object({
    itemId: z.string().min(1, "Item is required"),
    amount: z.number().positive("Amount must be greater than 0")
  })).min(1, "At least one material is required")
});

interface Worker {
  id: string;
  name: string;
  type: string;
}

interface InventoryItem {
  itemId: string;
  itemName: string;
  isDefaultMaterial: boolean;
  unitOfMeasure: string;
}

interface MaterialUsageDto {
  itemId: string;
  itemName: string;
  amount: number;
}

interface ProductionItemResponseDto {
  id: string;
  reportDate: string;
  workerName: string;
  productType: string;
  qtyProduced: number;
  materials: MaterialUsageDto[];
  damages: number;
}

const DEFAULT_MATERIAL_NAMES = ["Cement", "Quarry Dust", "River Sand", "1/2 Metal", "3/4 Metal"];

export default function ProductionView() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [items, setItems] = useState<ProductionItemResponseDto[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal State
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<any>({});

  // Form Fields
  const [reportDate, setReportDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [workerName, setWorkerName] = useState("");
  const [productType, setProductType] = useState("");
  const [qtyProduced, setQtyProduced] = useState("");
  const [damages, setDamages] = useState("0");
  const [materials, setMaterials] = useState<{ itemId: string, amount: string }[]>([]);

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

  const initDefaultMaterials = (inv: InventoryItem[]) => {
    const defaults = inv.filter(i => i.isDefaultMaterial);
    setMaterials(defaults.map(d => ({ itemId: d.itemId, amount: "" })));
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [wRes, iRes] = await Promise.all([
          fetch("/api/workers"),
          fetch("/api/inventory/current")
        ]);
        if (wRes.ok) setWorkers(await wRes.json());
        if (iRes.ok) {
          const invData = await iRes.json();
          const itemsList = Array.isArray(invData) ? invData : invData.content || [];
          setInventoryItems(itemsList);
          initDefaultMaterials(itemsList);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchData();
    fetchItems();
  }, []);

  const handleOpenModal = () => {
    initDefaultMaterials(inventoryItems);
    setOpen(true);
  };

  const handleAddMaterialRow = () => {
    setMaterials([...materials, { itemId: "", amount: "" }]);
  };

  const handleRemoveMaterialRow = (index: number) => {
    const updated = [...materials];
    updated.splice(index, 1);
    setMaterials(updated);
  };

  const handleMaterialChange = (index: number, field: "itemId" | "amount", value: string) => {
    const updated = [...materials];
    updated[index][field] = value;
    setMaterials(updated);
  };

  const handleSubmit = async () => {
    setFormErrors({});
    setError("");

    const parsed = productionSchema.safeParse({
      reportDate,
      workerName,
      productType: productType.trim(),
      qtyProduced: qtyProduced === "" ? undefined : Number(qtyProduced),
      damages: damages === "" ? undefined : Number(damages),
      materials: materials.map(m => ({
        itemId: m.itemId,
        amount: m.amount === "" ? undefined : Number(m.amount)
      }))
    });

    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      const issues = parsed.error.issues;
      
      let materialsError = fieldErrors.materials?.[0];
      if (!materialsError) {
        const matIssue = issues.find(i => i.path[0] === 'materials');
        if (matIssue) materialsError = matIssue.message;
      }
      
      setFormErrors({
        reportDate: fieldErrors.reportDate?.[0],
        workerName: fieldErrors.workerName?.[0],
        productType: fieldErrors.productType?.[0],
        qtyProduced: fieldErrors.qtyProduced?.[0],
        damages: fieldErrors.damages?.[0],
        materials: materialsError,
      });
      return;
    }

    try {
      setSubmitting(true);
      
      const payload = {
        reportDate: parsed.data.reportDate,
        workerName: parsed.data.workerName,
        productionItems: [{
          productType: parsed.data.productType,
          qtyProduced: parsed.data.qtyProduced,
          damages: parsed.data.damages,
          materials: parsed.data.materials
        }]
      };

      const res = await fetch("/api/production/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to submit production item");
      
      setSuccessMsg("Production item saved successfully!");
      setOpen(false);
      
      // Reset form but keep date and worker for rapid entry
      setProductType("");
      setQtyProduced("");
      setDamages("0");
      initDefaultMaterials(inventoryItems);

      fetchItems();
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getMaterialAmount = (rowMaterials: MaterialUsageDto[], name: string) => {
    const m = rowMaterials?.find(r => r.itemName === name);
    return m ? m.amount : 0;
  };

  const getOtherMaterials = (rowMaterials: MaterialUsageDto[]) => {
    if (!rowMaterials) return "-";
    const others = rowMaterials.filter(r => !DEFAULT_MATERIAL_NAMES.includes(r.itemName));
    if (others.length === 0) return "-";
    return others.map(o => `${o.itemName}: ${o.amount}`).join(", ");
  };

  const columns: GridColDef[] = [
    { 
      field: "reportDate", 
      headerName: "Date", 
      flex: 1, 
      minWidth: 100,
      renderCell: (params) => (
        <Typography variant="body2">{new Date(params.value).toLocaleDateString()}</Typography>
      )
    },
    { field: "workerName", headerName: "Worker", flex: 1, minWidth: 120 },
    { field: "productType", headerName: "Product", flex: 1, minWidth: 150 },
    { 
      field: "qtyProduced", 
      headerName: "Qty", 
      flex: 0.8, 
      minWidth: 80,
      renderCell: (params) => (
        <Typography variant="body2" color="success.main" sx={{ fontWeight: 'bold' }}>+{params.value}</Typography>
      )
    },
    { 
      field: "damages", 
      headerName: "Damages", 
      flex: 0.8, 
      minWidth: 90,
      renderCell: (params) => (
        <Typography variant="body2" color="error.main" sx={{ fontWeight: 'bold' }}>{params.value > 0 ? params.value : "-"}</Typography>
      )
    },
    { 
      field: "cementUsed", 
      headerName: "Cement", 
      flex: 0.8, 
      minWidth: 90,
      renderCell: (params) => <Typography variant="body2">{getMaterialAmount(params.row.materials, "Cement")}</Typography>
    },
    { 
      field: "qdUsed", 
      headerName: "QD", 
      flex: 0.8, 
      minWidth: 90,
      renderCell: (params) => <Typography variant="body2">{getMaterialAmount(params.row.materials, "Quarry Dust")}</Typography>
    },
    { 
      field: "rsUsed", 
      headerName: "RS", 
      flex: 0.8, 
      minWidth: 90,
      renderCell: (params) => <Typography variant="body2">{getMaterialAmount(params.row.materials, "River Sand")}</Typography>
    },
    { 
      field: "halfMUsed", 
      headerName: "1/2 M", 
      flex: 0.8, 
      minWidth: 90,
      renderCell: (params) => <Typography variant="body2">{getMaterialAmount(params.row.materials, "1/2 Metal")}</Typography>
    },
    { 
      field: "threeQuarterMUsed", 
      headerName: "3/4 M", 
      flex: 0.8, 
      minWidth: 90,
      renderCell: (params) => <Typography variant="body2">{getMaterialAmount(params.row.materials, "3/4 Metal")}</Typography>
    },
    { 
      field: "otherMaterials", 
      headerName: "Other Materials", 
      flex: 1.5, 
      minWidth: 150,
      renderCell: (params) => <Typography variant="body2">{getOtherMaterials(params.row.materials)}</Typography>
    },
  ];

  return (
    <Box sx={{ width: "100%", height: "calc(100vh - 120px)", display: "flex", flexDirection: "column" }}>
      <Box sx={{ mb: 3, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Typography sx={{ fontWeight: 'bold' }} variant="h4">
          Daily Production Logs
        </Typography>
        
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleOpenModal}
          sx={{ borderRadius: "10px" }}
        >
          Add Production Item
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
          placeholder="Search by worker or product..."
          variant="outlined"
          size="small"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ width: 300 }}
        />
      </Box>

      <Box sx={{ flexGrow: 1, minHeight: 0 }}>
        <CustomTable
          rows={items.filter(item => 
            item.workerName.toLowerCase().includes(searchQuery.toLowerCase()) || 
            item.productType.toLowerCase().includes(searchQuery.toLowerCase())
          )}
          columns={columns}
          loading={loading}
        />
      </Box>

      {/* Add Production Item Modal */}
      <Dialog 
        open={open} 
        onClose={() => setOpen(false)} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: "bold" }}>
          Add Production Item
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(12, 1fr)' }, gap: 3 }}>
              <Box sx={{ gridColumn: { sm: 'span 6' } }}>
                <TextField
                  label="Report Date"
                  type="date"
                  fullWidth
                  variant="outlined"
                  value={reportDate}
                  onChange={(e) => setReportDate(e.target.value)}
                  error={!!formErrors.reportDate}
                  helperText={formErrors.reportDate}
                />
              </Box>
              <Box sx={{ gridColumn: { sm: 'span 6' } }}>
                <TextField
                  select
                  label="Worker Name"
                  fullWidth
                  variant="outlined"
                  value={workerName}
                  onChange={(e) => setWorkerName(e.target.value)}
                  error={!!formErrors.workerName}
                  helperText={formErrors.workerName}
                >
                  {workers.map((w) => (
                    <MenuItem key={w.id} value={w.name}>
                      {w.name} ({w.type})
                    </MenuItem>
                  ))}
                </TextField>
              </Box>

              <Box sx={{ gridColumn: { sm: 'span 6' } }}>
                <TextField
                  label="Product Type"
                  fullWidth
                  variant="outlined"
                  value={productType}
                  onChange={(e) => setProductType(e.target.value)}
                  error={!!formErrors.productType}
                  helperText={formErrors.productType}
                />
              </Box>
              <Box sx={{ gridColumn: { sm: 'span 3' } }}>
                <TextField
                  label="Qty Produced"
                  type="number"
                  fullWidth
                  variant="outlined"
                  value={qtyProduced}
                  onChange={(e) => setQtyProduced(e.target.value)}
                  error={!!formErrors.qtyProduced}
                  helperText={formErrors.qtyProduced}
                />
              </Box>
              <Box sx={{ gridColumn: { sm: 'span 3' } }}>
                <TextField
                  label="Damages"
                  type="number"
                  fullWidth
                  variant="outlined"
                  value={damages}
                  onChange={(e) => setDamages(e.target.value)}
                  error={!!formErrors.damages}
                  helperText={formErrors.damages}
                />
              </Box>

              <Box sx={{ gridColumn: '1 / -1' }}>
                <Box sx={{ mt: 1, mb: 1, display: 'flex', alignItems: 'center' }}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mr: 2, fontWeight: 'bold' }}>
                    MATERIALS USED
                  </Typography>
                  <Box sx={{ flexGrow: 1, height: '1px', bgcolor: 'divider' }} />
                </Box>
                {formErrors.materials && (
                  <Typography variant="caption" color="error">{formErrors.materials}</Typography>
                )}
              </Box>
              
              {materials.map((mat, index) => (
                <React.Fragment key={index}>
                  <Box sx={{ gridColumn: { xs: 'span 12', sm: 'span 6' } }}>
                    <TextField
                      select
                      label="Select Material"
                      fullWidth
                      variant="outlined"
                      value={mat.itemId}
                      onChange={(e) => handleMaterialChange(index, "itemId", e.target.value)}
                    >
                      {inventoryItems.map(inv => (
                        <MenuItem key={inv.itemId} value={inv.itemId}>
                          {inv.itemName}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Box>
                  <Box sx={{ gridColumn: { xs: 'span 10', sm: 'span 5' } }}>
                    <TextField
                      label="Qty Used"
                      type="number"
                      fullWidth
                      variant="outlined"
                      value={mat.amount}
                      onChange={(e) => handleMaterialChange(index, "amount", e.target.value)}
                    />
                  </Box>
                  <Box sx={{ gridColumn: { xs: 'span 2', sm: 'span 1' }, display: 'flex', alignItems: 'center' }}>
                    <IconButton color="error" onClick={() => handleRemoveMaterialRow(index)}>
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </React.Fragment>
              ))}

              <Box sx={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'center', mt: 2 }}>
                <Button variant="outlined" startIcon={<AddIcon />} onClick={handleAddMaterialRow}>
                  Add Material
                </Button>
              </Box>
            </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button onClick={() => setOpen(false)} color="inherit" sx={{ fontWeight: 600 }}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            color="primary"
            disabled={submitting}
            sx={{ fontWeight: 600 }}
          >
            {submitting ? "Saving..." : "Add Item"}
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
