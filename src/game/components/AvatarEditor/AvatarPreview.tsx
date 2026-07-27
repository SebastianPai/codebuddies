"use client";

import { User } from "lucide-react";

interface AvatarPreviewSlot {
  slot: string;
  itemId?: string | null;
  imageUrl?: string | null;
  layer?: number;
  color?: number | null;
  colorable?: boolean;
}

interface Props {
  avatarSlots?: AvatarPreviewSlot[];
  skinColor?: number;
  width?: number;
  height?: number;
}

export default function AvatarPreview({
  avatarSlots = [],
  skinColor = 0xf1c27d,
  width = 92,
  height = 92,
}: Props) {
  const parsedSlots = (avatarSlots || []).map((slot) => {
    return {
      slot: slot.slot,
      itemId: slot.itemId ?? null,
      imageUrl: slot.imageUrl ?? null,
      layer: slot.layer ?? 0,
      color: slot.color ?? null,
      colorable: slot.colorable ?? false,
    };
  });

  const visibleSlots = parsedSlots
    .filter((slot) => Boolean(slot?.imageUrl))
    .sort((a, b) => (a.layer ?? 0) - (b.layer ?? 0));

  if (visibleSlots.length === 0) {
    return (
      <div className="avatar-placeholder" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <User size={Math.round(Math.min(width, height) * 0.5)} />
      </div>
    );
  }

  const toHex = (num: number) => "#" + num.toString(16).padStart(6, "0");

  return (
    <div
      style={{
        width,
        height,
        position: "relative",
        background: "#1a1a1a",
        borderRadius: "8px",
        overflow: "hidden",
        isolation: "isolate",
      }}
    >
      <div
        style={{
          position: "absolute",
          width: "90%",
          height: "90%",
          background: toHex(skinColor),
          borderRadius: "50%",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 0,
        }}
      />
      {visibleSlots.map((slot, index) => {
        const hexColor = slot.color ? toHex(slot.color) : null;
        return (
          <div
            key={index}
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: "90%",
              height: "90%",
              zIndex: slot.layer ?? 0,
            }}
          >
            {slot.colorable && hexColor ? (
              <div style={{ width: "100%", height: "100%", position: "absolute" }}>
                <img
                  src={slot.imageUrl!}
                  alt={slot.slot}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    imageRendering: "pixelated",
                    position: "absolute",
                    zIndex: 1,
                  }}
                />
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    backgroundColor: hexColor,
                    position: "absolute",
                    zIndex: 2,
                    opacity: 0.95,
                    WebkitMaskImage: `url(${slot.imageUrl})`,
                    WebkitMaskSize: "contain",
                    WebkitMaskRepeat: "no-repeat",
                    WebkitMaskPosition: "center",
                    maskImage: `url(${slot.imageUrl})`,
                    maskSize: "contain",
                    maskRepeat: "no-repeat",
                    maskPosition: "center",
                    mixBlendMode: "multiply",
                  } as React.CSSProperties}
                />
              </div>
            ) : (
              <img
                src={slot.imageUrl!}
                alt={slot.slot}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  imageRendering: "pixelated",
                  position: "absolute",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
