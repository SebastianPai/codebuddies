"use client";

import { useEffect, useState } from "react";
import { getCurrentUser } from "../network/auth";

// Una sola consulta a /identity/me compartida por todos los que preguntan
// (cada tarjeta del inventario monta un selector de color: sin esto serían
// decenas de fetch iguales). El server igual valida cada color elegido; esto
// solo decide si los colores premium se ven con candado.
let cached: Promise<boolean> | null = null;

function loadIsPremium(): Promise<boolean> {
  if (!cached) {
    cached = getCurrentUser().then((user) => {
      if (!user) cached = null; // sin sesión todavía: reintentar la próxima vez
      return !!user?.isPremium;
    });
  }
  return cached;
}

export function useIsPremium(): boolean {
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void loadIsPremium().then((value) => {
      if (!cancelled) setIsPremium(value);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return isPremium;
}
