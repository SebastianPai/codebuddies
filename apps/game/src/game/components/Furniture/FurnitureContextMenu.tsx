"use client";

import { useEffect, useRef } from "react";
import { RotateCw, Trash2, Move, Copy, CopyPlus, Power, DoorOpen } from "lucide-react";
import styles from "./FurnitureContextMenu.module.css";
import Button from "../shared/Button";
import { useTranslation } from "../../../i18n/useTranslation";
import { EffectivePermissions, NO_PERMISSIONS } from "../../types/permissions";

interface Props {
  furniture: any;
  x: number;
  y: number;
  permissions?: EffectivePermissions;
  onClose: () => void;
}

// Antes esto era un panel centrado de 420px que tapaba media pantalla al
// clicar cualquier mueble — interrumpía caminar y se sentía como un modal
// de configuración pesado para una acción simple (rotar/mover/recoger).
// Ahora es un popover pequeño anclado al punto de clic, mismo patrón que
// PlayerQuickMenu: se cierra con Escape o clic afuera, no atrapa el foco.
//
// Las acciones se OCULTAN (no solo deshabilitan) según los permisos
// granulares del Módulo 0 — el servidor las rechaza igual si se fuerzan,
// esto es puramente para no mostrar botones que van a fallar.
export default function FurnitureContextMenu({
  furniture,
  x,
  y,
  permissions = NO_PERMISSIONS,
  onClose,
}: Props) {
  const t = useTranslation();
  const rootRef = useRef<HTMLDivElement>(null);
  const translation = furniture?.item?.translations?.[0];
  const name = translation?.name ?? t("buildmode.itemFallbackName");

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) onClose();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  // Interacciones (encender/abrir): NO dependen de permisos de edición —
  // cualquiera en la sala puede usarlas. El estado vive en furniture.state
  // y lo sincroniza el servidor con "room:item:state".
  const worldData = furniture?.item?.worldData;
  const interactionTypes: string[] = worldData?.isInteractable
    ? worldData?.interactionTypes ?? []
    : [];
  const state = furniture?.state ?? {};

  const interact = (interaction: string) => {
    const socket = (window as any).phaserSocket;
    if (!socket || !furniture?.roomItemId) return;
    socket.emit("room:item:interact", {
      roomItemId: furniture.roomItemId,
      interaction,
    });
    onClose();
  };

  const rotate = () => {
    const socket = (window as any).phaserSocket;
    if (!socket || !furniture?.roomItemId) return;

    socket.emit("room:item:rotate", {
      roomItemId: furniture.roomItemId,
    });
    // Deshacer un giro = tres giros más (vuelve al valor original mod 4) —
    // ver BuildCommandStack.ts. Se registra ANTES de emitir para que el
    // undo quede disponible aunque el usuario actúe muy rápido.
    (window as any).buildCommandStack?.push({
      type: "rotate",
      roomItemId: furniture.roomItemId,
    });

    onClose();
  };

  const duplicate = () => {
    window.dispatchEvent(new CustomEvent("build:item:duplicate", { detail: furniture }));
    onClose();
  };

  const copy = () => {
    window.dispatchEvent(new CustomEvent("build:item:copy", { detail: furniture }));
    onClose();
  };

  const pickUp = () => {
    const socket = (window as any).phaserSocket;
    if (!socket || !furniture?.roomItemId) return;

    socket.emit("room:item:remove", {
      roomItemId: furniture.roomItemId,
    });

    onClose();
  };

  const move = () => {
    window.dispatchEvent(
      new CustomEvent("build:item:move", {
        detail: furniture,
      }),
    );

    onClose();
  };

  return (
    <div ref={rootRef} className={styles.popover} style={{ left: x, top: y }}>
      <div className={styles.head}>
        {furniture?.item?.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className={styles.thumb}
            src={furniture.item.imageUrl}
            alt=""
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : null}
        <span className={styles.name}>{name}</span>
      </div>

      <div className={styles.actions}>
        {interactionTypes.includes("TOGGLE") && (
          <Button variant="primary" size="sm" fullWidth onClick={() => interact("TOGGLE")}>
            <Power size={13} />{" "}
            {state.on ? t("buildmode.interactTurnOff") : t("buildmode.interactTurnOn")}
          </Button>
        )}
        {interactionTypes.includes("OPEN") && (
          <Button variant="primary" size="sm" fullWidth onClick={() => interact("OPEN")}>
            <DoorOpen size={13} />{" "}
            {state.open ? t("buildmode.interactClose") : t("buildmode.interactOpen")}
          </Button>
        )}
        {permissions.canMoveObjects && (
          <Button variant="secondary" size="sm" fullWidth onClick={move}>
            <Move size={13} /> {t("buildmode.moveButton")}
          </Button>
        )}
        {permissions.canRotateObjects && (
          <Button variant="secondary" size="sm" fullWidth onClick={rotate}>
            <RotateCw size={13} /> {t("buildmode.rotateButton")}
          </Button>
        )}
        {permissions.canDeleteObjects && (
          <Button variant="danger" size="sm" fullWidth onClick={pickUp}>
            <Trash2 size={13} /> {t("buildmode.pickUpButton")}
          </Button>
        )}
        {permissions.canPlaceObjects && (
          <Button variant="secondary" size="sm" fullWidth onClick={duplicate}>
            <CopyPlus size={13} /> {t("buildmode.duplicateButton")}
          </Button>
        )}
        <Button variant="secondary" size="sm" fullWidth onClick={copy}>
          <Copy size={13} /> {t("buildmode.copyButton")}
        </Button>
        {!permissions.canMoveObjects &&
          !permissions.canRotateObjects &&
          !permissions.canDeleteObjects &&
          !permissions.canPlaceObjects && (
            <span className={styles.noPermissions}>
              {t("buildmode.noPermissionsForItem")}
            </span>
          )}
      </div>

      <div className={styles.arrow} />
    </div>
  );
}
