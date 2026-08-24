"use client";

import { memo, useEffect, useState } from "react";
import { Settings, X } from "lucide-react";
import { getSharedAuthToken } from "../../network/auth";
import { showGameAlert } from "../../utils/dialog";
import Modal from "../shared/Modal";
import Button from "../shared/Button";
import { useTranslation } from "../../../i18n/useTranslation";
import { useViewportMode } from "../../hooks/useViewportMode";
import { getApiUrl } from "../../../config/env";
import chromeStyles from "../shared/windowChrome.module.css";
import "./RightSidebar.css";

const API_URL = getApiUrl();

type GameMission = {
  id: string;
  name: string;
  description: string;
  rewards?: Array<{ label?: string; type?: string; amount?: number }>;
  progress: {
    currentValue: number;
    targetValue: number;
    status: string;
    percentage: number;
  };
};

const events = [
  { name: "Pixel Night", timeKey: "today" as const, time: "21:00" },
  { name: "PvP Tournament", timeKey: "tomorrow" as const, time: "18:00" },
];

interface Props {
  roomName?: string;
  thumbnailUrl?: string | null;
  // "Editar Mundo" (el engranaje) solo se muestra si el jugador tiene algún
  // permiso administrativo en la sala actual (dueño, o cualquier flag
  // granular relevante) — Game.tsx ya sabe esto vía myPermissions.
  canManageRoom?: boolean;
  // "Invitar" es más específico: solo tiene sentido si puede gestionar
  // invitados, aunque no tenga el resto de permisos administrativos.
  canInvite?: boolean;
  onOpenEditWorld?: () => void;
  onOpenRoomInfo?: () => void;
  onOpenInvite?: () => void;
}

function RightSidebar({
  roomName,
  thumbnailUrl,
  canManageRoom,
  canInvite,
  onOpenEditWorld,
  onOpenRoomInfo,
  onOpenInvite,
}: Props) {
  const t = useTranslation();
  const [missions, setMissions] = useState<GameMission[]>([]);
  const [selectedMission, setSelectedMission] = useState<GameMission | null>(null);
  const [showAllMissions, setShowAllMissions] = useState(false);
  const [loadingMissions, setLoadingMissions] = useState(true);
  const [missionError, setMissionError] = useState<string | null>(null);
  const { layout } = useViewportMode();

  // Antes este panel se ocultaba por completo (display:none) debajo de
  // 1300px de viewport — abajo de eso no había forma de verlo. Ahora se
  // colapsa a una píldora chica en vez de desaparecer: sigue siendo
  // alcanzable con un toque. Un toggle manual del usuario pisa el default
  // hasta que cambie el layout.
  const [collapsed, setCollapsed] = useState(false);
  const [userToggled, setUserToggled] = useState(false);
  useEffect(() => {
    if (userToggled) return;
    setCollapsed(layout !== "desktop");
  }, [layout, userToggled]);

  const loadMissions = async () => {
    const token = getSharedAuthToken();
    if (!token) return;

    setMissionError(null);
    try {
      const response = await fetch(`${API_URL}/missions`, {
        credentials: "include",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("MISSIONS_LOAD_FAILED");

      const data = await response.json();
      setMissions(data.items ?? []);
    } catch {
      setMissionError(t("hud.missions.loadError"));
    } finally {
      setLoadingMissions(false);
    }
  };

  useEffect(() => {
    void loadMissions();
  }, []);

  useEffect(() => {
    const refresh = () => void loadMissions();
    window.addEventListener("game:missions:refresh", refresh);
    return () => window.removeEventListener("game:missions:refresh", refresh);
  }, []);

  const claimMission = async (missionId: string) => {
    const token = getSharedAuthToken();
    if (!token) return;

    const response = await fetch(`${API_URL}/missions/${missionId}/claim`, {
      method: "POST",
      credentials: "include",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      await showGameAlert({
        title: t("hud.missions.claimFailedTitle"),
        message: t("hud.missions.claimFailedMessage"),
        confirmLabel: t("common.understood"),
        tone: "danger",
      });
      return;
    }

    await loadMissions();
    await showGameAlert({
      title: t("hud.missions.claimSuccessTitle"),
      message: t("hud.missions.claimSuccessMessage"),
      confirmLabel: t("hud.missions.claimSuccessConfirm"),
      tone: "success",
    });
  };

  const visibleMissionList = showAllMissions
    ? missions
    : selectedMission
      ? [selectedMission]
      : [];

  if (layout !== "desktop" && collapsed) {
    return (
      <button
        type="button"
        className={`right-sidebar-pill ${chromeStyles.closeHitArea}`}
        onClick={() => {
          setUserToggled(true);
          setCollapsed(false);
        }}
        aria-label={t("hud.room.expand")}
      >
        <span className="right-sidebar-pill-name">{roomName || t("hud.room.lobbyName")}</span>
        {missions.some((mission) => mission.progress.status === "COMPLETED") && (
          <span className="right-sidebar-pill-dot" />
        )}
      </button>
    );
  }

  return (
    <>
      <div className="right-sidebar">
        {layout !== "desktop" && (
          <button
            type="button"
            className={`right-sidebar-collapse ${chromeStyles.closeHitArea}`}
            onClick={() => {
              setUserToggled(true);
              setCollapsed(true);
            }}
            aria-label={t("hud.room.collapse")}
          >
            <X size={14} />
          </button>
        )}

        <div className="sidebar-block room-card">
          <div
            className="room-preview"
            style={thumbnailUrl ? { backgroundImage: `url(${thumbnailUrl})` } : undefined}
          >
            <div className="room-overlay">
              <div className="room-top">
                <div>
                  <div className="block-label">{t("hud.room.currentLabel")}</div>
                  <h2 className="room-name">{roomName || t("hud.room.lobbyName")}</h2>
                </div>
                <div className="room-top-right">
                  {canManageRoom && onOpenEditWorld && (
                    <button
                      type="button"
                      className="soft-button icon-only"
                      title={t("rooms.editWorldButton")}
                      aria-label={t("rooms.editWorldButton")}
                      onClick={onOpenEditWorld}
                    >
                      <Settings size={14} />
                    </button>
                  )}
                  <div className="live-status">{t("hud.room.liveStatus")}</div>
                </div>
              </div>
              <div className="room-info">
                {/* "98" es un valor fijo de ejemplo (no viene de ningún dato
                    real de ocupación) — pre-existente, no lo agregué yo en
                    este cambio, pero queda anotado acá para no perderlo de
                    vista. */}
                <span className="room-online">{t("hud.room.playersOnline", { count: 98 })}</span>
                <div className="room-actions">
                  {onOpenRoomInfo && (
                    <button type="button" className="soft-button" onClick={onOpenRoomInfo}>
                      {t("hud.room.infoButton")}
                    </button>
                  )}
                  {canInvite && onOpenInvite && (
                    <button type="button" className="soft-button primary" onClick={onOpenInvite}>
                      {t("hud.room.inviteButton")}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="sidebar-block">
          <div className="block-header">
            <div>
              <div className="block-label">{t("hud.missions.label")}</div>
              <div className="block-title">{t("hud.missions.sectionTitle")}</div>
            </div>
            <button className="soft-button" onClick={() => setShowAllMissions(true)}>
              {t("hud.missions.viewAll")}
            </button>
          </div>

          <div className="missions-list">
            {loadingMissions && (
              <>
                <div className="mission-skeleton" />
                <div className="mission-skeleton" />
              </>
            )}
            {missionError && (
              <div className="mission-empty">
                {missionError}
                <button className="soft-button inline" onClick={() => void loadMissions()}>
                  {t("common.retry")}
                </button>
              </div>
            )}
            {!loadingMissions && !missionError && missions.slice(0, 2).map((mission) => (
              <button
                key={mission.id}
                className="mission-item"
                onClick={() => setSelectedMission(mission)}
              >
                <div className="mission-top">
                  <span className="mission-title">{mission.name}</span>
                  <span className="mission-percent">{mission.progress.percentage}%</span>
                </div>
                <div className="mission-bar">
                  <div
                    className="mission-fill"
                    style={{ width: `${mission.progress.percentage}%` }}
                  />
                </div>
              </button>
            ))}
            {!loadingMissions && !missionError && !missions.length && (
              <div className="mission-empty">{t("hud.missions.empty")}</div>
            )}
          </div>
        </div>

        <div className="sidebar-block">
          <div className="block-header">
            <div>
              <div className="block-label">{t("hud.events.label")}</div>
              <div className="block-title">{t("hud.events.sectionTitle")}</div>
            </div>
          </div>
          <div className="events-list">
            {events.map((event) => (
              <div key={event.name} className="event-item">
                <div className="event-left">
                  <span className="event-name">{event.name}</span>
                  <span className="event-time">
                    {t(`hud.events.${event.timeKey}`)} · {event.time}
                  </span>
                </div>
                <div className="event-badge">{t("hud.events.join")}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {visibleMissionList.length > 0 && (
        <Modal
          title={t("hud.missions.label")}
          onClose={() => {
            setSelectedMission(null);
            setShowAllMissions(false);
          }}
        >
          {visibleMissionList.map((mission) => (
            <article key={mission.id} className="mission-detail-card">
              <div className="mission-window-tag">{t("hud.missions.activeTag")}</div>
              <h3 className="mission-window-title">{mission.name}</h3>
              <p className="mission-window-description">{mission.description}</p>

              <div className="objectives-box">
                <div className="objectives-title">{t("hud.missions.progressLabel")}</div>
                <div className="objective-item">
                  <div className="objective-check" />
                  <span>
                    {mission.progress.currentValue} / {mission.progress.targetValue}
                  </span>
                </div>
                <div className="mission-bar">
                  <div
                    className="mission-fill"
                    style={{ width: `${mission.progress.percentage}%` }}
                  />
                </div>
              </div>

              <div className="reward-bar">
                <div className="reward-left">
                  <span className="reward-label">{t("hud.missions.rewardLabel")}</span>
                  <span className="reward-value">
                    {mission.rewards
                      ?.map((reward) => reward.label || `${reward.amount ?? ""} ${reward.type}`)
                      .join(" · ") || t("hud.missions.noReward")}
                  </span>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={mission.progress.status !== "COMPLETED"}
                  onClick={() => void claimMission(mission.id)}
                >
                  {mission.progress.status === "CLAIMED" ? t("hud.missions.claimed") : t("hud.missions.claim")}
                </Button>
              </div>
            </article>
          ))}
        </Modal>
      )}
    </>
  );
}

export default memo(RightSidebar);
