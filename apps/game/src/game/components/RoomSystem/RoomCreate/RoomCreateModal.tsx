"use client";

import React, { useState, useEffect } from "react";
import { CreateRoomData, Background } from "../../../types/room";
import BackgroundSelector from "../BackgroundSelector/BackgroundSelector";
import styles from "./RoomCreateModal.module.css";
import { showGameAlert } from "../../../utils/dialog";
import Modal from "../../shared/Modal";

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
      socket.off("backgrounds:list");
      socket.off("layouts:list");
    };
  }, [socket]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name || form.name.trim().length < 3) {
      await showGameAlert({
        title: "Nombre incompleto",
        message: "El nombre debe tener al menos 3 caracteres.",
        confirmLabel: "Entendido",
        tone: "danger",
      });
      return;
    }

    if (!selectedLayout) {
      await showGameAlert({
        title: "Selecciona un mapa",
        message: "Debes elegir un layout antes de crear la sala.",
        confirmLabel: "Entendido",
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
      title="Crear Nueva Sala"
      onClose={onClose}
      className={styles.modal}
      style={{ width: "min(820px, 100%)" }}
    >
        <form onSubmit={handleSubmit}>
          {/* ================= INPUTS ================= */}

          <input
            type="text"
            placeholder="Nombre de la sala"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />

          <textarea
            placeholder="Descripción (opcional)"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />

          <label>
            <input
              type="checkbox"
              checked={form.isPublic}
              onChange={(e) => setForm({ ...form, isPublic: e.target.checked })}
            />
            Sala Pública
          </label>

          <label>
            <input
              type="checkbox"
              checked={form.isVipOnly}
              onChange={(e) =>
                setForm({ ...form, isVipOnly: e.target.checked })
              }
            />
            Sala Privada
          </label>

          <div>
            <label>Máximo de usuarios:</label>
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
            <label>Selecciona un mapa:</label>

            <div
              style={{
                display: "flex",
                gap: 12,
                flexWrap: "wrap",
                marginTop: 10,
              }}
            >
              {layouts.length === 0 && (
                <p style={{ opacity: 0.6 }}>No hay mapas disponibles</p>
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
              Cancelar
            </button>

            <button type="submit">Crear Sala</button>
          </div>
        </form>
    </Modal>
  );
}
