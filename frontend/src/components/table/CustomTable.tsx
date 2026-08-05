"use client";

import * as React from "react";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TablePagination from "@mui/material/TablePagination";
import TableRow from "@mui/material/TableRow";
import TableSortLabel from "@mui/material/TableSortLabel";
import Box from "@mui/material/Box";

export interface CustomTableColumn {
  field: string;
  headerName: string;
  width?: number | string;
  flex?: number;
  sortable?: boolean;
  renderCell?: (params: { row: any; value: any }) => React.ReactNode;
}

interface CustomTableProps {
  columns: any[];
  rows: any[];
  loading?: boolean;
}

export default function CustomTable({ columns, rows, loading }: CustomTableProps) {
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);
  const [order, setOrder] = React.useState<"asc" | "desc">("asc");
  const [orderBy, setOrderBy] = React.useState<string>("");

  const handleRequestSort = (property: string) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  const descendingComparator = (a: any, b: any, orderBy: string) => {
    if (b[orderBy] < a[orderBy]) return -1;
    if (b[orderBy] > a[orderBy]) return 1;
    return 0;
  };

  const getComparator = (order: "asc" | "desc", orderBy: string) => {
    return order === "desc"
      ? (a: any, b: any) => descendingComparator(a, b, orderBy)
      : (a: any, b: any) => -descendingComparator(a, b, orderBy);
  };

  const sortedRows = React.useMemo(() => {
    if (!orderBy) return rows;
    return [...rows].sort(getComparator(order, orderBy));
  }, [rows, order, orderBy]);

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(+event.target.value);
    setPage(0);
  };

  return (
    <Box sx={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
      <Paper 
        elevation={0}
        sx={{ 
          width: "100%", 
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          border: "1px solid rgba(0, 0, 0, 0.06)",
          borderRadius: "16px",
          backgroundColor: "#ffffff",
          boxShadow: "0px 4px 30px rgba(0, 0, 0, 0.03)",
        }}
      >
        <TableContainer 
          sx={{ 
            flexGrow: 1, 
            overflowY: "auto", 
            backgroundColor: "#ffffff",
            "&::-webkit-scrollbar": { display: "none" },
            msOverflowStyle: "none",
            scrollbarWidth: "none",
          }}
        >
          <Table stickyHeader aria-label="custom table">
            <TableHead>
              <TableRow>
                {columns.map((column) => (
                  <TableCell
                    key={column.field}
                    sortDirection={orderBy === column.field ? order : false}
                    sx={{
                      backgroundColor: "#1a1a1a",
                      color: "rgba(255,255,255,0.7)",
                      fontWeight: 500,
                      fontSize: "0.85rem",
                      borderBottom: "none",
                      width: column.width,
                      minWidth: column.width || (column.flex ? column.flex * 100 : 120),
                    }}
                  >
                    {column.sortable !== false ? (
                      <TableSortLabel
                        active={orderBy === column.field}
                        direction={orderBy === column.field ? order : "asc"}
                        onClick={() => handleRequestSort(column.field)}
                        sx={{
                          "&.MuiTableSortLabel-root": { color: "rgba(255,255,255,0.7)", fontWeight: 500 },
                          "&.MuiTableSortLabel-active": { color: "#ffffff" },
                          "& .MuiTableSortLabel-icon": { color: "#ffffff !important" },
                        }}
                      >
                        {column.headerName}
                      </TableSortLabel>
                    ) : (
                      column.headerName
                    )}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedRows
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((row, index) => {
                  return (
                    <TableRow 
                      hover 
                      role="checkbox" 
                      tabIndex={-1} 
                      key={row.id || index}
                      sx={{
                        backgroundColor: "#ffffff",
                        "&:hover": { backgroundColor: "#f8f9fa !important" },
                      }}
                    >
                      {columns.map((column) => {
                        const value = row[column.field];
                        return (
                          <TableCell 
                            key={column.field}
                            sx={{
                              borderBottom: "1px solid rgba(0, 0, 0, 0.04)",
                              fontSize: "0.875rem",
                              color: "#333333",
                              py: 2.5,
                            }}
                          >
                            {column.renderCell ? column.renderCell({ row, value }) : value}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
      
      <Box sx={{ display: "flex", justifyContent: "flex-end", pt: 1 }}>
        <TablePagination
          rowsPerPageOptions={[10, 25, 50]}
          component="div"
          count={rows.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          sx={{
            color: "#8a8a8a",
            borderTop: "none",
            backgroundColor: "transparent",
            "& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows": {
              fontSize: "0.875rem",
            },
          }}
        />
      </Box>
    </Box>
  );
}
