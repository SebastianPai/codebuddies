"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Coins, Sparkles } from "lucide-react";
import Modal from "../shared/Modal";
import Button from "../shared/Button";
import ItemPreview from "../UI/ItemPreview";
import { useTranslation } from "../../../i18n/useTranslation";
import styles from "./DesignApplyDialog.module.css";

// "Hacerlo real": lo que falta comprar para que la sala real quede igual al
// diseño. El servidor calcula el presupuesto (design:quote) y lo vuelve a
// calcular al aplicar, así que lo que se ve acá es solo informativo.
export type DesignQuote = {
  roomId: string;
  sourceRoomId: string;
  total: number;
  coins: number;
  lines: Array<{
    itemId: string;
    needed: number;
    have: number;
    missing: number;
    price: number;
    cost: number;
    buyable: boolean;
  }>;
};

interface Props {
  socket: any;
  inventory: any[];
  onClose: () => void;
}

export default function DesignApplyDialog({ socket, inventory, onClose }: Props) {
  const t = useTranslation();
  const [quote, setQuote] = useState<DesignQuote | null>(null);
  const [shopItems, setShopItems] = useState<any[]>([]);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState("");
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const tRef = useRef(t);
  tRef.current = t;

  useEffect(() => {
    if (!socket) return;
    const handleQuote = (data: DesignQuote) => setQuote(data);
    const handleShop = (items: any[]) => setShopItems(Array.isArray(items) ? items : []);
    const handleError = (data: { message?: string }) => {
      setApplying(false);
      setError(data?.message || tRef.current("buildmode.designGenericError"));
    };
    const handleApplied = () => {
      setApplying(false);
      closeRef.current();
    };
    socket.on("design:quote", handleQuote);
    socket.on("shop:items", handleShop);
    socket.on("design:error", handleError);
    socket.on("design:applied", handleApplied);
    socket.emit("design:quote");
    socket.emit("shop:items:request");
    return () => {
      socket.off("design:quote", handleQuote);
      socket.off("shop:items", handleShop);
      socket.off("design:error", handleError);
      socket.off("design:applied", handleApplied);
    };
  }, [socket]);

  const itemsById = useMemo(() => {
    const map = new Map<string, any>();
    for (const item of shopItems) if (item?.id) map.set(item.id, item);
    for (const inv of inventory) if (inv?.item?.id) map.set(inv.item.id, inv.item);
    return map;
  }, [shopItems, inventory]);

  const missing = quote?.lines.filter((line) => line.missing > 0) ?? [];
  const blocked = quote?.lines.filter((line) => !line.buyable) ?? [];
  const short = quote ? Math.max(0, quote.total - quote.coins) : 0;

  return (
    <Modal
      title={
        <span className={styles.title}>
          <Sparkles size={18} /> {t("buildmode.designApplyTitle")}
        </span>
      }
      onClose={onClose}
      footer={
        <div className={styles.footer}>
          <Button variant="ghost" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button
            disabled={!quote || applying || short > 0 || blocked.length > 0}
            onClick={() => {
              setError("");
              setApplying(true);
              socket?.emit("design:apply");
            }}
          >
            {applying
              ? t("buildmode.designApplying")
              : quote && quote.total > 0
                ? t("buildmode.designApplyPay", { total: quote.total })
                : t("buildmode.designApplyFree")}
          </Button>
        </div>
      }
    >
      <div className={styles.body}>
        <p className={styles.lead}>{t("buildmode.designApplyLead")}</p>

        {!quote ? (
          <p className={styles.muted}>…</p>
        ) : missing.length === 0 ? (
          <p className={styles.allOwned}>{t("buildmode.designAllOwned")}</p>
        ) : (
          <ul className={styles.list}>
            {missing.map((line) => {
              const item = itemsById.get(line.itemId);
              return (
                <li key={line.itemId} className={line.buyable ? "" : styles.blocked}>
                  {item ? <ItemPreview item={item} alt={item.name} className={styles.thumb} /> : <span className={styles.thumb} />}
                  <span className={styles.name}>{item?.name ?? line.itemId.slice(0, 8)}</span>
                  <span className={styles.qty}>×{line.missing}</span>
                  <span className={styles.cost}>
                    <Coins size={12} /> {line.cost}
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        {quote && (
          <div className={styles.totals}>
            <span>
              {t("buildmode.designTotal")} <b><Coins size={13} /> {quote.total}</b>
            </span>
            <span className={styles.muted}>
              {t("buildmode.designYourCoins")} <Coins size={12} /> {quote.coins}
            </span>
          </div>
        )}

        {short > 0 && <p className={styles.warn}>{t("buildmode.designShort", { count: short })}</p>}
        {blocked.length > 0 && <p className={styles.warn}>{t("buildmode.designBlocked")}</p>}
        {error && <p className={styles.warn}>{error}</p>}
        <p className={styles.muted}>{t("buildmode.designApplyNote")}</p>
      </div>
    </Modal>
  );
}
