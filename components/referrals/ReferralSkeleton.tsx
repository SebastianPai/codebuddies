"use client";

export function ReferralPageSkeleton() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] px-4 py-8 text-white md:px-8">
      <div className="mx-auto max-w-6xl animate-pulse space-y-6">
        <div className="rounded-[32px] border border-white/10 bg-[#111111] p-8">
          <div className="h-4 w-40 rounded bg-white/10" />
          <div className="mt-4 h-12 w-80 max-w-full rounded bg-white/10" />
          <div className="mt-3 h-4 w-full max-w-2xl rounded bg-white/10" />
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="h-32 rounded-3xl bg-black/70" />
            <div className="h-32 rounded-3xl bg-black/70" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="h-36 rounded-3xl border border-white/10 bg-[#111111]"
            />
          ))}
        </div>
        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-4">
            <div className="h-52 rounded-3xl border border-white/10 bg-[#111111]" />
            <div className="h-96 rounded-3xl border border-white/10 bg-[#111111]" />
          </div>
          <div className="space-y-4">
            <div className="h-72 rounded-3xl border border-white/10 bg-[#111111]" />
            <div className="h-72 rounded-3xl border border-white/10 bg-[#111111]" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function AdminReferralsSkeleton() {
  return (
    <div className="space-y-6 p-6 text-white md:p-10">
      <div className="animate-pulse space-y-6">
        <div className="h-16 w-80 max-w-full rounded bg-white/10" />
        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-32 rounded-3xl bg-white/10" />
          ))}
        </div>
        <div className="grid gap-6 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-64 rounded-3xl bg-white/10" />
          ))}
        </div>
        <div className="h-[38rem] rounded-3xl bg-white/10" />
      </div>
    </div>
  );
}
