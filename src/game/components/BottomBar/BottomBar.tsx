"use client";

import { memo, useRef, useState } from "react";
import "./BottomBar.css";
import { audioManager } from "../../audio/AudioManager";

const QUICK_REACTIONS = [
  { emoji: "👋", text: "Saludar", action: "wave" },
  { emoji: "😂", text: "Reír", action: "laugh" },
  { emoji: "🔥", text: "Fuego", action: "fire" },
  { emoji: "✌️", text: "Adiós", action: "bye" },
];

function BottomBar() {
  const chatInputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState("");

  const connectedPlayers = 98;

  const sendChat = () => {
    const socket = (window as any).phaserSocket;
    if (!message.trim() || !socket) return;

    socket.emit("playerChat", { message });
    setMessage("");
    chatInputRef.current?.focus();
  };

  const sendReaction = (reaction: string) => {
    const socket = (window as any).phaserSocket;
    if (!socket) return;
    socket.emit("playerReaction", { reaction });
    audioManager.play("click");
  };

  return (
    <div className="bottom-bar-wrapper">
      <div className="bottom-fade" />

      <div className="bottom-bar">
        {/* LEFT - CHAT */}
        <div className="bottom-left">
          <div className="chat-shell">
            <input
              ref={chatInputRef}
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendChat()}
              placeholder="Enviar mensaje..."
              className="chat-input"
            />
            <button onClick={sendChat} className="send-btn">
              ENVIAR
            </button>
          </div>
        </div>

        {/* CENTER - REACTIONS */}
        <div className="bottom-center">
          <div className="reaction-shell">
            {QUICK_REACTIONS.map((reaction) => (
              <button
                key={reaction.action}
                className="reaction-btn"
                data-label={reaction.text}
                onClick={() => sendReaction(reaction.emoji)}
              >
                <span>{reaction.emoji}</span>
              </button>
            ))}
          </div>
        </div>

        {/* RIGHT - ONLINE */}
        <div className="bottom-right">
          <div className="online-shell">
            <div className="online-dot" />
            <span>{connectedPlayers} conectados</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(BottomBar);
