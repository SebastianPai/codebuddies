"use client";

import { useCallback, useEffect, useState } from "react";
import { HardDrive, RotateCw, Video } from "lucide-react";
import { api } from "../../utils/api";
import { useTranslation } from "../../src/i18n/useTranslation";

type StorageUsage = {
  totalBytes: number;
  totalLimitBytes: number;
  objects: number;
  videoBytes: number;
  videoLimitBytes: number;
  folders: { name: string; bytes: number; objects: number }[];
  checkedAt: string;
};

const GB = 1024 * 1024 * 1024;
const MB = 1024 * 1024;

function formatBytes(bytes: number) {
  return bytes >= GB ? `${(bytes / GB).toFixed(2)} GB` : `${(bytes / MB).toFixed(1)} MB`;
}

// Verde hasta 70 %, amarillo hasta 90 %, rojo después: avisa antes de llenarse.
function tone(percent: number) {
  if (percent >= 90) return { bar: "bg-red-500", text: "text-red-400" };
  if (percent >= 70) return { bar: "bg-yellow-400", text: "text-yellow-300" };
  return { bar: "bg-emerald-500", text: "text-emerald-400" };
}

function Meter({
  icon,
  label,
  used,
  limit,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  used: number;
  limit: number;
  hint: string;
}) {
  const percent = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  const c = tone(percent);
  return (
    <div className="rounded-lg border border-zinc-800 bg-black/30 p-5">
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-sm font-bold text-zinc-300">
          {icon} {label}
        </span>
        <span className={`text-sm font-black ${c.text}`}>{percent.toFixed(1)} %</span>
      </div>
      <div
        className="mt-3 h-3 overflow-hidden rounded-full bg-zinc-800"
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={limit}
        aria-valuenow={used}
      >
        <div className={`h-full rounded-full ${c.bar} transition-[width] duration-700`} style={{ width: `${percent}%` }} />
      </div>
      <p className="mt-2 text-xs text-zinc-400">
        {formatBytes(used)} / {formatBytes(limit)} · {hint}
      </p>
    </div>
  );
}

export default function StorageMeters() {
  const t = useTranslation();
  const [data, setData] = useState<StorageUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async (refresh = false) => {
    setLoading(true);
    setError(false);
    try {
      setData(await api.get<StorageUsage>(`/uploads/usage${refresh ? "?refresh=1" : ""}`));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const free = data ? Math.max(0, data.totalLimitBytes - data.totalBytes) : 0;

  return (
    <section className="rounded-lg border border-zinc-800 bg-[#111] p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black">{t("admin.storageTitle")}</h2>
          <p className="text-sm text-zinc-400">{t("admin.storageDescription")}</p>
        </div>
        <button
          type="button"
          onClick={() => void load(true)}
          disabled={loading}
          className="flex items-center gap-2 rounded-full border border-zinc-700 px-4 py-2 text-sm font-bold hover:border-yellow-400 hover:text-yellow-400 disabled:opacity-50"
        >
          <RotateCw size={15} className={loading ? "animate-spin" : ""} /> {t("admin.storageRefresh")}
        </button>
      </div>

      {error && <p className="text-sm text-red-400">{t("admin.storageError")}</p>}

      {data && (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <Meter
              icon={<HardDrive size={16} />}
              label={t("admin.storageTotal")}
              used={data.totalBytes}
              limit={data.totalLimitBytes}
              hint={t("admin.storageFreeLeft", { free: formatBytes(free), objects: data.objects.toLocaleString() })}
            />
            <Meter
              icon={<Video size={16} />}
              label={t("admin.storageVideos")}
              used={data.videoBytes}
              limit={data.videoLimitBytes}
              hint={t("admin.storageVideosHint")}
            />
          </div>

          <h3 className="mb-3 mt-6 text-sm font-black uppercase tracking-wide text-zinc-400">
            {t("admin.storageByFolder")}
          </h3>
          <ul className="space-y-2">
            {data.folders.map((f) => {
              const share = data.totalBytes > 0 ? (f.bytes / data.totalBytes) * 100 : 0;
              return (
                <li key={f.name} className="grid grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-3 text-sm">
                  <span className="truncate font-mono text-zinc-300" title={f.name}>{f.name}</span>
                  <span className="h-2 overflow-hidden rounded-full bg-zinc-800">
                    <span className="block h-full rounded-full bg-yellow-400/80" style={{ width: `${Math.max(share, 0.5)}%` }} />
                  </span>
                  <span className="whitespace-nowrap text-xs text-zinc-400">
                    {formatBytes(f.bytes)} · {f.objects.toLocaleString()}
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="mt-4 text-xs text-zinc-500">
            {t("admin.storageCheckedAt", { time: new Date(data.checkedAt).toLocaleTimeString() })}
          </p>
        </>
      )}
    </section>
  );
}
