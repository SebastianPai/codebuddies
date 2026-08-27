"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type SimpleChartPoint = {
  label: string;
  value: number;
};

const BAR_COLOR = "#facc15"; // yellow-400, mismo acento fijo que usa el resto del admin

export default function AdminSimpleChart({
  title,
  subtitle,
  points,
}: {
  title: string;
  subtitle?: string;
  points: SimpleChartPoint[];
}) {
  return (
    <section className="rounded-3xl border border-zinc-800 bg-[#111111] p-6">
      <div className="mb-5">
        <h2 className="text-xl font-black">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-zinc-500">{subtitle}</p> : null}
      </div>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={points} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="#27272a" />
            <XAxis
              dataKey="label"
              tick={{ fill: "#71717a", fontSize: 10 }}
              axisLine={{ stroke: "#27272a" }}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fill: "#71717a", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
              width={32}
            />
            <Tooltip
              cursor={{ fill: "rgba(250, 204, 21, 0.08)" }}
              contentStyle={{
                background: "#18181b",
                border: "1px solid #3f3f46",
                borderRadius: 12,
                color: "#fafafa",
                fontSize: 12,
              }}
              labelStyle={{ color: "#a1a1aa" }}
            />
            <Bar dataKey="value" fill={BAR_COLOR} radius={[6, 6, 0, 0]} maxBarSize={40} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
