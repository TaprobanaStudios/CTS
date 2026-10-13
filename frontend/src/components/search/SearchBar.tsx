import React from "react";
import { TextField, InputAdornment, Tooltip, IconButton, Box } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";

export interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxWidth?: any;
}

export default function SearchBar({
  value,
  onChange,
  placeholder = "Search...",
  maxWidth = { xs: "100%", sm: 400 },
}: SearchBarProps) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        flex: 1,
        maxWidth,
      }}
    >
      <TextField
        fullWidth
        size="small"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment
                position="start"
                sx={{
                  display: "flex",
                  alignItems: "center",
                  mr: 1,
                  height: "100%",
                  maxHeight: "none",
                }}
              >
                <SearchIcon
                  sx={{
                    fontSize: 17,
                    color: value ? "#2563EB" : "#64748B",
                    display: "block",
                    transition: "color 0.2s ease",
                  }}
                />
              </InputAdornment>
            ),
            endAdornment: value ? (
              <InputAdornment position="end" sx={{ mr: 0 }}>
                <Tooltip title="Clear search">
                  <IconButton
                    size="small"
                    onClick={() => onChange("")}
                    sx={{
                      p: 0.4,
                      bgcolor: "#F1F5F9",
                      color: "#64748B",
                      "&:hover": {
                        bgcolor: "#E2E8F0",
                        color: "#0F172A",
                      },
                      transition: "all 0.15s ease",
                    }}
                  >
                    <CloseIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Tooltip>
              </InputAdornment>
            ) : null,
          },
        }}
        sx={{
          "& .MuiOutlinedInput-root": {
            bgcolor: "#FFFFFF",
            borderRadius: "12px",
            fontSize: "0.825rem",
            fontWeight: 500,
            height: 38,
            pl: 1.25,
            pr: 0.75,
            display: "flex",
            alignItems: "center",
            boxShadow: "none",
            transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
            "& fieldset": {
              borderColor: "#E2E8F0",
              borderWidth: "1.5px",
              transition: "border-color 0.2s ease",
            },
            "&:hover": {
              bgcolor: "#FFFFFF",
              "& fieldset": {
                borderColor: "#93C5FD",
                borderWidth: "1.5px",
              },
            },
            "&.Mui-focused": {
              bgcolor: "#FFFFFF",
              boxShadow: "none",
              "& fieldset": {
                borderColor: "#2563EB",
                borderWidth: "1.5px",
              },
            },
          },
          "& .MuiOutlinedInput-input": {
            p: 0,
            height: "100%",
            fontSize: "0.825rem",
            lineHeight: "1.2",
            display: "flex",
            alignItems: "center",
            "&::placeholder": {
              color: "#94A3B8",
              opacity: 1,
              fontWeight: 400,
            },
          },
        }}
      />
    </Box>
  );
}
