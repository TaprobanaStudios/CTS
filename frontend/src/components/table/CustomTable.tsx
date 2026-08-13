"use client";

import * as React from "react";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TableSortLabel from "@mui/material/TableSortLabel";
import Pagination from "@mui/material/Pagination";
import CircularProgress from "@mui/material/CircularProgress";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";

export interface CustomTableColumn {
  field: string;
  headerName: string;
  width?: number | string;
  minWidth?: number | string;
  flex?: number;
  align?: "left" | "center" | "right" | "justify" | "inherit";
  sortable?: boolean;
  renderCell?: (params: { row: any; value: any; id?: any; field?: string }) => React.ReactNode;
}

interface CustomTableProps {
  columns: any[];
  rows: any[];
  loading?: boolean;
}

export default function CustomTable({ columns, rows, loading }: CustomTableProps) {
  const [page, setPage] = React.useState(1);
  const rowsPerPage = 10;
  const [order, setOrder] = React.useState<"asc" | "desc">("asc");
  const [orderBy, setOrderBy] = React.useState<string>("");

  const handleRequestSort = (property: string) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  const descendingComparator = (a: any, b: any, orderByField: string) => {
    if (b[orderByField] < a[orderByField]) return -1;
    if (b[orderByField] > a[orderByField]) return 1;
    return 0;
  };

  const getComparator = (sortOrder: "asc" | "desc", orderByField: string) => {
    return sortOrder === "desc"
      ? (a: any, b: any) => descendingComparator(a, b, orderByField)
      : (a: any, b: any) => -descendingComparator(a, b, orderByField);
  };

  const sortedRows = React.useMemo(() => {
    if (!orderBy) return rows;
    return [...rows].sort(getComparator(order, orderBy));
  }, [rows, order, orderBy]);

  // Reset to page 1 if rows count changes and exceeds current page bounds
  React.useEffect(() => {
    if (page > Math.max(1, Math.ceil(sortedRows.length / rowsPerPage))) {
      setPage(1);
    }
  }, [sortedRows.length, page]);

  return (
    <Paper
      elevation={0}
      sx={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        bgcolor: "#FFFFFF",
        border: "1px solid #E2E8F0",
        borderRadius: "16px",
        overflow: "hidden",
        boxShadow: "none",
        minHeight: 0,
      }}
    >
      <TableContainer sx={{ flexGrow: 1, minHeight: 0 }}>
        <Table
          stickyHeader
          aria-label="custom table"
          sx={{
            "& .MuiTableCell-root": {
              borderRight: "1px solid #dfe2e6ff",
              borderBottom: "1px solid #dfe2e6ff !important",
              px: 1.5,
            },
            "& .MuiTableHead-root .MuiTableCell-root": {
              borderRight: "1px solid #dfe2e6ff",
              borderBottom: "1px solid #dfe2e6ff !important",
              borderTop: "1px solid #dfe2e6ff",
              bgcolor: "#F8FAFC",
              color: "#475569",
              fontWeight: 700,
              fontSize: "0.75rem",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              whiteSpace: "nowrap",
              py: 1.2,
              top: 0,
              zIndex: 3,
            },
          }}
        >
          <TableHead>
            <TableRow>
              {columns.map((column, colIdx) => {
                const isLast = colIdx === columns.length - 1;
                return (
                  <TableCell
                    key={column.field}
                    align={column.align || "left"}
                    sortDirection={orderBy === column.field ? order : false}
                    sx={{
                      width: column.width,
                      minWidth: column.minWidth || column.width || (column.flex ? column.flex * 120 : 120),
                      borderRight: isLast ? "none !important" : "1px solid #dfe2e6ff",
                    }}
                  >
                    {column.sortable !== false ? (
                      <TableSortLabel
                        active={orderBy === column.field}
                        direction={orderBy === column.field ? order : "asc"}
                        onClick={() => handleRequestSort(column.field)}
                        sx={{
                          "&.MuiTableSortLabel-root": { color: "#475569", fontWeight: 700 },
                          "&.MuiTableSortLabel-active": { color: "#0F172A" },
                          "& .MuiTableSortLabel-icon": { color: "#0F172A !important" },
                        }}
                      >
                        {column.headerName}
                      </TableSortLabel>
                    ) : (
                      column.headerName
                    )}
                  </TableCell>
                );
              })}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  align="center"
                  sx={{ py: 8, borderRight: "none !important" }}
                >
                  <CircularProgress size={30} />
                  <Typography variant="body2" sx={{ mt: 1.5, color: "#64748B" }}>
                    Loading records...
                  </Typography>
                </TableCell>
              </TableRow>
            ) : sortedRows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  align="center"
                  sx={{ py: 8, borderRight: "none !important" }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 1,
                    }}
                  >
                    <ReceiptLongIcon sx={{ fontSize: 40, color: "#CBD5E1" }} />
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "#334155" }}>
                      No Records Found
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            ) : (
              sortedRows
                .slice((page - 1) * rowsPerPage, (page - 1) * rowsPerPage + rowsPerPage)
                .map((row, index) => {
                  return (
                    <TableRow
                      hover
                      key={row.id || index}
                      sx={{
                        "&:hover": { bgcolor: "#F8FAFC !important" },
                        transition: "background-color 0.15s ease",
                      }}
                    >
                      {columns.map((column, colIdx) => {
                        const isLast = colIdx === columns.length - 1;
                        const value = row[column.field];
                        return (
                          <TableCell
                            key={column.field}
                            align={column.align || "left"}
                            sx={{
                              fontSize: "0.875rem",
                              color: "#334155",
                              py: 1.5,
                              px: 1.5,
                              borderRight: isLast ? "none !important" : "1px solid #dfe2e6ff",
                            }}
                          >
                            {column.renderCell
                              ? column.renderCell({ row, value, id: row.id, field: column.field })
                              : value !== undefined && value !== null
                              ? value
                              : "-"}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination Footer */}
      {!loading && sortedRows.length > 0 && (
        <Box
          sx={{
            p: 1.5,
            px: 2.5,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderTop: "1px solid #E2E8F0",
            bgcolor: "#FFFFFF",
          }}
        >
          <Typography variant="body2" sx={{ color: "#64748B", fontSize: "0.85rem" }}>
            Showing {Math.min((page - 1) * rowsPerPage + 1, sortedRows.length)} -{" "}
            {Math.min(page * rowsPerPage, sortedRows.length)} of {sortedRows.length} records
          </Typography>
          <Pagination
            count={Math.max(1, Math.ceil(sortedRows.length / rowsPerPage))}
            page={page}
            onChange={(_, p) => setPage(p)}
            shape="rounded"
            color="primary"
            size="small"
          />
        </Box>
      )}
    </Paper>
  );
}
