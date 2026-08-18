"use client";

import { useEffect, useState } from "react";
import { initializePaddle, type Paddle } from "@paddle/paddle-js";
import { getPaddleClientToken, getPaddleEnvironment } from "@/config/paddle-catalog";

// Un solo Paddle.js inicializado por página, compartido entre todas las
// cards (Pro/Certificado/Coins) -- initializePaddle() descarga el script de
// Paddle una sola vez y cachea la instancia.
let paddlePromise: Promise<Paddle | undefined> | null = null;

function getPaddleInstancePromise(): Promise<Paddle | undefined> {
  if (!paddlePromise) {
    paddlePromise = initializePaddle({
      token: getPaddleClientToken(),
      environment: getPaddleEnvironment(),
    });
  }
  return paddlePromise;
}

export function usePaddle() {
  const [paddle, setPaddle] = useState<Paddle | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getPaddleInstancePromise()
      .then((instance) => {
        if (!cancelled) setPaddle(instance);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { paddle, error };
}
