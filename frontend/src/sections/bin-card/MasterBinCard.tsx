"use client";

import React from "react";
import {
  Card,
  CardActionArea,
  Box,
  Typography,
  Chip,
  Avatar,
} from "@mui/material";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";

interface MasterBinCardProps {
  onSelect: () => void;
}

export default function MasterBinCard({ onSelect }: MasterBinCardProps) {
  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: "16px",
        border: "2px dashed #CBD5E1",
        bgcolor: "#FFFFFF",
        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        height: "100%",
        minHeight: 220,
        display: "flex",
        flexDirection: "column",
        "&:hover": {
          transform: "translateY(-3px)",
          borderColor: "#2563EB",
          boxShadow: "0 10px 25px -4px rgba(37, 99, 235, 0.12)",
        },
      }}
    >
      <CardActionArea
        onClick={onSelect}
        sx={{
          p: 2.25,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "stretch",
          justifyContent: "space-between",
        }}
      >
        <Box sx={{ width: "100%" }}>
          {/* Top Row: Left Icon | Right Top Corner "Global" Chip */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              mb: 1.5,
            }}
          >
            <Avatar
              sx={{
                width: 36,
                height: 36,
                borderRadius: "10px",
                bgcolor: "#EFF6FF",
                color: "#2563EB",
              }}
            >
              <Inventory2OutlinedIcon sx={{ fontSize: 20 }} />
            </Avatar>
            <Chip
              label="Global"
              size="small"
              sx={{
                fontWeight: 700,
                fontSize: "0.72rem",
                height: 24,
                bgcolor: "#F1F5F9",
                color: "#475569",
                border: "1px solid #E2E8F0",
                px: 0.5,
              }}
            />
          </Box>

          <Typography
            variant="subtitle1"
            sx={{
              fontWeight: 800,
              color: "#0F172A",
              mb: 0.75,
              fontSize: "1rem",
              lineHeight: 1.3,
            }}
          >
            All Materials Ledger
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: "#64748B",
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              mb: 1.5,
              fontSize: "0.78rem",
              lineHeight: 1.45,
            }}
          >
            Unified audit log of all incoming and outgoing inventory movements
            across all bins in the facility
          </Typography>
        </Box>

        <Box
          sx={{
            width: "100%",
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            pt: 1.25,
            borderTop: "1px solid #F1F5F9",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Typography
              variant="caption"
              sx={{
                fontWeight: 700,
                color: "#2563EB",
                fontSize: "0.8rem",
              }}
            >
              View Master
            </Typography>
            <ArrowForwardIcon sx={{ fontSize: 14, color: "#2563EB" }} />
          </Box>
        </Box>
      </CardActionArea>
    </Card>
  );
}
