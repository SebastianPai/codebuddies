"use client";

import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { AUTH_CHANGED_EVENT, getCurrentUser, logout } from "../utils/auth";
import type { User } from "../utils/auth";
import { useTranslation } from "../src/i18n/useTranslation";

// A nivel de módulo (no de componente) a propósito: useAuth() se usa desde
// varios componentes a la vez (Navbar, páginas, etc.), cada uno con su
// propio efecto -- este flag es el único guard real contra mostrar el
// aviso de racha más de una vez por pestaña, sin importar cuántas
// instancias del hook resuelvan "streakJustIncreased: true" casi al mismo
// tiempo en la carga inicial.
let streakToastShown = false;

export function useAuth() {
  const t = useTranslation();
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

        if (freshUser.streakJustIncreased && !streakToastShown) {
          streakToastShown = true;
          toast(t("site.streakIncreasedToast", { count: freshUser.streak ?? 0 }));
        }
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
    // t deliberadamente afuera: no querémos re-disparar todo initAuth() (y
    // volver a pegarle a /identity/me) solo porque cambió el idioma -- el
    // toast de racha es un evento único por sesión, usar el t del montaje
    // alcanza.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
