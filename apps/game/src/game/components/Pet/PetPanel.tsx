"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import Modal from "../shared/Modal";
import Button from "../shared/Button";
import PetSpriteCell from "../shared/PetSpriteCell";
import { audioManager } from "../../audio/AudioManager";
import { useTranslation } from "../../../i18n/useTranslation";
import {
  Pet,
  PetAction,
  PetSpecies,
  curePet,
  doPetAction,
  getMyPet,
  getPetSpeciesList,
  renamePet,
  setPetRoom,
} from "../../network/pets";

type Props = { onClose: () => void };

const STAT_COLORS: Record<string, string> = {
  hunger: "#f59e0b",
  thirst: "#38bdf8",
  happiness: "#ec4899",
  energy: "#a3e635",
};

function StatBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#a1a1aa" }}>
        <span>{label}</span>
        <span>{Math.round(value)}</span>
      </div>
      <div style={{ height: 8, borderRadius: 999, background: "#27272a", overflow: "hidden" }}>
        <div
          style={{
            width: `${Math.max(0, Math.min(100, value))}%`,
            height: "100%",
            background: color,
            transition: "width .3s",
          }}
        />
      </div>
    </div>
  );
}

export default function PetPanel({ onClose }: Props) {
  const t = useTranslation();
  const [pet, setPet] = useState<Pet | null | undefined>(undefined);
  const [speciesList, setSpeciesList] = useState<PetSpecies[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [, forceTick] = useState(0);

  const load = useCallback(async () => {
    try {
      const [p, list] = await Promise.all([getMyPet(), getPetSpeciesList()]);
      setPet(p);
      setSpeciesList(list);
    } catch {
      setPet(null);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Re-render cada segundo para que el countdown de los cooldowns baje.
  useEffect(() => {
    const id = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const species = useMemo(
    () => speciesList.find((s) => s.key === pet?.species) ?? null,
    [speciesList, pet],
  );

  const currentRoomId: string | null =
    (typeof window !== "undefined" && (window as any).currentRoomId) || null;
  const outHere = !!pet && pet.activeRoomId === currentRoomId && !!currentRoomId;

  const run = async (fn: () => Promise<Pet>, sound = "click") => {
    if (busy) return;
    setBusy(true);
    setErr("");
    try {
      setPet(await fn());
      audioManager.play(sound as any);
      // Avisa a la escena para que la mascota en la sala se resincronice
      // (sacar/guardar, o refrescar su estado tras cuidarla).
      window.dispatchEvent(new CustomEvent("pet:changed"));
    } catch (e: any) {
      setErr(e?.message || "Error");
    } finally {
      setBusy(false);
    }
  };

  const action = (a: PetAction) => run(() => doPetAction(a));

  const toggleRoom = () =>
    run(() => setPetRoom(outHere ? null : currentRoomId));

  const saveName = async () => {
    const n = nameDraft.trim();
    setEditingName(false);
    if (!pet || !n || n === pet.name) return;
    await run(() => renamePet(n));
  };

  const moodLabel = pet ? t(`hud.pet.mood_${pet.mood}`) : "";
  const cd = (ms: number) => (ms > 0 ? ` (${Math.ceil(ms / 1000)}s)` : "");

  return (
    <Modal
      variant="floating"
      title={t("hud.pet.title")}
      onClose={onClose}
      style={{ width: "min(420px, calc(100vw - 24px))" }}
    >
      <div style={{ padding: 4 }}>
        {pet === undefined && <p style={{ color: "#a1a1aa" }}>{t("common.loading")}</p>}

        {pet === null && (
          <p style={{ color: "#a1a1aa", lineHeight: 1.5 }}>
            {t("hud.pet.none")}
          </p>
        )}

        {pet && (
          <>
            <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 12 }}>
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
                <PetSpriteCell
                  petSprite={species ?? undefined}
                  size={80}
                />
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
                      setNameDraft(pet.name);
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
                    title={t("hud.pet.rename")}
                  >
                    {pet.name || t("hud.pet.unnamed")} ✎
                  </button>
                )}
                <p style={{ fontSize: 13, color: pet.sick ? "#f87171" : "#a1a1aa", marginTop: 2 }}>
                  {moodLabel}
                </p>
              </div>
            </div>

            <StatBar label={t("hud.pet.hunger")} value={pet.hunger} color={STAT_COLORS.hunger} />
            <StatBar label={t("hud.pet.thirst")} value={pet.thirst} color={STAT_COLORS.thirst} />
            <StatBar label={t("hud.pet.happiness")} value={pet.happiness} color={STAT_COLORS.happiness} />
            <StatBar label={t("hud.pet.energy")} value={pet.energy} color={STAT_COLORS.energy} />

            {err && <p style={{ color: "#f87171", fontSize: 12, margin: "6px 0" }}>{err}</p>}

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
              <Button
                variant="primary"
                size="sm"
                onClick={() => action("feed")}
                disabled={busy || pet.cooldowns.feed > 0}
              >
                🍖 {t("hud.pet.feed")}{cd(pet.cooldowns.feed)}
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => action("water")}
                disabled={busy || pet.cooldowns.water > 0}
              >
                💧 {t("hud.pet.water")}{cd(pet.cooldowns.water)}
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => action("play")}
                disabled={busy || pet.cooldowns.play > 0}
              >
                🎾 {t("hud.pet.play")}{cd(pet.cooldowns.play)}
              </Button>
              {pet.sick && (
                <Button variant="danger" size="sm" onClick={() => run(curePet)} disabled={busy}>
                  🩹 {t("hud.pet.cure")}
                </Button>
              )}
            </div>

            <div style={{ marginTop: 12, borderTop: "1px solid #27272a", paddingTop: 12 }}>
              <Button
                variant="secondary"
                size="sm"
                fullWidth
                onClick={toggleRoom}
                disabled={busy || !currentRoomId}
              >
                {outHere ? t("hud.pet.putAway") : t("hud.pet.bringOut")}
              </Button>
              {!currentRoomId && (
                <p style={{ fontSize: 11, color: "#71717a", marginTop: 4 }}>
                  {t("hud.pet.enterRoomFirst")}
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
