"use client";

import { useState } from "react";

import Modal from "./Modal";
import Button from "./Button";
import styles from "./ImagePreviewModal.module.css";
import { useTranslation } from "../../../i18n/useTranslation";

interface Props {
  title: string;
  imageUrl: string;
  onClose: () => void;
}

// Caja de referencia para calcular el zoom inicial (coincide, con margen, con
// el tamaño real de .stage — .stage tiene su propio scroll para cuando el
// usuario acerca más de lo que entra en el marco).
const STAGE_WIDTH = 320;
const STAGE_HEIGHT = 320;
const MIN_SCALE = 1;
const MAX_SCALE = 12;

// Pixel art no se ve bien agrandado con escalas fraccionarias (queda
// borroso). Usamos siempre un múltiplo ENTERO del tamaño real (1x, 2x, 3x...)
// para que se vea nítido sin importar cuánto se acerque el usuario.
function fitScale(naturalWidth: number, naturalHeight: number) {
  if (!naturalWidth || !naturalHeight) return MIN_SCALE;
  const scale = Math.floor(Math.min(STAGE_WIDTH / naturalWidth, STAGE_HEIGHT / naturalHeight));
  return Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale));
}

// Preview grande de una imagen de item/textura/sala, con acercar/alejar a
// gusto del usuario: el thumbnail en la tarjeta suele ser demasiado chico
// para ver bien el objeto (más una textura nativa de 64x32), y el zoom
// automático solo no siempre alcanza — a veces se quiere ver más de cerca.
export default function ImagePreviewModal({ title, imageUrl, onClose }: Props) {
  const t = useTranslation();
  const [natural, setNatural] = useState<{ width: number; height: number } | null>(null);
  const [zoom, setZoom] = useState<number | null>(null);

  const scale = zoom ?? (natural ? fitScale(natural.width, natural.height) : null);

  // El modal crecía en alto con el zoom (el contenido lo empuja) pero se
  // quedaba fijo en ancho (440px hardcodeado) — el ancho también debe seguir
  // a la imagen escalada, con el mismo tope de viewport que ya tenía.
  const modalWidth =
    scale && natural
      ? Math.max(320, natural.width * scale + 48)
      : STAGE_WIDTH + 48;

  return (
    <Modal
      title={title}
      onClose={onClose}
      style={{ width: `min(${modalWidth}px, 92vw)` }}
      footer={
        <div className={styles.zoomControls}>
          <Button
            variant="secondary"
            size="sm"
            aria-label={t("hud.imagePreview.zoomOut")}
            disabled={!natural || (scale ?? MIN_SCALE) <= MIN_SCALE}
            onClick={() => setZoom(Math.max(MIN_SCALE, (scale ?? MIN_SCALE) - 1))}
          >
            − {t("hud.imagePreview.zoomOut")}
          </Button>
          <span className={styles.zoomLabel}>{scale ? `${scale}x` : "…"}</span>
          <Button
            variant="secondary"
            size="sm"
            aria-label={t("hud.imagePreview.zoomIn")}
            disabled={!natural || (scale ?? MIN_SCALE) >= MAX_SCALE}
            onClick={() => setZoom(Math.min(MAX_SCALE, (scale ?? MIN_SCALE) + 1))}
          >
            + {t("hud.imagePreview.zoomIn")}
          </Button>
        </div>
      }
    >
      <div className={styles.stage}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={title}
          className={styles.image}
          onLoad={(event) => {
            const target = event.currentTarget;
            setNatural({ width: target.naturalWidth, height: target.naturalHeight });
          }}
          style={
            scale && natural
              ? {
                  width: natural.width * scale,
                  height: natural.height * scale,
                  maxWidth: "none",
                  maxHeight: "none",
                }
              : undefined
          }
        />
      </div>
    </Modal>
  );
}
