"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { refreshUserStats } from "../utils/auth";
import { useCelebrationToast } from "../components/rewards/celebration-toast";

interface Reward {
  xp: number;
  coins: number;
  levelUp?: boolean;
}

// Un aviso de celebración (ver components/rewards/celebration-toast.tsx):
// recompensas locales (lección, ejercicio, pase…) y logros que llegan en
// tiempo real (notificaciones ACHIEVEMENT_UNLOCKED, REWARD_GRANTED…).
export type Celebration = {
  id: string;
  kind: "reward" | "achievement" | "level";
  title?: string;
  subtitle?: string | null;
  xp: number;
  coins: number;
  items?: string[];
  linkLabel?: string | null;
  onOpen?: () => void;
};

interface RewardContextType {
  // Última recompensa: el navbar la usa solo para que el contador de
  // XP/coins "salte".
  reward: Reward | null;
  showReward: (reward: Reward) => void;
  celebrate: (celebration: Omit<Celebration, "id">) => void;
}

const RewardContext = createContext<RewardContextType | null>(null);

export function RewardProvider({ children }: { children: React.ReactNode }) {
  const [reward, setReward] = useState<Reward | null>(null);
  const showToast = useCelebrationToast();

  const celebrate = useCallback(
    (celebration: Omit<Celebration, "id">) => {
      // Un aviso que falla nunca debe tumbar la página: se pierde solo el aviso.
      try {
        showToast(celebration);
      } catch (error) {
        console.error("celebrate", error);
      }
    },
    [showToast],
  );

  // Solo en builds de prueba (NEXT_PUBLIC_E2E_HOOKS=1): permite disparar el
  // aviso desde un navegador automatizado para revisarlo visualmente.
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_E2E_HOOKS !== "1") return;
    (window as unknown as { __cbCelebrate?: typeof celebrate }).__cbCelebrate = celebrate;
  }, [celebrate]);

  const showReward = useCallback(
    (data: Reward) => {
      setReward(data);
      // El total visible en el navbar (StatsPill) se queda desactualizado
      // hasta el próximo login/recarga si no se refresca acá.
      void refreshUserStats();
      window.setTimeout(() => setReward(null), 3500);
      if (data.xp > 0 || data.coins > 0 || data.levelUp) {
        celebrate({ kind: data.levelUp ? "level" : "reward", xp: data.xp, coins: data.coins });
      }
    },
    [celebrate],
  );

  return (
    <RewardContext.Provider value={{ reward, showReward, celebrate }}>
      {children}
    </RewardContext.Provider>
  );
}

export function useReward() {
  const context = useContext(RewardContext);

  if (!context) {
    throw new Error("useReward must be used inside RewardProvider");
  }

  return context;
}
