"use client";

import { useEffect, useRef, useState } from "react";
import { Upload } from "lucide-react";
import { api } from "@/shared/api/client";
import { useTranslation } from "@/i18n/useTranslation";

// Sube el video de una lección a R2 (POST /uploads/video, solo admin) y
// devuelve la URL. Muestra cuánto del espacio gratis para videos va usado:
// al llenarse, la API lo rechaza y conviene usar YouTube (no listado).
export default function VideoUploadButton({ onUploaded }: { onUploaded: (url: string) => void }) {
  const t = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [usage, setUsage] = useState<{ usedMB: number; limitMB: number } | null>(null);

  useEffect(() => {
    api.get<{ usedMB: number; limitMB: number }>("/uploads/video/usage").then(setUsage).catch(() => setUsage(null));
  }, []);

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      const result = await api.post<{ url: string; usedMB: number; limitMB: number }>("/uploads/video", form);
      setUsage({ usedMB: result.usedMB, limitMB: result.limitMB });
      onUploaded(result.url);
    } catch (err: any) {
      setError(err?.message || t("admin.lessonContent.videoUploadError"));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-[rgb(var(--secondary-text))]">
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className="inline-flex items-center gap-2 rounded-lg border border-[rgb(var(--border))] px-3 py-2 font-semibold text-[rgb(var(--text))] hover:bg-[rgb(var(--border)/0.4)] disabled:opacity-50"
      >
        <Upload size={14} /> {busy ? t("admin.lessonContent.videoUploading") : t("admin.lessonContent.videoUpload")}
      </button>
      <input ref={inputRef} type="file" accept="video/mp4,video/webm" className="hidden" onChange={(event) => void upload(event.target.files?.[0])} />
      {usage && <span>{t("admin.lessonContent.videoUsage", { used: usage.usedMB, limit: usage.limitMB })}</span>}
      {error && <span className="text-red-400">{error}</span>}
    </div>
  );
}
