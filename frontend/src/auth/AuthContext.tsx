"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";

export type UserRole = "ADMIN" | "CLERK";

export interface AuthUser {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
}

interface AuthContextValue {
  user: AuthUser;
  isAdmin: boolean;
  logout: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

const LOGIN_PATH = "/login";

/**
 * Loads the signed-in user for everything under /dashboard and sends the browser to the
 * login page when there is no valid session. The session itself is an http-only cookie
 * set by the backend, so nothing here ever holds the token.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = React.useState<AuthUser | null>(null);

  React.useEffect(() => {
    const controller = new AbortController();

    fetch("/api/auth/me", { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error("not signed in");
        return res.json();
      })
      .then((me: AuthUser) => setUser(me))
      .catch(() => {
        if (!controller.signal.aborted) router.replace(LOGIN_PATH);
      });

    return () => controller.abort();
  }, [router]);

  // A session can end while a page is open (it expired, or an admin reset the password).
  // Any API call answered with 401 then takes the user back to the login page.
  React.useEffect(() => {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      const url = typeof args[0] === "string" ? args[0] : args[0] instanceof URL ? args[0].href : args[0].url;
      if (response.status === 401 && url.includes("/api/") && !url.includes("/api/auth/")) {
        window.location.assign(`${LOGIN_PATH}?expired=1`);
      }
      return response;
    };
    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  const value = React.useMemo<AuthContextValue | null>(
    () =>
      user && {
        user,
        isAdmin: user.role === "ADMIN",
        logout: async () => {
          await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
          window.location.assign(LOGIN_PATH);
        },
      },
    [user],
  );

  if (!value) {
    return (
      <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = React.useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside the dashboard (AuthProvider)");
  return context;
}
