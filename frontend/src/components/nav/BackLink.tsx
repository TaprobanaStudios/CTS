"use client";

import * as React from "react";
import Link from "next/link";
import { Box, Typography } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

export interface Crumb {
  label: string;
  // Give `href` for a page link, or `onClick` when going back only changes what the page shows
  href?: string;
  onClick?: () => void;
}

interface BackLinkProps {
  // The pages above this one, outermost first; each is a link back to it
  trail: Crumb[];
  // Name of the page the user is on, shown last
  current: string;
  // Height of the line it sits in; the links are 24px tall and stay at the top
  height?: number;
}

const linkSx = {
  display: "inline-flex",
  alignItems: "center",
  gap: 0.75,
  height: 24,
  p: 0,
  border: 0,
  bgcolor: "transparent",
  cursor: "pointer",
  font: "inherit",
  fontSize: "0.875rem",
  fontWeight: 600,
  color: "#2563EB",
  textDecoration: "none",
  borderRadius: "6px",
  whiteSpace: "nowrap",
  "&:hover": { textDecoration: "underline" },
  "&:focus-visible": { outline: "2px solid #2563EB", outlineOffset: 2 },
};

const separatorSx = { lineHeight: "24px", fontSize: "0.875rem", color: "#CBD5E1" };

/** The one way back used on every page: the pages above this one as links, then this page's name. */
export default function BackLink({ trail, current, height = 24 }: BackLinkProps) {
  return (
    <Box
      component="nav"
      aria-label="Breadcrumb"
      sx={{ height, minWidth: 0, display: "flex", alignItems: "flex-start", gap: 1 }}
    >
      {trail.map((crumb, index) => {
        const content = (
          <>
            {index === 0 && <ArrowBackIcon sx={{ fontSize: 18 }} />}
            {crumb.label}
          </>
        );
        return (
          <React.Fragment key={crumb.label}>
            {crumb.href ? (
              <Box component={Link} href={crumb.href} sx={linkSx}>
                {content}
              </Box>
            ) : (
              <Box component="button" type="button" onClick={crumb.onClick} sx={linkSx}>
                {content}
              </Box>
            )}
            <Typography aria-hidden sx={separatorSx}>
              /
            </Typography>
          </React.Fragment>
        );
      })}
      <Typography
        noWrap
        aria-current="page"
        sx={{ lineHeight: "24px", fontSize: "0.875rem", fontWeight: 500, color: "#64748B" }}
      >
        {current}
      </Typography>
    </Box>
  );
}
