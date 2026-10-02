"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { refreshUserStats } from "../utils/auth";
import RewardCelebration from "../components/rewards/RewardCelebration";

interface Reward {
  xp: number;
  coins: number;
  levelUp?: boolean;
}

// Una tarjeta de celebración (ver components/rewards/RewardCelebration.tsx):
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

// Como mucho 3 tarjetas apiladas a la vez; las más viejas se descartan.
const MAX_VISIBLE = 3;

export function RewardProvider({ children }: { children: React.ReactNode }) {
  const [reward, setReward] = useState<Reward | null>(null);
  const [queue, setQueue] = useState<Celebration[]>([]);
  const counter = useRef(0);

  const celebrate = useCallback((celebration: Omit<Celebration, "id">) => {
    counter.current += 1;
    const item = { ...celebration, id: `celebration-${counter.current}` };
    setQueue((current) => [...current, item].slice(-MAX_VISIBLE));
  }, []);

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

  const dismiss = useCallback((id: string) => {
    setQueue((current) => current.filter((item) => item.id !== id));
  }, []);

  return (
    <RewardContext.Provider value={{ reward, showReward, celebrate }}>
      {children}
      <RewardCelebration items={queue} onDismiss={dismiss} />
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
