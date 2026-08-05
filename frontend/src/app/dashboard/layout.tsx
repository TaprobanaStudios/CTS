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

const drawerWidth = 260;

interface Props {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleLogout = () => {
    document.cookie = "auth=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    router.push("/login");
  };

  const navItems = [
    { text: "Overview", icon: <DashboardIcon />, path: "/dashboard" },
    { text: "Workers", icon: <PeopleIcon />, path: "/dashboard/workers" },
    {
      text: "Inventory",
      icon: <InventoryIcon />,
      path: "/dashboard/inventory",
    },
    {
      text: "Bin Cards",
      icon: <ReceiptLongIcon />,
      path: "/dashboard/inventory/bin",
    },
    {
      text: "Production",
      icon: <AssessmentIcon />,
      path: "/dashboard/production",
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
      <Box sx={{ p: 3, display: "flex", alignItems: "center", gap: 1 }}>
        <Typography
          variant="h5"
          sx={{ fontWeight: "bold", letterSpacing: 1, color: "white" }}
        >
          CTS
        </Typography>
      </Box>

      <List sx={{ flexGrow: 1, px: 2 }}>
        {navItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                selected={isActive}
                onClick={() => {
                  router.push(item.path);
                  setMobileOpen(false);
                }}
                sx={{
                  borderRadius: 0,
                  py: 1,
                  "&.Mui-selected": {
                    bgcolor: "rgba(255, 255, 255, 0.08)",
                    "&:hover": { bgcolor: "rgba(255, 255, 255, 0.12)" },
                  },
                  "&:hover": { bgcolor: "rgba(255, 255, 255, 0.04)" },
                }}
              >
                <ListItemIcon
                  sx={{
                    color: isActive ? "primary.main" : "rgba(255,255,255,0.7)",
                    minWidth: 40,
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
                      },
                    },
                  }}
                />
                {isActive && (
                  <Box
                    sx={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      bgcolor: "primary.main",
                    }}
                  />
                )}
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      <Box sx={{ p: 2 }}>
        <Divider sx={{ borderColor: "rgba(255,255,255,0.1)", mb: 2 }} />
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            px: 1,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Avatar
              sx={{
                width: 32,
                height: 32,
                bgcolor: "primary.main",
                color: "#1a1a1a",
                fontWeight: "bold",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                lineHeight: 1,
                fontSize: "14px",
              }}
            >
              A
            </Avatar>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              Admin User
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
          p: { xs: 2, md: 5 },
          pt: { xs: 8, md: 5 },
          width: { sm: `calc(100% - ${drawerWidth}px)` },
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
