"use client";

import * as React from "react";
import { useState, useEffect, useMemo } from "react";
import { Alert, Box, Chip, IconButton, Snackbar, Tooltip, Typography } from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import SearchBar from "../../components/search/SearchBar";
import CustomTable, { CustomTableColumn } from "@/components/table/CustomTable";
import useDebouncedValue from "@/hooks/useDebouncedValue";
import { formatDateTime } from "@/utils/datetime";

interface EditHistoryEntry {
  id: string;
  editedAt: string;
  editedBy: string;
  recordType: "STOCK_LOAD" | "STOCK_DEDUCTION" | "PRODUCTION" | "SALE";
  recordId: string;
  recordLabel: string;
  // One "Field: old → new" per value that changed
  changes: string[];
  // Why the correction was made, if a reason was given
  remark?: string | null;
}

interface HistoryPage {
  key: string;
  rows: EditHistoryEntry[];
  total: number;
}

const RECORD_TYPES: Record<EditHistoryEntry["recordType"], { label: string; color: string; bg: string }> = {
  STOCK_LOAD: { label: "Stock load", color: "#059669", bg: "#ECFDF5" },
  STOCK_DEDUCTION: { label: "Stock deduction", color: "#DC2626", bg: "#FEF2F2" },
  PRODUCTION: { label: "Production", color: "#7C3AED", bg: "#F5F3FF" },
  SALE: { label: "Sale", color: "#2563EB", bg: "#EFF6FF" },
};

const DEFAULT_ROWS_PER_PAGE = 10;
const SEARCH_DEBOUNCE_MS = 350;

export default function EditHistoryView() {
  const [history, setHistory] = useState<HistoryPage>({ key: "", rows: [], total: 0 });
  const [error, setError] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_ROWS_PER_PAGE);
  const [searchQuery, setSearchQuery] = useState("");
  const [reloadToken, setReloadToken] = useState(0);

  const debouncedSearch = useDebouncedValue(searchQuery, SEARCH_DEBOUNCE_MS);

  const query = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), size: String(rowsPerPage) });
    if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
    return params.toString();
  }, [page, rowsPerPage, debouncedSearch]);

  const requestKey = `${query}#${reloadToken}`;
  // Loading is derived: the page on screen belongs to an older request
  const loading = history.key !== requestKey;

  useEffect(() => {
    const controller = new AbortController();

    fetch(`/api/history?${query}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load the edit history");
        return res.json();
      })
      .then((data) => setHistory({ key: requestKey, rows: data.content ?? [], total: data.totalElements ?? 0 }))
      .catch((err) => {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : "Failed to load the edit history");
        setHistory((prev) => ({ ...prev, key: requestKey }));
      });

    return () => controller.abort();
  }, [query, requestKey]);

  const columns: CustomTableColumn[] = [
    {
      field: "editedAt",
      headerName: "Date & Time",
      minWidth: 180,
      sortable: false,
      renderCell: (params) => (
        <Typography sx={{ fontSize: "0.85rem", fontWeight: 600, color: "#0F172A", whiteSpace: "nowrap" }}>
          {formatDateTime(params.value)}
        </Typography>
      ),
    },
    {
      field: "editedBy",
      headerName: "Edited By",
      minWidth: 120,
      sortable: false,
      renderCell: (params) => (
        <Typography sx={{ fontSize: "0.85rem", fontWeight: 600, color: "#334155" }}>{params.value}</Typography>
      ),
    },
    {
      field: "recordType",
      headerName: "Type",
      minWidth: 150,
      sortable: false,
      mobileSlot: "badge",
      renderCell: (params) => {
        const meta = RECORD_TYPES[params.value as EditHistoryEntry["recordType"]] ?? {
          label: String(params.value),
          color: "#475569",
          bg: "#F1F5F9",
        };
        return (
          <Chip
            label={meta.label}
            size="small"
            sx={{ height: 24, fontSize: "0.74rem", fontWeight: 700, bgcolor: meta.bg, color: meta.color }}
          />
        );
      },
    },
    {
      field: "recordLabel",
      headerName: "Record",
      minWidth: 200,
      sortable: false,
      renderCell: (params) => (
        <Typography sx={{ fontSize: "0.85rem", fontWeight: 700, color: "#0F172A", overflowWrap: "anywhere" }}>
          {params.value}
        </Typography>
      ),
    },
    {
      field: "changes",
      headerName: "What Changed (old → new)",
      minWidth: 300,
      sortable: false,
      renderCell: (params) => (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25 }}>
          {(params.value as string[]).map((change, index) => {
            // "Field: old → new"
            const separator = change.indexOf(": ");
            return (
              <Typography key={index} sx={{ fontSize: "0.82rem", color: "#475569", overflowWrap: "anywhere" }}>
                <Box component="span" sx={{ fontWeight: 700, color: "#334155" }}>
                  {separator > 0 ? change.slice(0, separator + 1) : ""}
                </Box>{" "}
                {separator > 0 ? change.slice(separator + 2) : change}
              </Typography>
            );
          })}
          {params.row.remark && (
            <Typography sx={{ fontSize: "0.78rem", color: "#78716C", fontStyle: "italic", overflowWrap: "anywhere" }}>
              Reason: {params.row.remark}
            </Typography>
          )}
        </Box>
      ),
    },
  ];

  return (
    <Box
      sx={{
        width: "100%",
        // One screen tall on laptops, so the table scrolls instead of the page
        height: { xs: "auto", md: "calc(100vh - 48px)" },
        display: "flex",
        flexDirection: "column",
        gap: 2.5,
      }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
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
            Edit History
          </Typography>
          <Typography variant="body2" sx={{ color: "#64748B", mt: 0.5, fontWeight: 500 }}>
            Every correction made to a stock, production or sale entry: who changed it, when, and from what to what.
          </Typography>
        </Box>

        <Tooltip title="Refresh">
          <IconButton
            onClick={() => setReloadToken((token) => token + 1)}
            sx={{
              bgcolor: "#FFFFFF",
              border: "1px solid #E2E8F0",
              borderRadius: "10px",
              p: 1,
              color: "#475569",
              flexShrink: 0,
              "&:hover": { bgcolor: "#F8FAFC", color: "#0F172A" },
            }}
          >
            <RefreshIcon sx={{ fontSize: 20 }} />
          </IconButton>
        </Tooltip>
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

      <Box sx={{ flex: { md: "1 1 0" }, minHeight: { md: 240 } }}>
        <CustomTable
          rows={history.rows}
          columns={columns}
          loading={loading}
          toolbar={
            <SearchBar
              value={searchQuery}
              onChange={(value) => {
                setSearchQuery(value);
                setPage(0);
              }}
              placeholder="Search by material, product, stock ID, person or value..."
              maxWidth="100%"
            />
          }
          emptyMessage={searchQuery ? "No edits match this search" : "No entries have been edited yet"}
          pagination={{
            page,
            rowsPerPage,
            totalRows: history.total,
            onPageChange: setPage,
            onRowsPerPageChange: (next) => {
              setRowsPerPage(next);
              setPage(0);
            },
          }}
        />
      </Box>
    </Box>
  );
}
