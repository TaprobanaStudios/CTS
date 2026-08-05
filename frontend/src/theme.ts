import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#2563EB", // Trustworthy, energetic blue for primary buttons and active states
      light: "#60A5FA",
      dark: "#1D4ED8",
      contrastText: "#ffffff",
    },
    secondary: {
      main: "#475569", // Slate gray for secondary actions, subtle icons, and neutral elements
      light: "#94A3B8",
      dark: "#334155",
      contrastText: "#ffffff",
    },
    // Status colors are critical for Inventory Systems
    success: {
      main: "#10B981", // Emerald Green: Use for "In Stock", "Shipped", "Completed"
      light: "#34D399",
      dark: "#059669",
      contrastText: "#ffffff",
    },
    warning: {
      main: "#F59E0B", // Amber: Use for "Low Stock", "Pending", "Action Required"
      light: "#FBBF24",
      dark: "#D97706",
      contrastText: "#ffffff",
    },
    error: {
      main: "#EF4444", // Red: Use for "Out of Stock", "Cancelled", "Errors"
      light: "#F87171",
      dark: "#B91C1C",
      contrastText: "#ffffff",
    },
    info: {
      main: "#0EA5E9", // Sky Blue: Use for "In Transit", "Processing"
      light: "#38BDF8",
      dark: "#0284C7",
      contrastText: "#ffffff",
    },
    background: {
      default: "#f4f3ea", // Off-white main background
      paper: "#ffffff", // Pure white for cards, modals, and tables
    },
    text: {
      primary: "#0F172A", // Near-black slate for maximum readability on data grids
      secondary: "#64748B", // Muted slate for column headers and less important text
    },
    divider: "#E2E8F0", // Clean, subtle border color for table rows
  },
  typography: {
    fontFamily: "inherit", // will use geist from layout
    h4: {
      fontWeight: 700,
      letterSpacing: "-0.02em",
      color: "#0F172A",
    },
    h5: {
      fontWeight: 700,
      letterSpacing: "-0.01em",
      color: "#0F172A",
    },
    h6: {
      fontWeight: 600,
      letterSpacing: "-0.01em",
      color: "#0F172A",
    },
    button: {
      textTransform: "none",
      fontWeight: 600,
    },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12, // Slightly sharper corners (12px instead of 16px) look more professional for enterprise tools
          boxShadow:
            "0px 1px 3px rgba(15, 23, 42, 0.08), 0px 4px 6px rgba(15, 23, 42, 0.04)", // Crisper, more modern shadow
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: "8px 16px",
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow:
            "0px 1px 3px rgba(15, 23, 42, 0.08), 0px 4px 6px rgba(15, 23, 42, 0.04)",
          border: "1px solid #E2E8F0", // Added border for cleaner separation
        },
      },
    },
    MuiBackdrop: {
      styleOverrides: {
        root: {
          backgroundColor: "rgba(15, 23, 42, 0.6)", // Matched to the slate theme
          backdropFilter: "blur(4px)", // Reduced blur slightly for better performance on large tables
          "&.MuiBackdrop-invisible": {
            backgroundColor: "transparent",
            backdropFilter: "none",
          },
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        slotProps: { inputLabel: { shrink: true } },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          position: "relative",
          transform: "none",
          fontWeight: 600,
          color: "#475569", // Use secondary text for labels
          marginBottom: "6px",
          fontSize: "0.875rem",
          "&.Mui-focused": {
            color: "#2563EB", // Match primary color on focus
          },
          "&.MuiInputLabel-shrink": {
            transform: "none",
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: "8px", // Matches buttons
          backgroundColor: "#ffffff", // Better for forms on a gray background
          "& fieldset": {
            borderColor: "#CBD5E1",
          },
          "&:hover fieldset": {
            borderColor: "#94A3B8",
          },
          "&.Mui-focused fieldset": {
            borderColor: "#2563EB",
            borderWidth: "2px", // Distinct focus state
          },
        },
        notchedOutline: {
          top: 0,
          "& legend": {
            display: "none",
            width: 0,
          },
        },
        multiline: {
          padding: 0,
        },
        input: {
          padding: "10px 14px", // Slightly tighter padding for data density
          fontSize: "0.95rem",
          color: "#0F172A",
          "&::placeholder": {
            color: "#94A3B8",
            opacity: 1,
          },
          "&:-webkit-autofill": {
            WebkitBoxShadow: "0 0 0 1000px #ffffff inset !important",
            WebkitTextFillColor: "#0F172A !important",
            borderRadius: "8px",
          },
        },
      },
    },
  },
});

export default theme;
