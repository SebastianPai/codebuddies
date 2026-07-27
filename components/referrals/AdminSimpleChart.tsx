"use client";

export type SimpleChartPoint = {
  label: string;
  value: number;
};

export default function AdminSimpleChart({
  title,
  subtitle,
  points,
}: {
  title: string;
  subtitle?: string;
  points: SimpleChartPoint[];
}) {
  const max = Math.max(...points.map((point) => point.value), 1);

  return (
    <section className="rounded-3xl border border-zinc-800 bg-[#111111] p-6">
      <div className="mb-5">
        <h2 className="text-xl font-black">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-zinc-500">{subtitle}</p> : null}
      </div>
      <div className="flex h-48 items-end gap-2 overflow-hidden">
        {points.map((point) => (
          <div
            key={point.label}
            className="flex min-w-0 flex-1 flex-col items-center gap-2"
            title={`${point.label}: ${point.value}`}
          >
            <div
              className="w-full rounded-t-2xl bg-yellow-400 transition-all"
              style={{ height: `${Math.max((point.value / max) * 100, 4)}%` }}
            />
            <span className="truncate text-[10px] text-zinc-500">
              {point.label}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
