"use client";

import { Inbox } from "lucide-react";

export default function ReferralEmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-dashed border-white/10 bg-[#111111] p-8 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-[#d5ff3f]">
        <Inbox size={26} />
      </div>
      <h3 className="mt-4 text-2xl font-black">{title}</h3>
      <p className="mx-auto mt-2 max-w-xl text-sm text-white/55">
        {description}
      </p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
