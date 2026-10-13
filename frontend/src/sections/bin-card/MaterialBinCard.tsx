"use client";

import React from "react";
import { Card, CardActionArea, Box, Typography, Chip } from "@mui/material";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";

export interface MaterialItem {
  itemId: string;
  itemName: string;
  unitOfMeasure: string;
  currentStock?: number;
  lastUpdated?: string;
  isDefaultMaterial?: boolean;
}

interface MaterialBinCardProps {
  item: MaterialItem;
  onSelect: (itemId: string) => void;
}

export default function MaterialBinCard({
  item,
  onSelect,
}: MaterialBinCardProps) {
  const stock = item.currentStock ?? 0;
  const isOutOfStock = stock <= 0;

  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: "16px",
        border: "1.5px solid #E2E8F0",
        bgcolor: "#FFFFFF",
        boxShadow: "0 2px 10px rgba(15, 23, 42, 0.03)",
        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        height: "100%",
        minHeight: 220,
        display: "flex",
        flexDirection: "column",
        "&:hover": {
          transform: "translateY(-3px)",
          borderColor: "#93C5FD",
          boxShadow: "0 10px 25px -4px rgba(15, 23, 42, 0.08)",
        },
      }}
    >
      <CardActionArea
        onClick={() => onSelect(item.itemId)}
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
          {/* Top Row: Left Icon & Raw badge | Right Top Corner Unit of Measure Chip */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              mb: 1.5,
            }}
          >
            {/* Top Left: Icon & Optional Raw Material Badge */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.75,
              }}
            >
              {item.isDefaultMaterial && (
                <Chip
                  label="Raw"
                  size="small"
                  sx={{
                    height: 22,
                    fontSize: "0.6rem",
                    fontWeight: 700,
                    bgcolor: "#F1F5F9",
                    color: "#475569",
                  }}
                />
              )}
            </Box>

            {/* Top Right Corner: Unit of Measure Chip */}
            <Chip
              label={item.unitOfMeasure}
              size="small"
              sx={{
                height: 24,
                fontWeight: 700,
                fontSize: "0.6rem",
                bgcolor: "#F8FAFC",
                border: "1.5px solid #E2E8F0",
                color: "#334155",
                px: 0.5,
              }}
            />
          </Box>

          {/* Material Name Title */}
          <Typography
            variant="subtitle1"
            sx={{
              fontWeight: 800,
              color: "#0F172A",
              mb: 1.75,
              fontSize: "1rem",
              lineHeight: 1.3,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {item.itemName}
          </Typography>

          {/* Live Balance Stat Box - Moved & Aligned to the Right */}
          <Box
            sx={{
              bgcolor: "#F8FAFC",
              py: 1,
              px: 1.5,
              borderRadius: "12px",
              border: "1px solid #E2E8F0",
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              textAlign: "right",
              mb: 1.5,
            }}
          >
            <Typography
              variant="caption"
              sx={{
                color: "#64748B",
                fontWeight: 600,
                display: "block",
                fontSize: "0.6rem",
                lineHeight: 1.2,
                mb: 0.25,
                textTransform: "uppercase",
                letterSpacing: "0.03em",
              }}
            >
              Current Bin Balance
            </Typography>
            <Typography
              sx={{
                fontWeight: 800,
                fontSize: "1.25rem",
                color: isOutOfStock ? "#EF4444" : "#0F172A",
                lineHeight: 1.2,
              }}
            >
              {stock}{" "}
              <Typography
                component="span"
                sx={{
                  color: "#64748B",
                  fontWeight: 600,
                  fontSize: "0.8rem",
                }}
              >
                {item.unitOfMeasure}
              </Typography>
            </Typography>
          </Box>
        </Box>

        {/* Card Footer */}
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
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.5,
            }}
          >
            <Typography
              variant="caption"
              sx={{
                fontWeight: 700,
                color: "#2563EB",
                fontSize: "0.8rem",
              }}
            >
              Open Card
            </Typography>
            <ArrowForwardIcon sx={{ fontSize: 14, color: "#2563EB" }} />
          </Box>
        </Box>
      </CardActionArea>
    </Card>
  );
}
