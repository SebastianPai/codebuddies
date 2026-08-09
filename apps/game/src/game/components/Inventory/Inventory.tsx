"use client";

import { useMemo, useState } from "react";
import { Grid3x3, Paintbrush, Square, X } from "lucide-react";

import styles from "./Inventory.module.css";
import Modal from "../shared/Modal";
import Button from "../shared/Button";
import ItemGrid from "../shared/ItemGrid";
import ItemCard from "../shared/ItemCard";

interface Props {
  inventory: any[];

  onClose?: () => void;

  onPlaceWorldItem?: (item: any) => void;
  onPaintSurfaceTexture?: (item: any, width: number, height: number) => void;
}

export default function Inventory({
  inventory,
  onClose,
  onPlaceWorldItem,
  onPaintSurfaceTexture,
}: Props) {
  const [tab, setTab] = useState<"world" | "textures">("world");
  const [textureSize, setTextureSize] = useState("1x1");

  const worldItems = useMemo(
    () =>
      inventory.filter((inv) => {
        const kind = inv.item?.worldData?.kind;
        return (
          inv.item?.type === "WORLD" && kind !== "FLOOR" && kind !== "WALL"
        );
      }),
    [inventory],
  );

  const textureItems = useMemo(
    () =>
      inventory.filter((inv) => {
        const kind = inv.item?.worldData?.kind;
        return (
          inv.item?.type === "WORLD" && (kind === "FLOOR" || kind === "WALL")
        );
      }),
    [inventory],
  );

  const [textureWidth, textureHeight] = textureSize
    .split("x")
    .map((value) => Number(value) || 1);

  return (
    <Modal
      variant="floating"
      title="Inventario"
      onClose={onClose ?? (() => {})}
      style={{ width: "min(500px, calc(100vw - 24px))", height: "min(450px, calc(100dvh - 24px))" }}
    >
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${tab === "world" ? styles.active : ""}`}
          onClick={() => setTab("world")}
        >
          Mundo
        </button>

        <button
          className={`${styles.tab} ${tab === "textures" ? styles.active : ""}`}
          onClick={() => setTab("textures")}
        >
          Texturas
        </button>
      </div>

      {tab === "textures" ? (
        <div className={styles.texturePanel}>
          <div className={styles.textureToolbar}>
            <div className={styles.toolbarRow}>
              <label>
                Tamaño
                <select
                  value={textureSize}
                  onChange={(event) => setTextureSize(event.target.value)}
                >
                  <option value="1x1">1x1</option>
                  <option value="2x2">2x2</option>
                  <option value="3x3">3x3</option>
                  <option value="2x3">2x3</option>
                  <option value="3x2">3x2</option>
                  <option value="1x4">1x4</option>
                  <option value="4x1">4x1</option>
                </select>
              </label>
            </div>

            <div className={styles.toolbarRow}>
              <Button
                variant="primary"
                size="sm"
                fullWidth
                onClick={() => {
                  window.dispatchEvent(
                    new CustomEvent("build:paint-all-floor", {
                      detail: { textureSize },
                    }),
                  );
                  onClose?.();
                }}
              >
                <Paintbrush size={14} /> Pintar TODO el suelo
              </Button>
            </div>

            <div className={styles.toolbarRow}>
              <Button
                variant="danger"
                size="sm"
                fullWidth
                onClick={() => {
                  window.dispatchEvent(new CustomEvent("build:surface:cancel"));
                  onClose?.();
                }}
              >
                <X size={14} /> Cancelar
              </Button>
            </div>
          </div>

          <ItemGrid isEmpty={textureItems.length === 0} empty="No tienes texturas todavía.">
            {textureItems.map((inv) => (
              <ItemCard
                key={inv.id}
                item={inv.item}
                title={inv.item.worldData?.kind === "WALL" ? "Pared" : "Suelo"}
                titleIcon={inv.item.worldData?.kind === "WALL" ? Square : Grid3x3}
                stackCount={inv.amount ?? inv.quantity ?? 1}
                footer={
                  <Button
                    variant="primary"
                    size="sm"
                    fullWidth
                    onClick={() => onPaintSurfaceTexture?.(inv.item, textureWidth, textureHeight)}
                  >
                    Pintar
                  </Button>
                }
              />
            ))}
          </ItemGrid>
        </div>
      ) : (
        <ItemGrid isEmpty={worldItems.length === 0} empty="No tienes objetos de mundo todavía.">
          {worldItems.map((inv) => (
            <ItemCard
              key={inv.id}
              item={inv.item}
              title={inv.item?.name || "Objeto"}
              stackCount={inv.amount ?? inv.quantity ?? 1}
              footer={
                <Button variant="primary" size="sm" fullWidth onClick={() => onPlaceWorldItem?.(inv.item)}>
                  Colocar
                </Button>
              }
            />
          ))}
        </ItemGrid>
      )}
    </Modal>
  );
}
