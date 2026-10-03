"use client";

import { useEffect, useState } from "react";
import { Crown } from "lucide-react";
import type { BattlePassBadgeIcon } from "./battle-pass-types";

// Mismo recorrido de cuadros que usa el juego (UserBadges / PlayerHUD) para
// que el logo del ticket se vea igual que junto al nombre.
const SPRITE_KEYFRAMES = `
@keyframes bp-badge-sprite {
  from { background-position: 0% 0; }
  to { background-position: 100% 0; }
}
`;

function useFrameAspect(url: string | null, frameCount: number): number {
  const [aspect, setAspect] = useState(1);

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    const img = new window.Image();
    img.onload = () => {
      const frameWidth = img.naturalWidth / Math.max(1, frameCount);
      if (!cancelled && img.naturalHeight > 0) setAspect(frameWidth / img.naturalHeight);
    };
    img.src = url;
    return () => {
      cancelled = true;
    };
  }, [url, frameCount]);

  return aspect;
}

export function BadgeLogo({ icon, height }: { icon: BattlePassBadgeIcon; height: number }) {
  const aspect = useFrameAspect(icon.mode === "SPRITE" ? icon.iconUrl : null, icon.frameCount);

  if (!icon.iconUrl) return <Crown size={height * 0.7} color="#a855f7" />;

  if (icon.mode === "SPRITE" && icon.frameCount > 1) {
    return (
      <>
        <style>{SPRITE_KEYFRAMES}</style>
        <span
          aria-hidden
          style={{
            display: "block",
            width: height * aspect,
            height,
            backgroundImage: `url(${icon.iconUrl})`,
            backgroundSize: `${icon.frameCount * 100}% 100%`,
            backgroundRepeat: "no-repeat",
            imageRendering: "pixelated",
            animationName: "bp-badge-sprite",
            animationDuration: `${icon.frameCount / Math.max(1, icon.frameRate)}s`,
            animationTimingFunction: `steps(${Math.max(2, icon.frameCount)}, jump-none)`,
            animationIterationCount: "infinite",
            animationDirection: icon.direction === "PINGPONG" ? "alternate" : "normal",
          }}
        />
      </>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={icon.iconUrl} alt="" style={{ height, width: "auto", imageRendering: "pixelated" }} />
  );
}
