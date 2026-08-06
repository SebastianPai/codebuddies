"use client";

const styles: Record<string, string> = {
  PENDING: "border-amber-400/40 bg-amber-400/15 text-amber-200",
  VALIDATED: "border-emerald-400/40 bg-emerald-400/15 text-emerald-200",
  FRAUD: "border-red-400/40 bg-red-400/15 text-red-200",
  REVOKED: "border-zinc-500/40 bg-zinc-500/15 text-zinc-200",
  REJECTED: "border-orange-400/40 bg-orange-400/15 text-orange-200",
  GRANTED: "border-sky-400/40 bg-sky-400/15 text-sky-200",
};

export default function ReferralStatusBadge({
  status,
  compact = false,
}: {
  status: string;
  compact?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 font-bold uppercase tracking-wide ${
        compact ? "text-[10px]" : "text-xs"
      } ${styles[status] ?? "border-zinc-700 bg-zinc-800/70 text-zinc-200"}`}
    >
      {status}
    </span>
  );
}
