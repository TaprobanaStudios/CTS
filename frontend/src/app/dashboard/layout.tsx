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
  ButtonBase,
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
import ManageAccountsOutlinedIcon from "@mui/icons-material/ManageAccountsOutlined";
import BackLink from "@/components/nav/BackLink";
import { AuthProvider, useAuth } from "@/auth/AuthContext";

import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import Collapse from "@mui/material/Collapse";

const adminDrawerWidth = 200;
// A clerk's sidebar holds only the logo and Log out, so it is a narrow strip
const clerkDrawerWidth = 84;

interface Props {
  children: React.ReactNode;
}

// The sidebar and page frame, shared by both roles; a clerk's sidebar has only the name and Log out
function SidebarShell({ children }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout, isAdmin } = useAuth();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [openSubmenus, setOpenSubmenus] = React.useState<
    Record<string, boolean>
  >({
    "Bin Cards": true,
  });

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const toggleSubmenu = (text: string) => {
    setOpenSubmenus((prev) => ({
      ...prev,
      [text]: !prev[text],
    }));
  };

  const allNavItems = [
    { text: "Overview", icon: <DashboardIcon sx={{ fontSize: 20 }} />, path: "/dashboard" },
    { text: "Staff", icon: <PeopleIcon sx={{ fontSize: 20 }} />, path: "/dashboard/workers" },
    {
      text: "Login Accounts",
      icon: <ManageAccountsOutlinedIcon sx={{ fontSize: 20 }} />,
      path: "/dashboard/users",
    },
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
  // Clerks move around from their home page and the breadcrumb, not from a menu
  const navItems = isAdmin ? allNavItems : [];
  const drawerWidth = isAdmin ? adminDrawerWidth : clerkDrawerWidth;

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
      <Box
        sx={{ p: 2, px: isAdmin ? 2.5 : 1, display: "flex", alignItems: "center", justifyContent: isAdmin ? "flex-start" : "center", gap: 1 }}
      >
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
          {isAdmin ? (
            <>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
                <Avatar
                  sx={{
                    flexShrink: 0,
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
                  {user.fullName.charAt(0).toUpperCase()}
                </Avatar>
                <Typography variant="body2" noWrap sx={{ fontWeight: 500, fontSize: "0.8rem" }}>
                  {user.fullName}
                </Typography>
              </Box>
              <IconButton
                size="small"
                aria-label="Log out"
                onClick={logout}
                sx={{ color: "rgba(255,255,255,0.7)" }}
              >
                <LogoutIcon fontSize="small" />
              </IconButton>
            </>
          ) : (
            <ButtonBase
              onClick={logout}
              sx={{
                width: "100%",
                py: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 0.5,
                borderRadius: "8px",
                color: "rgba(255,255,255,0.8)",
                "&:hover": { bgcolor: "rgba(255, 255, 255, 0.08)", color: "#fff" },
                "&:focus-visible": { outline: "2px solid #60A5FA", outlineOffset: 2 },
              }}
            >
              <LogoutIcon fontSize="small" />
              <Typography sx={{ fontSize: "0.72rem", fontWeight: 600 }}>Log out</Typography>
            </ButtonBase>
          )}
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

// The only pages a clerk works with; anything else sends them back to their home page
const CLERK_PAGES = [
  { path: "/dashboard/production", name: "Record Production" },
  { path: "/dashboard/inventory", name: "Inventory" },
  { path: "/dashboard/bin-cards/material", name: "Material Bin Card" },
  { path: "/dashboard/bin-cards/production", name: "Production Bin Card" },
];
// The breadcrumb line above each clerk page, with the gap under it
const clerkBackRowHeight = 40;

// What a clerk's page area adds: only their own pages open, with a breadcrumb back to Home
function ClerkContent({ children }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  const isHome = pathname === "/dashboard";
  const currentPage = CLERK_PAGES.find((page) => pathname === page.path || pathname.startsWith(`${page.path}/`));
  const allowed = isHome || currentPage !== undefined;

  React.useEffect(() => {
    if (!allowed) router.replace("/dashboard");
  }, [allowed, router]);

  return (
    <Box
      sx={{
        // The breadcrumb line and the padding above and below the page
        "--page-chrome": `${48 + (isHome ? 0 : clerkBackRowHeight)}px`,
        // A ledger shows its own, longer breadcrumb: show only that one
        "&:has([data-own-back])": {
          "--page-chrome": "48px",
          '& > nav[aria-label="Breadcrumb"]': { display: "none" },
        },
      }}
    >
      {currentPage && (
        <BackLink trail={[{ label: "Home", href: "/dashboard" }]} current={currentPage.name} height={clerkBackRowHeight} />
      )}
      {allowed ? children : null}
    </Box>
  );
}

function Shell({ children }: Props) {
  const { isAdmin } = useAuth();
  return <SidebarShell>{isAdmin ? children : <ClerkContent>{children}</ClerkContent>}</SidebarShell>;
}

export default function DashboardLayout({ children }: Props) {
  return (
    <AuthProvider>
      <Shell>{children}</Shell>
    </AuthProvider>
  );
}
