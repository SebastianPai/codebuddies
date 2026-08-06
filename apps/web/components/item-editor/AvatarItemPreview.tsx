"use client";

import { useEffect, useState } from "react";
import CachedImage from "../shared/CachedImage";
import { api } from "../../utils/api";
import { useTranslation } from "../../src/i18n/useTranslation";

type BodySprite = {
  imageUrl: string;
  frameWidth: number;
  frameHeight: number;
  framesCount: number;
  row: number;
  direction: string;
};

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
  frameWidth = 128,
  frameHeight = 224,
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
  const [bodySprite, setBodySprite] = useState<BodySprite | null>(null);
  const [bodySpriteImage, setBodySpriteImage] = useState<HTMLImageElement | null>(null);
  const [bodyFrame, setBodyFrame] = useState(0);
  const bodyConfig = bodyOptions.find((item) => item.id === body) ?? bodyOptions[0];
  // Sin itemSpriteUrl solo tenemos el ícono principal (una imagen suelta, no
  // un spritesheet): mostrarlo completo en vez de recortarlo como si tuviera
  // frames, o se ve vacío/mal recortado hasta que se sube el sprite animado.
  const isSpriteSheet = Boolean(itemSpriteUrl);
  const source = itemSpriteUrl || previewUrl;
  // Caja de referencia del cuerpo (max-h-64 max-w-44, ver <CachedImage> de
  // abajo): el spritesheet se escala para entrar en la misma caja, así
  // ambas capas quedan siempre al mismo tamaño relativo.
  const REFERENCE_BOX = { width: 176, height: 256 };
  const spriteFitScale = isSpriteSheet
    ? Math.min(REFERENCE_BOX.width / frameWidth, REFERENCE_BOX.height / frameHeight, 1)
    : 1;

  useEffect(() => {
    if (!bodyOptions.some((item) => item.id === body)) {
      setBody(bodyOptions[0].id);
    }
  }, [body, bodyOptions]);

  // El cuerpo también tiene su propio spritesheet (caminar, etc): si existe
  // uno guardado para este body, se anima acá en vez de mostrar el ícono
  // estático, igual que en /admin/item-sprites.
  useEffect(() => {
    if (!bodyConfig.id || bodyConfig.id === "fallback") {
      setBodySprite(null);
      return;
    }

    let cancelled = false;
    api
      .get<BodySprite[]>(`/item-sprites?itemId=${bodyConfig.id}`)
      .then((sprites) => {
        if (cancelled) return;
        setBodySprite(sprites.find((s) => s.direction === "SOUTH") ?? sprites[0] ?? null);
      })
      .catch(() => {
        if (!cancelled) setBodySprite(null);
      });

    return () => {
      cancelled = true;
    };
  }, [bodyConfig.id]);

  useEffect(() => {
    if (!bodySprite?.imageUrl) {
      setBodySpriteImage(null);
      return;
    }

    const img = new Image();
    img.onload = () => setBodySpriteImage(img);
    img.onerror = () => setBodySpriteImage(null);
    img.src = bodySprite.imageUrl;
  }, [bodySprite]);

  useEffect(() => {
    const hasItemFrames = Boolean(source) && framesCount > 1;
    const hasBodyFrames = Boolean(bodySprite) && (bodySprite?.framesCount ?? 0) > 1;
    if (!hasItemFrames && !hasBodyFrames) return;

    const timer = window.setInterval(() => {
      if (hasItemFrames) setFrame((current) => (current + 1) % Math.max(1, framesCount));
      if (hasBodyFrames) setBodyFrame((current) => (current + 1) % Math.max(1, bodySprite!.framesCount));
    }, 140);
    return () => window.clearInterval(timer);
  }, [framesCount, source, bodySprite]);

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
          {bodySprite && bodySpriteImage ? (
            <div
              className="absolute inset-0 m-auto [image-rendering:pixelated]"
              style={{
                width: bodySprite.frameWidth,
                height: bodySprite.frameHeight,
                backgroundImage: `url(${bodySprite.imageUrl})`,
                backgroundPosition: `-${bodyFrame * bodySprite.frameWidth}px -${bodySprite.row * bodySprite.frameHeight}px`,
                backgroundSize: "auto",
                backgroundRepeat: "no-repeat",
                transform: `scale(${Math.min(
                  REFERENCE_BOX.width / bodySprite.frameWidth,
                  REFERENCE_BOX.height / bodySprite.frameHeight,
                  1,
                )})`,
                transformOrigin: "center",
              }}
            />
          ) : bodyConfig.imageUrl ? (
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

          {source && !isSpriteSheet && (
            // Sin spritesheet: la imagen completa, en la misma caja que el
            // cuerpo (object-contain), así queda puesta al mismo tamaño.
            <img
              src={source}
              alt={t("items.itemSprite")}
              className="absolute inset-0 m-auto max-h-64 max-w-44 object-contain [image-rendering:pixelated]"
              style={{ zIndex: 20 + layer }}
            />
          )}

          {source && isSpriteSheet && (
            <div
              className="absolute inset-0 m-auto [image-rendering:pixelated]"
              style={{
                width: frameWidth,
                height: frameHeight,
                backgroundImage: `url(${source})`,
                backgroundPosition: `-${frame * frameWidth}px -${rowIndex * frameHeight}px`,
                backgroundSize: "auto",
                backgroundRepeat: "no-repeat",
                transform: `scale(${spriteFitScale})`,
                transformOrigin: "center",
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
          {isSpriteSheet && (
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
          )}
        </div>
      </div>
    </div>
  );
}
