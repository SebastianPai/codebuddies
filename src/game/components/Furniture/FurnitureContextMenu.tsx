"use client";

import type { CSSProperties } from "react";

interface Props {
  furniture: any;
  onClose: () => void;
}

const buttonBase: CSSProperties = {
  padding: 12,
  border: "none",
  borderRadius: 10,
  color: "#fff",
  cursor: "pointer",
};

export default function FurnitureContextMenu({ furniture, onClose }: Props) {
  const translation = furniture?.item?.translations?.[0];
  const worldData = furniture?.item?.worldData;

  const rotate = () => {
    const socket = (window as any).phaserSocket;
    if (!socket || !furniture?.roomItemId) return;

    socket.emit("room:item:rotate", {
      roomItemId: furniture.roomItemId,
    });

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
    <div
      style={{
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: 420,
        background: "#1f1f1f",
        color: "#fff",
        borderRadius: 12,
        overflow: "hidden",
        boxShadow: "0 0 30px rgba(0,0,0,0.5)",
        zIndex: 99999,
      }}
    >
      <div
        style={{
          padding: "16px 20px",
          background: "#2a2a2a",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h3 style={{ margin: 0 }}>{translation?.name ?? "Objeto"}</h3>

        <button
          onClick={onClose}
          style={{
            border: "none",
            background: "#e53935",
            color: "#fff",
            width: 32,
            height: 32,
            borderRadius: 8,
            cursor: "pointer",
          }}
        >
          x
        </button>
      </div>

      <div style={{ padding: 20 }}>
        <div style={{ display: "flex", gap: 20 }}>
          <img
            src={furniture?.item?.imageUrl}
            alt=""
            style={{
              width: 96,
              height: 96,
              objectFit: "contain",
              imageRendering: "pixelated",
              background: "#111",
              borderRadius: 10,
              padding: 10,
            }}
          />

          <div style={{ flex: 1 }}>
            <p>
              <strong>Descripcion:</strong>
            </p>
            <p style={{ color: "#ccc", marginTop: 0 }}>
              {translation?.description || "Sin descripcion"}
            </p>
            <p>
              <strong>Tipo:</strong> {worldData?.kind ?? "N/A"}
            </p>
            <p>
              <strong>Tamano:</strong> {worldData?.width} x {worldData?.height}
            </p>
            <p>
              <strong>Interactivo:</strong>{" "}
              {worldData?.isInteractable ? "Si" : "No"}
            </p>
          </div>
        </div>

        <div
          style={{
            marginTop: 20,
            padding: 12,
            background: "#161616",
            borderRadius: 10,
            fontSize: 12,
            color: "#aaa",
          }}
        >
          <div>
            <strong>Room Item ID:</strong>
          </div>
          <div>{furniture.roomItemId}</div>
          <br />
          <div>
            <strong>Owner ID:</strong>
          </div>
          <div>{furniture.ownerId}</div>
          <br />
          <div>
            <strong>Rotacion:</strong>
          </div>
          <div>{furniture.rotation}</div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 10,
            marginTop: 20,
          }}
        >
          <button
            onClick={rotate}
            style={{ ...buttonBase, background: "#ff9800" }}
          >
            Rotar
          </button>

          <button
            onClick={pickUp}
            style={{ ...buttonBase, background: "#43a047" }}
          >
            Recoger
          </button>

          <button
            onClick={move}
            style={{ ...buttonBase, background: "#8e24aa" }}
          >
            Mover
          </button>
        </div>
      </div>
    </div>
  );
}
