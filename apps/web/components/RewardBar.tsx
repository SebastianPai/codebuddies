"use client";

import { useReward } from "../contexts/RewardContext";
import { Zap, Coins } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

export default function RewardBar() {
  const { reward } = useReward();

  return (
    <AnimatePresence>
      {reward && (
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.25 }}
          className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-black text-white px-6 py-2 rounded-full shadow-xl border border-white/10"
        >
          <div className="flex items-center gap-1 text-yellow-400 font-bold">
            <Zap size={16} />+{reward.xp} XP
          </div>

          <div className="flex items-center gap-1 text-yellow-300 font-bold">
            <Coins size={16} />+{reward.coins}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
