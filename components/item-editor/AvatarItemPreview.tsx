"use client";

import { useEffect, useState } from "react";
import CachedImage from "../shared/CachedImage";
import { useTranslation } from "../../src/i18n/useTranslation";

type AvatarItemPreviewProps = {
  itemSpriteUrl?: string | null;
  previewUrl?: string | null;
  bodies?: Array<{ id: string; label: string; imageUrl?: string; color?: string }>;
  animations?: Array<{ id: string; label: string; value: string }>;
  slot: string;
  layer?: number;
  frameWidth?: number;
  frameHeight?: number;
  framesCount?: number;
  rowIndex?: number;
  animation?: string;
  onAnimationChange?: (animation: string) => void;
};

export default function AvatarItemPreview({
  itemSpriteUrl,
  previewUrl,
  bodies,
  animations,
  slot,
  layer = 0,
  frameWidth = 64,
  frameHeight = 64,
  framesCount = 1,
  rowIndex = 0,
  animation = "idle",
  onAnimationChange,
}: AvatarItemPreviewProps) {
  const t = useTranslation();
  const fallbackBodies: NonNullable<AvatarItemPreviewProps["bodies"]> = [
    { id: "fallback", label: t("editor.bodyBaseFallback"), color: "#d8a47f" },
  ];
  const bodyOptions = bodies?.length ? bodies : fallbackBodies;
  const animationOptions = animations?.length
    ? animations
    : [{ id: "idle", label: t("items.idle"), value: "idle" }];
  const [body, setBody] = useState(bodyOptions[0].id);
  const [frame, setFrame] = useState(0);
  const bodyConfig = bodyOptions.find((item) => item.id === body) ?? bodyOptions[0];
  const source = itemSpriteUrl || previewUrl;

  useEffect(() => {
    if (!bodyOptions.some((item) => item.id === body)) {
      setBody(bodyOptions[0].id);
    }
  }, [body, bodyOptions]);

  useEffect(() => {
    if (!source || framesCount <= 1) return;
    const timer = window.setInterval(() => {
      setFrame((current) => (current + 1) % Math.max(1, framesCount));
    }, 140);
    return () => window.clearInterval(timer);
  }, [framesCount, source]);

  return (
    <div className="rounded-3xl border border-zinc-800 bg-black/50 p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-xl font-black text-white">{t("editor.avatarPreview")}</h3>
          <p className="mt-1 text-sm text-zinc-500">
            {t("editor.bodyPreview")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {bodyOptions.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setBody(item.id)}
              className={`rounded-full border px-3 py-2 text-xs font-black ${
                body === item.id
                  ? "border-yellow-400 bg-yellow-400 text-black"
                  : "border-zinc-700 bg-[#111] text-zinc-300"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-[220px_1fr]">
        <div className="relative mx-auto h-72 w-52 overflow-hidden rounded-3xl border border-zinc-800 bg-gradient-to-b from-slate-900 to-black">
          {bodyConfig.imageUrl ? (
            <CachedImage
              src={bodyConfig.imageUrl}
              alt={bodyConfig.label}
              className="absolute inset-0 m-auto max-h-64 max-w-44 object-contain [image-rendering:pixelated]"
            />
          ) : (
            <>
              <div className="absolute left-1/2 top-12 h-14 w-14 -translate-x-1/2 rounded-full" style={{ background: bodyConfig.color }} />
              <div className="absolute left-1/2 top-28 h-24 w-20 -translate-x-1/2 rounded-3xl" style={{ background: bodyConfig.color }} />
              <div className="absolute left-14 top-32 h-20 w-5 rounded-full" style={{ background: bodyConfig.color }} />
              <div className="absolute right-14 top-32 h-20 w-5 rounded-full" style={{ background: bodyConfig.color }} />
              <div className="absolute left-[78px] top-52 h-16 w-5 rounded-full" style={{ background: bodyConfig.color }} />
              <div className="absolute right-[78px] top-52 h-16 w-5 rounded-full" style={{ background: bodyConfig.color }} />
            </>
          )}

          {source && (
            <div
              className="absolute left-1/2 top-28 -translate-x-1/2 [image-rendering:pixelated]"
              style={{
                width: frameWidth,
                height: frameHeight,
                backgroundImage: `url(${source})`,
                backgroundPosition: `-${frame * frameWidth}px -${rowIndex * frameHeight}px`,
                backgroundRepeat: "no-repeat",
                transform: "translateX(-50%) scale(1.8)",
                transformOrigin: "top center",
                zIndex: 20 + layer,
              }}
            />
          )}
        </div>

        <div className="space-y-3">
          <div className="rounded-2xl border border-zinc-800 bg-[#111] p-4">
            <p className="text-sm text-zinc-400">{t("editor.slot")}</p>
            <b className="text-yellow-400">{slot}</b>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-[#111] p-4">
            <p className="text-sm text-zinc-400">{t("editor.layer")}</p>
            <b className="text-yellow-400">{layer}</b>
          </div>
          <label className="grid gap-2 text-sm text-zinc-400">
            {t("editor.animation")}
            <select
              value={animation}
              onChange={(event) => onAnimationChange?.(event.target.value)}
              className="rounded-xl border border-zinc-800 bg-black px-4 py-3 text-white"
            >
              {animationOptions.map((item) => (
                <option key={item.id} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
    </div>
  );
}
