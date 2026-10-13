"use client";

import { useAuth } from "@/auth/AuthContext";
import OverviewView from "./OverviewView";
import ClerkHomeView from "./ClerkHomeView";

// Admins get the full dashboard; clerks get a simple page of large buttons
export default function DashboardHome() {
  const { isAdmin } = useAuth();
  return isAdmin ? <OverviewView /> : <ClerkHomeView />;
}
