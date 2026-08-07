"use client";

import { createContext, useContext, useState } from "react";
import { refreshUserStats } from "../utils/auth";

interface Reward {
  xp: number;
  coins: number;
  levelUp?: boolean;
}

interface RewardContextType {
  reward: Reward | null;
  showReward: (reward: Reward) => void;
}

const RewardContext = createContext<RewardContextType | null>(null);

export function RewardProvider({ children }: { children: React.ReactNode }) {
  const [reward, setReward] = useState<Reward | null>(null);

  const showReward = (data: Reward) => {
    setReward(data);
    // El total visible en el navbar (StatsPill) se queda desactualizado
    // hasta el próximo login/recarga si no se refresca acá.
    void refreshUserStats();

    setTimeout(() => {
      setReward(null);
    }, 3500);
  };

  return (
    <RewardContext.Provider value={{ reward, showReward }}>
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
