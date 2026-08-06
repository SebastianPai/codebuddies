"use client";

import { useEffect, useState } from "react";
import { AUTH_CHANGED_EVENT, getCurrentUser, logout } from "../utils/auth";
import type { User } from "../utils/auth";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem("token")?.trim();
      const userId = localStorage.getItem("userId")?.trim();
      const storedUserStr = localStorage.getItem("user");
      const hasSession =
        !!token && !!userId && userId !== "null" && userId !== "";

      setIsAuthenticated(hasSession);

      if (!hasSession) {
        setUser(null);
        setLoading(false);
        return;
      }

      if (storedUserStr) {
        try {
          const parsed = JSON.parse(storedUserStr) as User;
          if (parsed?.userId) setUser(parsed);
        } catch {
          setUser(null);
        }
      }

      const freshUser = await getCurrentUser();
      if (freshUser?.userId) {
        setUser(freshUser);
        setIsAuthenticated(true);
      }

      setLoading(false);
    };

    void initAuth();

    const handleStorage = (event: StorageEvent) => {
      if (event.key === "token" || event.key === "userId" || event.key === "user") {
        void initAuth();
      }
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener(AUTH_CHANGED_EVENT, initAuth);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(AUTH_CHANGED_EVENT, initAuth);
    };
  }, []);

  return {
    user,
    loading,
    isAuthenticated,
    logout: () => {
      logout();
      setUser(null);
      setIsAuthenticated(false);
    },
  };
}
