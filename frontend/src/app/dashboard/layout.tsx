"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Box,
  CssBaseline,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Avatar,
  Divider,
  IconButton,
} from "@mui/material";
import DashboardIcon from "@mui/icons-material/Dashboard";
import PeopleIcon from "@mui/icons-material/People";
import InventoryIcon from "@mui/icons-material/Inventory";
import AssessmentIcon from "@mui/icons-material/Assessment";
import LogoutIcon from "@mui/icons-material/Logout";
import MenuIcon from "@mui/icons-material/Menu";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined";

import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import Collapse from "@mui/material/Collapse";

const drawerWidth = 200;

interface Props {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [openSubmenus, setOpenSubmenus] = React.useState<
    Record<string, boolean>
  >({
    "Bin Cards": true,
  });

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleLogout = () => {
    document.cookie = "auth=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    router.push("/login");
  };

  const toggleSubmenu = (text: string) => {
    setOpenSubmenus((prev) => ({
      ...prev,
      [text]: !prev[text],
    }));
  };

  const navItems = [
    { text: "Overview", icon: <DashboardIcon sx={{ fontSize: 20 }} />, path: "/dashboard" },
    { text: "Workers", icon: <PeopleIcon sx={{ fontSize: 20 }} />, path: "/dashboard/workers" },
    {
      text: "Inventory",
      icon: <InventoryIcon sx={{ fontSize: 20 }} />,
      path: "/dashboard/inventory",
    },
    {
      text: "Bin Cards",
      icon: <ReceiptLongIcon sx={{ fontSize: 20 }} />,
      path: "/dashboard/bin-cards",
      children: [
        { text: "Material Bin Card", path: "/dashboard/bin-cards/material" },
        {
          text: "Production Bin Card",
          path: "/dashboard/bin-cards/production",
        },
      ],
    },
    {
      text: "Production",
      icon: <AssessmentIcon sx={{ fontSize: 20 }} />,
      path: "/dashboard/production",
    },
    {
      text: "Sales",
      icon: <LocalShippingOutlinedIcon sx={{ fontSize: 20 }} />,
      path: "/dashboard/sales",
    },
    {
      text: "Edit History",
      icon: <HistoryOutlinedIcon sx={{ fontSize: 20 }} />,
      path: "/dashboard/history",
    },
  ];

  const drawer = (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        bgcolor: "#1a1a1a",
        color: "#fff",
      }}
    >
      <Box sx={{ p: 2, px: 2.5, display: "flex", alignItems: "center", gap: 1 }}>
        <Typography
          variant="h6"
          sx={{ fontWeight: "bold", letterSpacing: 1, color: "white" }}
        >
          DNS
        </Typography>
      </Box>

      <List sx={{ flexGrow: 1, px: 1 }}>
        {navItems.map((item) => {
          const hasChildren = Boolean(
            item.children && item.children.length > 0,
          );
          const isChildActive =
            hasChildren && item.children?.some((c) => pathname === c.path);
          const isActive = pathname === item.path || isChildActive;
          const isExpanded = Boolean(openSubmenus[item.text]);

          return (
            <React.Fragment key={item.text}>
              <ListItem disablePadding sx={{ mb: 0.5 }}>
                <ListItemButton
                  selected={isActive && !hasChildren}
                  onClick={() => {
                    if (hasChildren) {
                      toggleSubmenu(item.text);
                    } else {
                      router.push(item.path);
                      setMobileOpen(false);
                    }
                  }}
                  sx={{
                    borderRadius: "8px",
                    py: 0.8,
                    px: 1.2,
                    "&.Mui-selected": {
                      bgcolor: "rgba(255, 255, 255, 0.08)",
                      "&:hover": { bgcolor: "rgba(255, 255, 255, 0.12)" },
                    },
                    "&:hover": { bgcolor: "rgba(255, 255, 255, 0.04)" },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      color: isActive
                        ? "primary.main"
                        : "rgba(255,255,255,0.7)",
                      minWidth: 32,
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.text}
                    slotProps={{
                      primary: {
                        sx: {
                          fontWeight: isActive ? 600 : 400,
                          color: isActive ? "#fff" : "rgba(255,255,255,0.7)",
                          fontSize: "0.85rem",
                        },
                      },
                    }}
                  />
                  {hasChildren ? (
                    isExpanded ? (
                      <KeyboardArrowDownIcon
                        sx={{ color: "rgba(255,255,255,0.5)", fontSize: 16 }}
                      />
                    ) : (
                      <KeyboardArrowRightIcon
                        sx={{ color: "rgba(255,255,255,0.5)", fontSize: 16 }}
                      />
                    )
                  ) : (
                    isActive && (
                      <Box
                        sx={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          bgcolor: "primary.main",
                        }}
                      />
                    )
                  )}
                </ListItemButton>
              </ListItem>

              {/* Submenu List */}
              {hasChildren && (
                <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                  <Box sx={{ pl: 1, my: 0.5 }}>
                    {item.children?.map((child) => {
                      const isSubActive = pathname === child.path;

                      return (
                        <ListItemButton
                          key={child.text}
                          selected={isSubActive}
                          onClick={() => {
                            router.push(child.path);
                            setMobileOpen(false);
                          }}
                          sx={{
                            pl: 2.5,
                            py: 0.65,
                            borderRadius: "8px",
                            mb: 0.25,
                            "&.Mui-selected": {
                              bgcolor: "rgba(255, 255, 255, 0.08)",
                              "&:hover": {
                                bgcolor: "rgba(255, 255, 255, 0.12)",
                              },
                            },
                            "&:hover": {
                              bgcolor: "rgba(255, 255, 255, 0.04)",
                            },
                          }}
                        >
                          <ListItemText
                            primary={child.text}
                            slotProps={{
                              primary: {
                                sx: {
                                  fontSize: "0.78rem",
                                  fontWeight: isSubActive ? 600 : 400,
                                  color: isSubActive
                                    ? "#38bdf8"
                                    : "rgba(255,255,255,0.7)",
                                },
                              },
                            }}
                          />
                          {isSubActive && (
                            <Box
                              sx={{
                                width: 5,
                                height: 5,
                                borderRadius: "50%",
                                bgcolor: "#38bdf8",
                              }}
                            />
                          )}
                        </ListItemButton>
                      );
                    })}
                  </Box>
                </Collapse>
              )}
            </React.Fragment>
          );
        })}
      </List>

      <Box sx={{ p: 1.5 }}>
        <Divider sx={{ borderColor: "rgba(255,255,255,0.1)", mb: 1.5 }} />
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            px: 0.5,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Avatar
              sx={{
                width: 28,
                height: 28,
                bgcolor: "primary.main",
                color: "#1a1a1a",
                fontWeight: "bold",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                lineHeight: 1,
                fontSize: "12px",
              }}
            >
              A
            </Avatar>
            <Typography variant="body2" sx={{ fontWeight: 500, fontSize: "0.8rem" }}>
              Admin
            </Typography>
          </Box>
          <IconButton
            size="small"
            onClick={handleLogout}
            sx={{ color: "rgba(255,255,255,0.7)" }}
          >
            <LogoutIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box
      sx={{
        display: "flex",
        bgcolor: "background.default",
        minHeight: "100vh",
      }}
    >
      <CssBaseline />

      {/* Mobile AppBar */}
      <Box
        sx={{
          display: { sm: "none" },
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1100,
          bgcolor: "background.paper",
          p: 1,
          boxShadow: 1,
        }}
      >
        <IconButton color="inherit" onClick={handleDrawerToggle}>
          <MenuIcon />
        </IconButton>
      </Box>

      {/* Sidebar Navigation */}
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: "block", sm: "none" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: drawerWidth,
              border: "none",
              borderRadius: 0,
            },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: "none", sm: "block" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: drawerWidth,
              border: "none",
              borderRadius: 0,
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Main Content Area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, md: 3 },
          pt: { xs: 8, md: 3 },
          width: { sm: `calc(100% - ${drawerWidth}px)` },
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
