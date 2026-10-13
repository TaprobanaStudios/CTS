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
import LinearProgress from "@mui/material/LinearProgress";
import Skeleton from "@mui/material/Skeleton";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import ArrowUpwardRoundedIcon from "@mui/icons-material/ArrowUpwardRounded";
import ArrowDownwardRoundedIcon from "@mui/icons-material/ArrowDownwardRounded";
import OpenInFullRoundedIcon from "@mui/icons-material/OpenInFullRounded";
import CloseFullscreenRoundedIcon from "@mui/icons-material/CloseFullscreenRounded";

export interface CustomTableColumn {
  field: string;
  headerName: string;
  width?: number | string;
  minWidth?: number | string;
  flex?: number;
  align?: "left" | "center" | "right" | "justify" | "inherit";
  sortable?: boolean;
  renderCell?: (params: { row: any; value: any; id?: any; field?: string }) => React.ReactNode;
  /**
   * Placement in the stacked card layout used on small screens. The first
   * column is always the card title; unassigned columns become label/value pairs.
   */
  mobileSlot?: "badge" | "footer" | "hidden";
}

export interface CustomTableSort {
  field: string;
  direction: "asc" | "desc";
}

export interface CustomTablePagination {
  /** Zero-based page index */
  page: number;
  rowsPerPage: number;
  totalRows: number;
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (rowsPerPage: number) => void;
}

interface CustomTableProps {
  columns: CustomTableColumn[];
  rows: any[];
  loading?: boolean;
  getRowId?: (row: any) => string | number;
  /** Rendered above the table, inside the card (filters, search, ...) */
  toolbar?: React.ReactNode;
  emptyMessage?: string;
  /** Replaces the default empty placeholder entirely */
  emptyState?: React.ReactNode;
  /** Server-side paging: `rows` is the current page and is rendered as-is */
  pagination?: CustomTablePagination;
  /** Server-side sorting: provide both to take over sorting from the table */
  sort?: CustomTableSort | null;
  onSortChange?: (sort: CustomTableSort) => void;
}

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50];
const SKELETON_ROWS = 5;

// Slim, arrow-less scrollbar so the track does not cut into the sticky header
const slimScrollbarSx = {
  "&::-webkit-scrollbar": { width: 8, height: 8 },
  "&::-webkit-scrollbar-track": { background: "transparent" },
  "&::-webkit-scrollbar-thumb": {
    backgroundColor: "#CBD5E1",
    borderRadius: 8,
    border: "2px solid transparent",
    backgroundClip: "content-box",
  },
  "&::-webkit-scrollbar-thumb:hover": { backgroundColor: "#94A3B8" },
  "&::-webkit-scrollbar-corner": { background: "transparent" },
  // Firefox has no ::-webkit-scrollbar; setting these elsewhere would disable the rules above
  "@supports not selector(::-webkit-scrollbar)": {
    scrollbarWidth: "thin",
    scrollbarColor: "#CBD5E1 transparent",
  },
};

const compactSelectSx = {
  fontSize: "0.8rem",
  fontWeight: 600,
  color: "#334155",
  borderRadius: "8px",
  // Fixed so the select and the button beside it are the same height
  height: 30,
  "& .MuiSelect-select": { py: 0, pl: 1.25, fontSize: "0.8rem" },
  "& fieldset": { borderColor: "#E2E8F0" },
};

export default function CustomTable({
  columns,
  rows,
  loading,
  getRowId,
  toolbar,
  emptyMessage = "No Records Found",
  emptyState: customEmptyState,
  pagination,
  sort,
  onSortChange,
}: CustomTableProps) {
  const [clientPage, setClientPage] = React.useState(0);
  const [clientRowsPerPage, setClientRowsPerPage] = React.useState(ROWS_PER_PAGE_OPTIONS[0]);
  const [clientSort, setClientSort] = React.useState<CustomTableSort | null>(null);

  const serverSorted = Boolean(onSortChange);
  const activeSort = serverSorted ? (sort ?? null) : clientSort;

  const applySort = (next: CustomTableSort) => {
    if (onSortChange) onSortChange(next);
    else setClientSort(next);
  };

  const handleRequestSort = (field: string) => {
    const isAsc = activeSort?.field === field && activeSort.direction === "asc";
    applySort({ field, direction: isAsc ? "desc" : "asc" });
  };

  const sortedRows = React.useMemo(() => {
    if (serverSorted || !clientSort) return rows;
    const { field, direction } = clientSort;
    const sign = direction === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      if (a[field] < b[field]) return -sign;
      if (a[field] > b[field]) return sign;
      return 0;
    });
  }, [rows, clientSort, serverSorted]);

  const rowsPerPage = pagination ? pagination.rowsPerPage : clientRowsPerPage;
  const totalRows = pagination ? pagination.totalRows : sortedRows.length;
  const pageCount = Math.max(1, Math.ceil(totalRows / rowsPerPage));
  // Clamp so a shrinking row set never leaves the table on a page that no longer exists
  const page = Math.min(pagination ? pagination.page : clientPage, pageCount - 1);

  const visibleRows = pagination
    ? sortedRows
    : sortedRows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const handlePageChange = (next: number) => {
    if (pagination) pagination.onPageChange(next);
    else setClientPage(next);
  };

  const handleRowsPerPageChange = (next: number) => {
    if (pagination) pagination.onRowsPerPageChange(next);
    else {
      setClientRowsPerPage(next);
      setClientPage(0);
    }
  };

  const rowKey = (row: any, index: number) => (getRowId ? getRowId(row) : (row.id ?? index));

  const renderValue = (column: CustomTableColumn, row: any) => {
    const value = row[column.field];
    if (column.renderCell) {
      return column.renderCell({ row, value, id: row.id, field: column.field });
    }
    return value !== undefined && value !== null ? value : "-";
  };

  const showSkeleton = Boolean(loading) && visibleRows.length === 0;
  const isEmpty = !loading && visibleRows.length === 0;
  const refreshing = Boolean(loading) && visibleRows.length > 0;

  const sortableColumns = columns.filter((column) => column.sortable !== false);
  const [titleColumn, ...otherColumns] = columns;
  const badgeColumns = otherColumns.filter((column) => column.mobileSlot === "badge");
  const footerColumns = otherColumns.filter((column) => column.mobileSlot === "footer");
  const detailColumns = otherColumns.filter((column) => !column.mobileSlot);

  // Laptop screens are short: the table can take over the whole window
  const [fullscreen, setFullscreen] = React.useState(false);

  React.useEffect(() => {
    if (!fullscreen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFullscreen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    // The page behind must not scroll: a scrollbar appearing under the fixed table makes it flicker
    const previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.documentElement.style.overflow = previousOverflow;
    };
  }, [fullscreen]);

  const emptyState = customEmptyState ?? (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 1,
        py: 8,
        px: 2,
      }}
    >
      <ReceiptLongIcon sx={{ fontSize: 40, color: "#CBD5E1" }} />
      <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "#334155" }}>
        {emptyMessage}
      </Typography>
    </Box>
  );

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
        // Covers the page, sidebar included, but stays below menus and dialogs
        ...(fullscreen && {
          position: "fixed",
          inset: 0,
          zIndex: 1250,
          borderRadius: 0,
          border: "none",
        }),
      }}
    >
      {/* Toolbar row; the fullscreen button is offered where the table layout is used */}
      <Box
        sx={{
          display: toolbar ? "flex" : { xs: "none", md: "flex" },
          alignItems: "center",
          justifyContent: "flex-end",
          gap: 1.25,
          px: { xs: 1.5, md: 2 },
          py: 1.5,
          borderBottom: "1px solid #E2E8F0",
        }}
      >
        {toolbar && <Box sx={{ flexGrow: 1, minWidth: 0 }}>{toolbar}</Box>}
        {/* Opens to the left: in the top-right corner there is no room below or beside the button */}
        <Tooltip title={fullscreen ? "Exit full screen (Esc)" : "Full screen"} placement="left">
          <IconButton
            aria-label={fullscreen ? "Exit full screen" : "Full screen"}
            onClick={() => setFullscreen((value) => !value)}
            sx={{
              display: { xs: "none", md: "inline-flex" },
              flexShrink: 0,
              width: 38,
              height: 38,
              border: "1.5px solid #E2E8F0",
              borderRadius: "12px",
              color: fullscreen ? "#2563EB" : "#475569",
              "&:hover": { bgcolor: "#EFF6FF", borderColor: "#93C5FD", color: "#2563EB" },
            }}
          >
            {fullscreen ? (
              <CloseFullscreenRoundedIcon sx={{ fontSize: 18 }} />
            ) : (
              <OpenInFullRoundedIcon sx={{ fontSize: 18 }} />
            )}
          </IconButton>
        </Tooltip>
      </Box>

      {/* Keeps its height while idle so rows do not jump when a refresh starts */}
      <Box sx={{ height: 2, flexShrink: 0 }}>
        {refreshing && <LinearProgress sx={{ height: 2 }} />}
      </Box>

      {/* Table layout: laptop and wider */}
      <TableContainer
        sx={{ display: { xs: "none", md: "block" }, flexGrow: 1, minHeight: 0, ...slimScrollbarSx }}
      >
        <Table
          stickyHeader
          aria-label="custom table"
          sx={{
            "& .MuiTableCell-root": {
              borderBottom: "1px solid #E2E8F0",
              // Column lines, on every cell but the last of a row
              borderRight: "1px solid #E2E8F0",
              px: 2,
            },
            "& .MuiTableCell-root:last-of-type": {
              borderRight: "none",
            },
            "& .MuiTableHead-root .MuiTableCell-root": {
              borderBottom: "1px solid #E2E8F0",
              bgcolor: "#F8FAFC",
              color: "#64748B",
              fontWeight: 600,
              fontSize: "0.72rem",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              whiteSpace: "nowrap",
              py: 1.25,
            },
            "& .MuiTableBody-root .MuiTableRow-root:last-of-type .MuiTableCell-root": {
              borderBottom: "none",
            },
          }}
        >
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <TableCell
                  key={column.field}
                  align={column.align || "left"}
                  sortDirection={activeSort?.field === column.field ? activeSort.direction : false}
                  sx={{
                    width: column.width,
                    minWidth: column.minWidth || column.width || (column.flex ? column.flex * 120 : 120),
                  }}
                >
                  {column.sortable !== false ? (
                    <TableSortLabel
                      active={activeSort?.field === column.field}
                      direction={activeSort?.field === column.field ? activeSort.direction : "asc"}
                      onClick={() => handleRequestSort(column.field)}
                      sx={{
                        "&.MuiTableSortLabel-root": { color: "#64748B", fontWeight: 600 },
                        "&.MuiTableSortLabel-root:hover": { color: "#0F172A" },
                        "&.Mui-active": { color: "#0F172A" },
                        "& .MuiTableSortLabel-icon": { color: "#2563EB !important", fontSize: 16 },
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
          <TableBody sx={{ opacity: refreshing ? 0.6 : 1, transition: "opacity 0.15s ease" }}>
            {showSkeleton ? (
              Array.from({ length: SKELETON_ROWS }, (_, rowIdx) => (
                <TableRow key={rowIdx}>
                  {columns.map((column) => (
                    <TableCell key={column.field} sx={{ py: 1.75 }}>
                      <Skeleton variant="text" sx={{ fontSize: "0.875rem" }} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : isEmpty ? (
              <TableRow>
                <TableCell colSpan={columns.length} align="center">
                  {emptyState}
                </TableCell>
              </TableRow>
            ) : (
              visibleRows.map((row, index) => (
                <TableRow
                  hover
                  key={rowKey(row, index)}
                  sx={{
                    "&:hover": { bgcolor: "#F8FAFC !important" },
                    transition: "background-color 0.15s ease",
                  }}
                >
                  {columns.map((column) => (
                    <TableCell
                      key={column.field}
                      align={column.align || "left"}
                      sx={{ fontSize: "0.875rem", color: "#334155", py: 1.5 }}
                    >
                      {renderValue(column, row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Stacked card layout: phones and small tablets */}
      <Box
        sx={{
          display: { xs: "flex", md: "none" },
          flexDirection: "column",
          flexGrow: 1,
          minHeight: 0,
          overflowY: "auto",
          ...slimScrollbarSx,
        }}
      >
        {sortableColumns.length > 0 && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              px: 1.5,
              py: 1,
              bgcolor: "#F8FAFC",
              borderBottom: "1px solid #E2E8F0",
            }}
          >
            <Typography
              sx={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748B", flexShrink: 0 }}
            >
              Sort by
            </Typography>
            <Select
              size="small"
              displayEmpty
              value={activeSort?.field ?? ""}
              onChange={(e) =>
                applySort({ field: e.target.value, direction: activeSort?.direction ?? "asc" })
              }
              inputProps={{ "aria-label": "Sort by" }}
              sx={{ ...compactSelectSx, flexGrow: 1, minWidth: 0 }}
            >
              {!activeSort && (
                <MenuItem value="" disabled>
                  Default
                </MenuItem>
              )}
              {sortableColumns.map((column) => (
                <MenuItem key={column.field} value={column.field} sx={{ fontSize: "0.825rem" }}>
                  {column.headerName}
                </MenuItem>
              ))}
            </Select>
            <IconButton
              size="small"
              disabled={!activeSort}
              aria-label={
                activeSort?.direction === "desc" ? "Sorted descending" : "Sorted ascending"
              }
              onClick={() => activeSort && handleRequestSort(activeSort.field)}
              sx={{
                width: 30,
                height: 30,
                border: "1px solid #E2E8F0",
                borderRadius: "8px",
                bgcolor: "#FFFFFF",
                color: "#2563EB",
              }}
            >
              {activeSort?.direction === "desc" ? (
                <ArrowDownwardRoundedIcon sx={{ fontSize: 18 }} />
              ) : (
                <ArrowUpwardRoundedIcon sx={{ fontSize: 18 }} />
              )}
            </IconButton>
          </Box>
        )}

        {showSkeleton ? (
          Array.from({ length: SKELETON_ROWS }, (_, rowIdx) => (
            <Box key={rowIdx} sx={{ p: 1.75, borderBottom: "1px solid #F1F5F9" }}>
              <Skeleton variant="text" width="55%" sx={{ fontSize: "1rem" }} />
              <Skeleton variant="text" width="85%" sx={{ fontSize: "0.8rem" }} />
            </Box>
          ))
        ) : isEmpty ? (
          emptyState
        ) : (
          <Box sx={{ opacity: refreshing ? 0.6 : 1, transition: "opacity 0.15s ease" }}>
            {visibleRows.map((row, index) => (
              <Box
                key={rowKey(row, index)}
                sx={{
                  p: 1.75,
                  display: "flex",
                  flexDirection: "column",
                  gap: 1.25,
                  borderBottom: "1px solid #F1F5F9",
                  "&:last-of-type": { borderBottom: "none" },
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: 1,
                  }}
                >
                  <Box sx={{ minWidth: 0, overflowWrap: "anywhere" }}>
                    {renderValue(titleColumn, row)}
                  </Box>
                  {badgeColumns.map((column) => (
                    <Box key={column.field} sx={{ flexShrink: 0 }}>
                      {renderValue(column, row)}
                    </Box>
                  ))}
                </Box>

                {detailColumns.length > 0 && (
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                      columnGap: 2,
                      rowGap: 1.25,
                    }}
                  >
                    {detailColumns.map((column) => (
                      <Box key={column.field} sx={{ minWidth: 0 }}>
                        <Typography
                          sx={{
                            fontSize: "0.68rem",
                            fontWeight: 600,
                            color: "#94A3B8",
                            textTransform: "uppercase",
                            letterSpacing: "0.06em",
                            mb: 0.25,
                          }}
                        >
                          {column.headerName}
                        </Typography>
                        <Box
                          sx={{ fontSize: "0.875rem", color: "#334155", overflowWrap: "anywhere" }}
                        >
                          {renderValue(column, row)}
                        </Box>
                      </Box>
                    ))}
                  </Box>
                )}

                {footerColumns.length > 0 && (
                  <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
                    {footerColumns.map((column) => (
                      <React.Fragment key={column.field}>{renderValue(column, row)}</React.Fragment>
                    ))}
                  </Box>
                )}
              </Box>
            ))}
          </Box>
        )}
      </Box>

      {/* Pagination Footer */}
      {totalRows > 0 && (
        <Box
          sx={{
            px: { xs: 1.5, md: 2 },
            py: 1.25,
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            justifyContent: "space-between",
            alignItems: "center",
            gap: 1.25,
            borderTop: "1px solid #E2E8F0",
            bgcolor: "#FFFFFF",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
            <Typography sx={{ color: "#64748B", fontSize: "0.8rem" }}>Rows per page</Typography>
            <Select
              size="small"
              value={rowsPerPage}
              onChange={(e) => handleRowsPerPageChange(Number(e.target.value))}
              inputProps={{ "aria-label": "Rows per page" }}
              sx={compactSelectSx}
            >
              {ROWS_PER_PAGE_OPTIONS.map((option) => (
                <MenuItem key={option} value={option} sx={{ fontSize: "0.825rem" }}>
                  {option}
                </MenuItem>
              ))}
            </Select>
            <Typography sx={{ color: "#64748B", fontSize: "0.8rem", whiteSpace: "nowrap" }}>
              {page * rowsPerPage + 1}–{Math.min((page + 1) * rowsPerPage, totalRows)} of {totalRows}
            </Typography>
          </Box>
          <Pagination
            count={pageCount}
            page={page + 1}
            onChange={(_, next) => handlePageChange(next - 1)}
            shape="rounded"
            color="primary"
            size="small"
          />
        </Box>
      )}
    </Paper>
  );
}
