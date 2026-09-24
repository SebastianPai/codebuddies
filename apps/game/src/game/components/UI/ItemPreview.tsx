"use client";

import styles from "./ItemPreview.module.css";
import CachedGameImage from "../shared/CachedGameImage";
import { useTranslation } from "../../../i18n/useTranslation";
import { getFaceCount, getSpriteFrameHeight, getSpriteFrameWidth } from "../../utils/spriteFrames";

type Props = {
  item: any;
  alt?: string;
  className?: string;
};

export default function ItemPreview({ item, alt, className = "" }: Props) {
  const t = useTranslation();
  const imageUrl = item?.imageUrl || item?.previewUrl || item?.thumbnailUrl;
  const isWorld = item?.type === "WORLD" || Boolean(item?.worldData);
  const worldData = item?.worldData;
  const kind = worldData?.kind || item?.kind;
  // Cuántas caras tiene de verdad la hoja (1/2/4, igual que en el juego).
  // Antes se asumía siempre 4: un objeto de 2 caras mostraba la mitad de su
  // primera cara estirada.
  const faces = worldData ? getFaceCount(worldData) : 1;
  const isSheet =
    isWorld &&
    kind !== "FLOOR" &&
    kind !== "WALL" &&
    kind !== "BACKGROUND" &&
    kind !== "TEXTURE" &&
    faces > 1;
  const label = alt || item?.name || item?.id || t("hud.itemPreview.fallbackLabel");
  // Texturas/pisos/paredes suelen venir en proporciones no cuadradas (p. ej.
  // 64x32): con "contain" dentro de un marco cuadrado se ven diminutas. Un
  // patrón repetible se lee mejor recortado ("cover") que encogido entero.
  const isTileLike = kind === "FLOOR" || kind === "WALL" || kind === "BACKGROUND" || kind === "TEXTURE";

  if (!imageUrl) {
    return <div className={`${styles.preview} ${styles.empty} ${className}`} aria-label={label} />;
  }

  if (!isSheet) {
    return (
      <CachedGameImage
        className={`${styles.image} ${isTileLike ? styles.cover : ""} ${className}`}
        src={imageUrl}
        alt={label}
      />
    );
  }

  // Solo la primera cara, con su proporción real (un armario largo no se
  // aplasta a cuadrado): la caja interior toma el aspect-ratio del frame y
  // se ajusta dentro del marco como un "contain".
  const frameWidth = getSpriteFrameWidth(worldData);
  const frameHeight = getSpriteFrameHeight(worldData);
  const wide = frameWidth >= frameHeight;

  return (
    <div className={`${styles.preview} ${styles.sheetFrame} ${className}`} role="img" aria-label={label}>
      <div
        className={styles.sheetFace}
        style={{
          aspectRatio: `${frameWidth} / ${frameHeight}`,
          width: wide ? "100%" : "auto",
          height: wide ? "auto" : "100%",
          backgroundImage: `url(${imageUrl})`,
          backgroundSize: `${faces * 100}% 100%`,
          backgroundPosition: "0 0",
        }}
      />
    </div>
  );
}
