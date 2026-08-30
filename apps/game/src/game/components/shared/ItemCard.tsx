"use client";

import { ReactNode, useState } from "react";
import { Lock, Star, ZoomIn, type LucideIcon } from "lucide-react";
import { getEffectDefinition, resolveItemRarityEffect } from "@codebuddies/visual-effects";

import styles from "./ItemCard.module.css";
import ItemPreview from "../UI/ItemPreview";
import ImagePreviewModal from "./ImagePreviewModal";
import RarityText from "./RarityText";
import { useTranslation } from "../../../i18n/useTranslation";

interface Props {
  item: any;
  title?: string;
  /** Ícono chico antes del título (ej. distinguir "Pared" de "Suelo" en texturas). */
  titleIcon?: LucideIcon;
  /** Descripción corta bajo el título (tienda). Se recorta a 2 líneas. */
  description?: string | null;
  /** Reemplaza la imagen del preview (ej: celda animada de una mascota). */
  preview?: ReactNode;
  /** Insignia de cantidad, ej. "x3". */
  stackCount?: number;
  selected?: boolean;
  locked?: boolean;
  /** Zona libre para precio/botón de equipar/etc., propia de cada dominio (tienda, inventario, avatar...). */
  footer?: ReactNode;
  /** Etiqueta corta ("Pintar", "Colocar") cuando TODA la tarjeta es la acción:
   *  se pinta dentro del propio botón, a diferencia de "footer" que va afuera. */
  actionHint?: string;
  onClick?: () => void;
  className?: string;
  /** Estrella de favorito (esquina superior derecha) — solo se renderiza si
   *  se pasa onToggleFavorite; el dominio que la usa (BuildModePanel) decide
   *  qué significa "favorito" para él. */
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  /** Item.rarity (0-4). Adds the shared rarity border treatment when present. */
  rarity?: number;
  /**
   * Item.effectKey (solo type === "EFFECT"): en vez del borde derivado de
   * rarity, muestra el efecto real que este item desbloquea -- borde +
   * título con el propio degradado, para que el item "se muestre a sí
   * mismo" en la tienda. Tiene prioridad sobre `rarity` si está presente.
   */
  effectPreview?: string | null;
}

// Celda de item compartida por Inventory, Shop, BuildModePanel y
// AvatarInventory: mismo tamaño de imagen, mismo radio, misma insignia de
// stack y mismo estado "bloqueado", con un slot libre para las acciones
// propias de cada tienda/inventario en vez de duplicar la tarjeta entera.
//
// El "footer" se renderiza fuera del área clickeable: ahí van botones reales
// (Comprar, Equipar...) y anidar un <button> dentro de otro no es válido HTML.
export default function ItemCard({
  item,
  title,
  titleIcon: TitleIcon,
  description,
  preview,
  stackCount,
  selected,
  locked,
  footer,
  actionHint,
  onClick,
  className = "",
  isFavorite,
  onToggleFavorite,
  rarity,
  effectPreview,
}: Props) {
  const t = useTranslation();
  const [zoomOpen, setZoomOpen] = useState(false);
  const label = title ?? item?.name ?? t("hud.itemPreview.fallbackLabel");
  const imageUrl: string | undefined = item?.imageUrl || item?.previewUrl || item?.thumbnailUrl;
  const borderClass = effectPreview
    ? getEffectDefinition(effectPreview).borderClassName
    : rarity != null
      ? getEffectDefinition(resolveItemRarityEffect(rarity).id).borderClassName
      : undefined;
  const glowClass = effectPreview ? getEffectDefinition(effectPreview).glowClassName : undefined;
  const classes = [
    styles.card,
    selected ? styles.selected : "",
    locked ? styles.locked : "",
    borderClass ?? "",
    glowClass ?? "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes}>
      <button
        type="button"
        className={styles.hitArea}
        onClick={onClick}
        disabled={locked || !onClick}
        aria-pressed={onClick ? !!selected : undefined}
      >
        <div className={styles.previewFrame}>
          {preview ? (
            <div className={styles.preview} style={{ display: "grid", placeItems: "center" }}>
              {preview}
            </div>
          ) : (
            <ItemPreview item={item} alt={label} className={styles.preview} />
          )}
          {!!stackCount && stackCount > 1 && <span className={styles.stack}>x{stackCount}</span>}
          {locked && (
            <span className={styles.lockIcon} aria-hidden="true">
              <Lock size={13} />
            </span>
          )}
        </div>
        <span className={styles.title} title={label}>
          {TitleIcon && <TitleIcon size={12} className={styles.titleIcon} />}
          {effectPreview ? (
            <RarityText effect={effectPreview} className={styles.titleText}>
              {label}
            </RarityText>
          ) : (
            <span className={styles.titleText}>{label}</span>
          )}
        </span>
        {description && (
          <span className={styles.description} title={description}>
            {description}
          </span>
        )}
        {actionHint && <span className={styles.actionHint}>{actionHint}</span>}
      </button>

      {imageUrl && (
        <button
          type="button"
          className={styles.zoomBtn}
          aria-label={t("hud.itemCard.viewLarger", { label })}
          onClick={(event) => {
            event.stopPropagation();
            setZoomOpen(true);
          }}
        >
          <ZoomIn size={13} />
        </button>
      )}

      {onToggleFavorite && (
        <button
          type="button"
          className={`${styles.favoriteBtn} ${isFavorite ? styles.favoriteActive : ""}`}
          aria-label={t("hud.itemCard.toggleFavorite", { label })}
          aria-pressed={!!isFavorite}
          onClick={(event) => {
            event.stopPropagation();
            onToggleFavorite();
          }}
        >
          <Star size={13} fill={isFavorite ? "currentColor" : "none"} />
        </button>
      )}

      {footer && <div className={styles.footer}>{footer}</div>}

      {zoomOpen && imageUrl && (
        <ImagePreviewModal title={label} imageUrl={imageUrl} onClose={() => setZoomOpen(false)} />
      )}
    </div>
  );
}
