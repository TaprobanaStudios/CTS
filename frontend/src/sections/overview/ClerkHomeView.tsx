"use client";

import * as React from "react";
import Link from "next/link";
import { Box, ButtonBase, Typography } from "@mui/material";
import PrecisionManufacturingOutlinedIcon from "@mui/icons-material/PrecisionManufacturingOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import FactoryOutlinedIcon from "@mui/icons-material/FactoryOutlined";
import ArrowOutwardRoundedIcon from "@mui/icons-material/ArrowOutwardRounded";
import CalendarTodayOutlinedIcon from "@mui/icons-material/CalendarTodayOutlined";
import { useAuth } from "@/auth/AuthContext";

// Everything a clerk does, one large button each
const ACTIONS = [
  {
    title: "Inventory",
    description: "See every material and how much is in stock.",
    href: "/dashboard/inventory",
    Icon: Inventory2OutlinedIcon,
    color: "#059669",
    tint: "#ECFDF5",
  },
  {
    title: "Material Bin Card",
    description:
      "Load or deduct material stock and view each material's ledger.",
    href: "/dashboard/bin-cards/material",
    Icon: ReceiptLongOutlinedIcon,
    color: "#D97706",
    tint: "#FFFBEB",
  },
  {
    title: "Production Bin Card",
    description: "View the stock and history of each manufactured product.",
    href: "/dashboard/bin-cards/production",
    Icon: FactoryOutlinedIcon,
    color: "#7C3AED",
    tint: "#F5F3FF",
  },
  {
    title: "Record Production",
    description: "Enter what was produced today and the materials it used.",
    href: "/dashboard/production",
    Icon: PrecisionManufacturingOutlinedIcon,
    color: "#2563EB",
    tint: "#EFF6FF",
  },
];

const todayInSriLanka = () =>
  new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Colombo",
  }).format(new Date());

export default function ClerkHomeView() {
  const { user } = useAuth();
  const [today] = React.useState(todayInSriLanka);

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: 1040,
        mx: "auto",
        pt: { xs: 1, md: 3 },
        pb: { xs: 3, md: 4 },
        // One screen tall on laptops: the cards share the space left, so the page never scrolls
        height: { md: "calc(100vh - var(--page-chrome, 48px))" },
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        gap: { xs: 3, md: 4 },
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column-reverse", sm: "row" },
          alignItems: { xs: "flex-start", sm: "flex-start" },
          justifyContent: "space-between",
          gap: { xs: 1.5, sm: 2 },
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 800,
              color: "#0F172A",
              letterSpacing: "-0.02em",
              lineHeight: 1.15,
              fontSize: { xs: "1.75rem", sm: "2.5rem" },
              overflowWrap: "anywhere",
            }}
          >
            Hello, {user.fullName}
          </Typography>
          <Typography
            sx={{
              color: "#64748B",
              mt: 0.75,
              fontSize: { xs: "0.95rem", sm: "1.05rem" },
            }}
          >
            What would you like to do?
          </Typography>
        </Box>

        {/* Today's date, top right */}
        <Box
          sx={{
            flexShrink: 0,
            display: "inline-flex",
            alignItems: "center",
            gap: 1,
            height: 40,
            px: 1.75,
            bgcolor: "#FFFFFF",
            border: "1px solid #E2E8F0",
            borderRadius: "12px",
            color: "#2563EB",
          }}
        >
          <CalendarTodayOutlinedIcon sx={{ fontSize: 17 }} />
          <Typography
            sx={{
              fontSize: "0.85rem",
              fontWeight: 600,
              color: "#334155",
              whiteSpace: "nowrap",
            }}
          >
            {today}
          </Typography>
        </Box>
      </Box>

      <Box
        sx={{
          display: "grid",
          gap: { xs: 2, md: 2.5 },
          flex: { md: "1 1 0" },
          minHeight: { md: 0 },
          // Cards stop growing on very tall screens
          maxHeight: { md: 620 },
          gridAutoRows: { md: "minmax(0, 1fr)" },
          gridTemplateColumns: {
            xs: "minmax(0, 1fr)",
            sm: "repeat(2, minmax(0, 1fr))",
          },
        }}
      >
        {ACTIONS.map((action) => (
          <ButtonBase
            key={action.href}
            component={Link}
            href={action.href}
            sx={{
              position: "relative",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              alignItems: "stretch",
              justifyContent: "space-between",
              textAlign: "left",
              gap: { xs: 3, md: 2 },
              p: { xs: 2.5, md: 3.5 },
              minHeight: { xs: 170, md: 150 },
              bgcolor: "#FFFFFF",
              border: "1px solid #E2E8F0",
              borderRadius: "24px",
              transition:
                "border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease",
              // A soft wash of the card's colour in the top corner
              "&::before": {
                content: '""',
                position: "absolute",
                top: -90,
                right: -90,
                width: 260,
                height: 260,
                borderRadius: "50%",
                bgcolor: action.tint,
                transition: "transform 0.3s ease",
              },
              "&:hover": {
                borderColor: action.color,
                transform: "translateY(-3px)",
                boxShadow: "0 16px 32px -16px rgba(15, 23, 42, 0.22)",
              },
              "&:hover::before": { transform: "scale(1.25)" },
              "&:hover .clerk-card-arrow": {
                bgcolor: action.color,
                color: "#FFFFFF",
                borderColor: action.color,
              },
              "&:focus-visible": {
                outline: `3px solid ${action.color}`,
                outlineOffset: 3,
              },
              "@media (prefers-reduced-motion: reduce)": {
                transition: "none",
                "&:hover": { transform: "none" },
                "&::before": { transition: "none" },
              },
            }}
          >
            <Box
              sx={{
                position: "relative",
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
              }}
            >
              <Box
                sx={{
                  width: { xs: 52, md: 60 },
                  height: { xs: 52, md: 60 },
                  borderRadius: "18px",
                  bgcolor: action.color,
                  color: "#FFFFFF",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: `0 10px 20px -10px ${action.color}`,
                }}
              >
                <action.Icon sx={{ fontSize: { xs: 28, md: 32 } }} />
              </Box>
              <Box
                className="clerk-card-arrow"
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  bgcolor: "#FFFFFF",
                  border: "1px solid #E2E8F0",
                  color: action.color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition:
                    "background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease",
                }}
              >
                <ArrowOutwardRoundedIcon sx={{ fontSize: 20 }} />
              </Box>
            </Box>

            <Box sx={{ position: "relative" }}>
              <Typography
                sx={{
                  fontSize: { xs: "1.25rem", md: "1.5rem" },
                  fontWeight: 700,
                  color: "#0F172A",
                  letterSpacing: "-0.01em",
                }}
              >
                {action.title}
              </Typography>
              <Typography
                sx={{
                  fontSize: { xs: "0.9rem", md: "0.95rem" },
                  color: "#64748B",
                  mt: 0.5,
                  lineHeight: 1.5,
                }}
              >
                {action.description}
              </Typography>
            </Box>
          </ButtonBase>
        ))}
      </Box>
    </Box>
  );
}
