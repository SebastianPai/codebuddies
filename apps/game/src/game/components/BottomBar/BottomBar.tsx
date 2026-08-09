"use client";

import { memo, useRef, useState } from "react";
import { Palette, Send } from "lucide-react";
import "./BottomBar.css";
import ChatThemePopover from "./ChatThemePopover";
import { audioManager } from "../../audio/AudioManager";
import { useTranslation } from "../../../i18n/useTranslation";

const QUICK_REACTIONS = [
  { emoji: "👋", textKey: "hud.bottomBar.reactionWave", action: "wave" },
  { emoji: "😂", textKey: "hud.bottomBar.reactionLaugh", action: "laugh" },
  { emoji: "🔥", textKey: "hud.bottomBar.reactionFire", action: "fire" },
  { emoji: "✌️", textKey: "hud.bottomBar.reactionBye", action: "bye" },
];

function BottomBar() {
  const t = useTranslation();
  const chatInputRef = useRef<HTMLInputElement>(null);
  const themeButtonRef = useRef<HTMLButtonElement>(null);
  const [message, setMessage] = useState("");
  const [themePopover, setThemePopover] = useState<{ x: number; y: number } | null>(null);

  const connectedPlayers = 98;

  const toggleThemePopover = () => {
    if (themePopover) {
      setThemePopover(null);
      return;
    }
    const rect = themeButtonRef.current?.getBoundingClientRect();
    if (!rect) return;
    setThemePopover({ x: rect.left + rect.width / 2, y: rect.top });
  };

  // El tema de burbuja elegido en Ajustes vive en localStorage (mismo
  // criterio que pcTheme/uiLanguage, ver PCWindows.tsx/LanguageContext.tsx)
  // — se lee al vuelo acá en vez de mantener estado propio, porque esta
  // barra no necesita reaccionar a cambios de tema mientras está montada.
  const getChatBubbleThemeId = () => {
    if (typeof window === "undefined") return undefined;
    return window.localStorage.getItem("chatBubbleThemeId") || undefined;
  };

  const sendChat = () => {
    const socket = (window as any).phaserSocket;
    if (!message.trim() || !socket) return;

    socket.emit("playerChat", { message, chatBubbleThemeId: getChatBubbleThemeId() });
    setMessage("");
    chatInputRef.current?.focus();
  };

  const sendReaction = (reaction: string) => {
    const socket = (window as any).phaserSocket;
    if (!socket) return;
    socket.emit("playerReaction", { reaction, chatBubbleThemeId: getChatBubbleThemeId() });
    audioManager.play("click");
  };

  return (
    <div className="bottom-bar-wrapper">
      <div className="bottom-fade" />

      <div className="bottom-bar">
        {/* COMPOSER — el mensaje de texto es el protagonista de la barra;
            las reacciones rápidas quedan como atajos secundarios dentro del
            mismo cuerpo, en vez de un bloque grande compitiendo al centro. */}
        <div className="composer">
          <button
            ref={themeButtonRef}
            type="button"
            className="composer-reaction-btn"
            data-label={t("hud.bottomBar.chatThemeTitle")}
            onClick={toggleThemePopover}
          >
            <Palette size={15} />
          </button>

          <div className="composer-divider" />

          <div className="composer-reactions">
            {QUICK_REACTIONS.map((reaction) => (
              <button
                key={reaction.action}
                className="composer-reaction-btn"
                data-label={t(reaction.textKey)}
                onClick={() => sendReaction(reaction.emoji)}
              >
                <span>{reaction.emoji}</span>
              </button>
            ))}
          </div>

          <div className="composer-divider" />

          <input
            ref={chatInputRef}
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendChat()}
            placeholder={t("hud.bottomBar.chatPlaceholder")}
            className="composer-input"
          />

          <button
            onClick={sendChat}
            className="composer-send"
            aria-label={t("hud.bottomBar.send")}
            disabled={!message.trim()}
          >
            <Send size={16} />
          </button>
        </div>

        {/* ONLINE — información ambiental, no forma parte del compositor */}
        <div className="bottom-right">
          <div className="online-shell">
            <div className="online-dot" />
            <span>{t("hud.bottomBar.onlineCount", { count: connectedPlayers })}</span>
          </div>
        </div>
      </div>

      {themePopover && (
        <ChatThemePopover
          x={themePopover.x}
          y={themePopover.y}
          onClose={() => setThemePopover(null)}
        />
      )}
    </div>
  );
}

export default memo(BottomBar);
