"use client";

import { useMemo, useRef, useState } from "react";
import Draggable from "react-draggable";

import AvatarInventory from "../Avatar/AvatarInventory";
import AvatarPreview from "../AvatarEditor/AvatarPreview";
import styles from "./AvatarStudio.module.css";

interface Props {
  inventory: any[];
  avatar?: any;
  username?: string;
  onClose: () => void;
  onEquipAvatarItem?: (item: any, color?: number) => void;
}

export default function AvatarStudio({
  inventory,
  avatar,
  username = "Jugador",
  onClose,
  onEquipAvatarItem,
}: Props) {
  const nodeRef = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState("");

  const avatarItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    return inventory.filter((inv) => {
      if (inv.item?.type !== "AVATAR") return false;
      if (!term) return true;
      return (
        inv.item?.name?.toLowerCase().includes(term) ||
        inv.item?.avatarData?.slot?.toLowerCase().includes(term)
      );
    });
  }, [inventory, search]);

  return (
    <Draggable nodeRef={nodeRef} handle={`.${styles.header}`}>
      <section ref={nodeRef} className={styles.window} aria-label="Vestidor de avatar">
        <header className={styles.header}>
          <div>
            <span>Avatar Studio</span>
            <h2>Vestidor</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar vestidor">
            Cerrar
          </button>
        </header>

        <div className={styles.body}>
          <aside className={styles.previewPanel}>
            <div className={styles.avatarStage}>
              <AvatarPreview
                avatarSlots={avatar?.slots || []}
                skinColor={avatar?.skinColor}
                width={132}
                height={132}
              />
            </div>
            <strong>{username}</strong>
            <p>Ropa, cabello, accesorios y colores separados del inventario de muebles.</p>
          </aside>

          <main className={styles.itemsPanel}>
            <label className={styles.search}>
              Buscar pieza
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cabello, camisa, accesorio..."
              />
            </label>

            {avatarItems.length ? (
              <AvatarInventory
                inventory={avatarItems}
                avatar={avatar}
                onEquipAvatarItem={onEquipAvatarItem}
              />
            ) : (
              <div className={styles.empty}>
                <strong>No hay piezas de avatar</strong>
                <span>Compra ropa o accesorios en la tienda para equiparlos aqui.</span>
              </div>
            )}
          </main>
        </div>
      </section>
    </Draggable>
  );
}
