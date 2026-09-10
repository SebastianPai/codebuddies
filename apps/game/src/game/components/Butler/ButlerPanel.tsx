"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import Modal from "../shared/Modal";
import Button from "../shared/Button";
import PetSpriteCell from "../shared/PetSpriteCell";
import { audioManager } from "../../audio/AudioManager";
import { useTranslation } from "../../../i18n/useTranslation";
import {
  Butler,
  ButlerNpc,
  getButlerCatalog,
  getMyButler,
  releaseButler,
  renameButler,
  setButlerRoom,
} from "../../network/butlers";
import { requestGameConfirm } from "../../utils/dialog";

type Props = { onClose: () => void };

export default function ButlerPanel({ onClose }: Props) {
  const t = useTranslation();
  const [butler, setButler] = useState<Butler | null | undefined>(undefined);
  const [catalog, setCatalog] = useState<ButlerNpc[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");

  const load = useCallback(async () => {
    try {
      const [b, list] = await Promise.all([getMyButler(), getButlerCatalog()]);
      setButler(b);
      setCatalog(list);
    } catch {
      setButler(null);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const npc = useMemo(
    () => catalog.find((n) => n.key === butler?.npcKey) ?? null,
    [catalog, butler],
  );

  const currentRoomId: string | null =
    (typeof window !== "undefined" && (window as any).currentRoomId) || null;
  const outHere =
    !!butler && butler.activeRoomId === currentRoomId && !!currentRoomId;

  const run = async (fn: () => Promise<Butler | { released: boolean }>) => {
    if (busy) return;
    setBusy(true);
    setErr("");
    try {
      const res = await fn();
      if (res && "released" in res) setButler(null);
      else setButler(res as Butler);
      audioManager.play("click");
      // Avisa a la escena para que el mayordomo en la sala se resincronice.
      window.dispatchEvent(new CustomEvent("butler:changed"));
    } catch (e: any) {
      setErr(e?.message || "Error");
    } finally {
      setBusy(false);
    }
  };

  const toggleRoom = () =>
    run(() => setButlerRoom(outHere ? null : currentRoomId));

  const saveName = async () => {
    const n = nameDraft.trim();
    setEditingName(false);
    if (!butler || !n || n === butler.name) return;
    await run(() => renameButler(n));
  };

  const release = async () => {
    const ok = await requestGameConfirm({
      title: t("hud.butler.releaseTitle"),
      message: t("hud.butler.releaseMessage"),
      confirmLabel: t("hud.butler.release"),
      cancelLabel: t("common.cancel"),
    });
    if (ok) await run(releaseButler);
  };

  return (
    <Modal
      variant="floating"
      title={t("hud.butler.title")}
      onClose={onClose}
      style={{ width: "min(420px, calc(100vw - 24px))" }}
    >
      <div style={{ padding: 4 }}>
        {butler === undefined && (
          <p style={{ color: "#a1a1aa" }}>{t("common.loading")}</p>
        )}

        {butler === null && (
          <p style={{ color: "#a1a1aa", lineHeight: 1.5 }}>
            {t("hud.butler.none")}
          </p>
        )}

        {butler && (
          <>
            <div
              style={{
                display: "flex",
                gap: 16,
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  width: 96,
                  height: 96,
                  display: "grid",
                  placeItems: "center",
                  background: "#0b0b0b",
                  borderRadius: 12,
                  border: "1px solid #27272a",
                }}
              >
                <PetSpriteCell petSprite={npc ?? undefined} size={80} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                {editingName ? (
                  <input
                    autoFocus
                    value={nameDraft}
                    maxLength={24}
                    onChange={(e) => setNameDraft(e.target.value)}
                    onBlur={saveName}
                    onKeyDown={(e) => e.key === "Enter" && saveName()}
                    style={{
                      width: "100%",
                      background: "#000",
                      border: "1px solid #3f3f46",
                      borderRadius: 8,
                      padding: "6px 8px",
                      color: "#fff",
                    }}
                  />
                ) : (
                  <button
                    onClick={() => {
                      setNameDraft(butler.name);
                      setEditingName(true);
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#fff",
                      fontSize: 18,
                      fontWeight: 800,
                      cursor: "text",
                      padding: 0,
                    }}
                    title={t("hud.butler.rename")}
                  >
                    {butler.name || t("hud.butler.unnamed")} ✎
                  </button>
                )}
                <p style={{ fontSize: 13, color: "#a1a1aa", marginTop: 2 }}>
                  {npc?.name ?? ""}
                </p>
              </div>
            </div>

            {err && (
              <p style={{ color: "#f87171", fontSize: 12, margin: "6px 0" }}>
                {err}
              </p>
            )}

            <div
              style={{
                marginTop: 4,
                borderTop: "1px solid #27272a",
                paddingTop: 12,
              }}
            >
              <Button
                variant="secondary"
                size="sm"
                fullWidth
                onClick={toggleRoom}
                disabled={busy || !currentRoomId}
              >
                {outHere ? t("hud.butler.putAway") : t("hud.butler.bringOut")}
              </Button>
              {!currentRoomId && (
                <p style={{ fontSize: 11, color: "#71717a", marginTop: 4 }}>
                  {t("hud.butler.enterRoomFirst")}
                </p>
              )}
              <div style={{ marginTop: 8 }}>
                <Button
                  variant="danger"
                  size="sm"
                  fullWidth
                  onClick={release}
                  disabled={busy}
                >
                  {t("hud.butler.release")}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
