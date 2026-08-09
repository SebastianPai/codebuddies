"use client";

import React, { useState, useEffect } from "react";
import { CreateRoomData, Background } from "../../../types/room";
import BackgroundSelector from "../BackgroundSelector/BackgroundSelector";
import styles from "./RoomCreateModal.module.css";
import { showGameAlert } from "../../../utils/dialog";
import Modal from "../../shared/Modal";
import { useTranslation } from "../../../../i18n/useTranslation";

interface Layout {
  id: string;
  name: string;
  previewImageUrl?: string;
  layoutJson?: any;
  width: number;
  height: number;
}

interface Props {
  onClose: () => void;
  onCreate: (data: CreateRoomData) => void;
  socket?: any;
}

export default function RoomCreateModal({
  onClose,
  onCreate,
  socket: socketProp,
}: Props) {
  const t = useTranslation();
  const [form, setForm] = useState<CreateRoomData>({
    name: "",
    description: "",
    isPublic: true,
    isVipOnly: false,
    maxUsers: 20,
    width: 800,
    height: 600,
    backgroundId: "",
  });

  const [backgrounds, setBackgrounds] = useState<Background[]>([]);
  const [layouts, setLayouts] = useState<Layout[]>([]);
  const [selectedLayout, setSelectedLayout] = useState<Layout | null>(null);

  const socket =
    socketProp ||
    (typeof window !== "undefined" ? (window as any).phaserSocket : null);

  const compatibleBackgrounds = backgrounds.filter((background) => {
    if (!selectedLayout) return true;
    const layoutAllowed =
      selectedLayout.layoutJson?.__codebuddies?.compatibleBackgroundIds;
    const backgroundAllowed = background.metadata?.compatibleLayoutIds;
    if (Array.isArray(layoutAllowed) && layoutAllowed.length && !layoutAllowed.includes(background.id)) {
      return false;
    }
    if (Array.isArray(backgroundAllowed) && backgroundAllowed.length && !backgroundAllowed.includes(selectedLayout.id)) {
      return false;
    }
    return true;
  });

  useEffect(() => {
    if (!socket) return;

    socket.emit("getBackgrounds");
    socket.emit("getLayouts");

    socket.on("backgrounds:list", setBackgrounds);
    socket.on("layouts:list", setLayouts);

    return () => {
      // Pasar la MISMA referencia de handler que se usó en socket.on() es
      // clave acá: socket.off("backgrounds:list") sin handler borra TODOS
      // los listeners de ese evento en el socket compartido, incluidos los
      // de BuildModePanel/RoomDetailsModal si están montados a la vez —
      // dejaban su selector de fondos roto hasta un remount completo.
      socket.off("backgrounds:list", setBackgrounds);
      socket.off("layouts:list", setLayouts);
    };
  }, [socket]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name || form.name.trim().length < 3) {
      await showGameAlert({
        title: t("rooms.createNameIncompleteTitle"),
        message: t("rooms.createNameIncompleteMessage"),
        confirmLabel: t("common.understood"),
        tone: "danger",
      });
      return;
    }

    if (!selectedLayout) {
      await showGameAlert({
        title: t("rooms.createSelectLayoutTitle"),
        message: t("rooms.createSelectLayoutMessage"),
        confirmLabel: t("common.understood"),
        tone: "danger",
      });
      return;
    }

    onCreate({
      ...form,
      backgroundId: form.backgroundId || undefined,
      layoutId: selectedLayout.id,
    });
  };

  return (
    <Modal
      title={t("rooms.createModalTitle")}
      onClose={onClose}
      className={styles.modal}
      style={{ width: "min(820px, 100%)" }}
    >
        <form onSubmit={handleSubmit}>
          {/* ================= INPUTS ================= */}

          <input
            type="text"
            placeholder={t("rooms.createNamePlaceholder")}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />

          <textarea
            placeholder={t("rooms.createDescriptionPlaceholder")}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />

          <label>
            <input
              type="checkbox"
              checked={form.isPublic}
              onChange={(e) => setForm({ ...form, isPublic: e.target.checked })}
            />
            {t("rooms.createPublicLabel")}
          </label>

          <label>
            <input
              type="checkbox"
              checked={form.isVipOnly}
              onChange={(e) =>
                setForm({ ...form, isVipOnly: e.target.checked })
              }
            />
            {t("rooms.createPrivateLabel")}
          </label>

          <div>
            <label>{t("rooms.createMaxUsersLabel")}</label>
            <input
              type="number"
              value={form.maxUsers}
              onChange={(e) =>
                setForm({
                  ...form,
                  maxUsers: parseInt(e.target.value),
                })
              }
              min={5}
              max={100}
            />
          </div>

          {/* ================= BACKGROUNDS ================= */}

          <BackgroundSelector
            backgrounds={compatibleBackgrounds}
            selectedId={form.backgroundId}
            onSelect={(id) => setForm({ ...form, backgroundId: id })}
          />

          {/* ================= LAYOUTS ================= */}

          <div>
            <label>{t("rooms.createSelectMapLabel")}</label>

            <div
              style={{
                display: "flex",
                gap: 12,
                flexWrap: "wrap",
                marginTop: 10,
              }}
            >
              {layouts.length === 0 && (
                <p style={{ opacity: 0.6 }}>{t("rooms.createNoLayouts")}</p>
              )}

              {layouts.map((layout) => (
                <button
                  key={layout.id}
                  type="button"
                  onClick={() => setSelectedLayout(layout)}
                  aria-pressed={selectedLayout?.id === layout.id}
                  style={{
                    border:
                      selectedLayout?.id === layout.id
                        ? "2px solid #ffd700"
                        : "1px solid #444",
                    borderRadius: 8,
                    padding: 8,
                    cursor: "pointer",
                    width: 130,
                    background:
                      selectedLayout?.id === layout.id ? "#1a1a1a" : "#111",
                    color: "inherit",
                    font: "inherit",
                    textAlign: "left",
                    transition: "0.2s",
                  }}
                >
                  {/* 🖼️ Preview */}
                  {layout.previewImageUrl ? (
                    <img
                      src={layout.previewImageUrl}
                      alt={layout.name}
                      style={{
                        width: "100%",
                        height: 80,
                        objectFit: "cover",
                        borderRadius: 6,
                        marginBottom: 5,
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "100%",
                        height: 80,
                        background: "#222",
                        borderRadius: 6,
                        marginBottom: 5,
                      }}
                    />
                  )}

                  {/* 📛 Nombre */}
                  <p
                    style={{
                      fontSize: 12,
                      textAlign: "center",
                      margin: 0,
                    }}
                  >
                    {layout.name}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* ================= BUTTONS ================= */}

          <div className={styles.buttons}>
            <button type="button" onClick={onClose}>
              {t("common.cancel")}
            </button>

            <button type="submit">{t("rooms.createSubmit")}</button>
          </div>
        </form>
    </Modal>
  );
}
