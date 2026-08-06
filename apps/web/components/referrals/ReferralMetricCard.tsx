"use client";

import { motion } from "framer-motion";

export default function ReferralMetricCard({
  icon,
  label,
  value,
  helper,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  helper?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl border border-white/10 bg-[#111111] p-5"
    >
      <div className="flex items-center justify-between text-white/55">
        <span className="text-xs font-black uppercase tracking-[0.25em]">
          {label}
        </span>
        <span className="text-[#d5ff3f]">{icon}</span>
      </div>
      <p className="mt-4 text-4xl font-black tracking-tight">{value}</p>
      {helper ? <p className="mt-2 text-sm text-white/45">{helper}</p> : null}
    </motion.div>
  );
}
