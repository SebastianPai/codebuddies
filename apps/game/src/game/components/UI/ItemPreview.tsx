"use client";

import styles from "./ItemPreview.module.css";
import CachedGameImage from "../shared/CachedGameImage";

type Props = {
  item: any;
  alt?: string;
  className?: string;
};

export default function ItemPreview({ item, alt, className = "" }: Props) {
  const imageUrl = item?.imageUrl || item?.previewUrl || item?.thumbnailUrl;
  const isWorld = item?.type === "WORLD" || Boolean(item?.worldData);
  const worldData = item?.worldData;
  const kind = worldData?.kind || item?.kind;
  const hasFourDirections =
    isWorld &&
    kind !== "FLOOR" &&
    kind !== "WALL" &&
    kind !== "BACKGROUND" &&
    kind !== "TEXTURE" &&
    (worldData?.rotatable ?? item?.rotatable ?? true);
  const label = alt || item?.name || item?.id || "Item";
  // Texturas/pisos/paredes suelen venir en proporciones no cuadradas (p. ej.
  // 64x32): con "contain" dentro de un marco cuadrado se ven diminutas. Un
  // patrón repetible se lee mejor recortado ("cover") que encogido entero.
  const isTileLike = kind === "FLOOR" || kind === "WALL" || kind === "BACKGROUND" || kind === "TEXTURE";

  if (!imageUrl) {
    return <div className={`${styles.preview} ${styles.empty} ${className}`} aria-label={label} />;
  }

  if (!isWorld || !hasFourDirections) {
    return (
      <CachedGameImage
        className={`${styles.image} ${isTileLike ? styles.cover : ""} ${className}`}
        src={imageUrl}
        alt={label}
      />
    );
  }

  return (
    <div
      className={`${styles.preview} ${className}`}
      role="img"
      aria-label={label}
      style={{
        backgroundImage: `url(${imageUrl})`,
        backgroundSize: "400% 100%",
        backgroundPosition: "0 0",
      }}
    />
  );
}
