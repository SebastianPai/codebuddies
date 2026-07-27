"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { ApiException } from "@/shared/api";
import { dashboardService } from "../services/dashboard-service";
import type { DashboardUser, ReferralOverview } from "../types/dashboard";

type LoadStatus = "loading" | "error" | "ready";

export function useDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<DashboardUser | null>(null);
  const [userStatus, setUserStatus] = useState<LoadStatus>("loading");
  const [referrals, setReferrals] = useState<ReferralOverview | null>(null);
  const [referralsStatus, setReferralsStatus] = useState<LoadStatus>("loading");
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    dashboardService
      .getUser()
      .then((data) => {
        if (cancelled) return;
        setUser(data);
        setUserStatus("ready");
      })
      .catch((error: ApiException) => {
        if (cancelled) return;
        // Only a real auth failure should kick the user out; a transient network
        // or server error should surface a retry instead of a silent logout.
        if (error.status === 401 || error.status === 403) {
          router.push("/login");
          return;
        }
        setUserStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [router, reloadToken]);

  useEffect(() => {
    let cancelled = false;
    dashboardService
      .getReferrals()
      .then((data) => {
        if (cancelled) return;
        setReferrals(data);
        setReferralsStatus("ready");
      })
      .catch(() => {
        if (cancelled) return;
        setReferralsStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    localStorage.removeItem("user");
    window.dispatchEvent(new Event("codebuddies:auth-changed"));
    router.push("/login");
  };

  const retry = useCallback(() => {
    setUserStatus("loading");
    setReferralsStatus("loading");
    setReloadToken((value) => value + 1);
  }, []);

  return {
    user,
    userStatus,
    referrals,
    referralsStatus,
    logout,
    retry,
    goToReferrals: () => router.push("/referrals"),
  };
}
