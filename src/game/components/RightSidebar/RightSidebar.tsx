"use client";

import { memo, useEffect, useState } from "react";
import { getSharedAuthToken } from "../../network/auth";
import { showGameAlert } from "../../utils/dialog";
import "./RightSidebar.css";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

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
  { name: "Pixel Night", time: "Hoy · 21:00" },
  { name: "PvP Tournament", time: "Mañana · 18:00" },
];

function RightSidebar() {
  const [missions, setMissions] = useState<GameMission[]>([]);
  const [selectedMission, setSelectedMission] = useState<GameMission | null>(null);
  const [showAllMissions, setShowAllMissions] = useState(false);
  const [loadingMissions, setLoadingMissions] = useState(true);
  const [missionError, setMissionError] = useState<string | null>(null);

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
      setMissionError("No se pudieron cargar tus retos.");
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
        title: "No se pudo reclamar",
        message: "La recompensa no esta lista o ya fue reclamada.",
        confirmLabel: "Entendido",
        tone: "danger",
      });
      return;
    }

    await loadMissions();
    await showGameAlert({
      title: "Recompensa reclamada",
      message: "Los premios de la mision fueron agregados a tu cuenta.",
      confirmLabel: "Genial",
      tone: "success",
    });
  };

  const visibleMissionList = showAllMissions
    ? missions
    : selectedMission
      ? [selectedMission]
      : [];

  return (
    <>
      <div className="right-sidebar">
        <div className="sidebar-block room-card">
          <div className="room-preview">
            <div className="room-overlay">
              <div className="room-top">
                <div>
                  <div className="block-label">Sala actual</div>
                  <h2 className="room-name">Lobby Principal</h2>
                </div>
                <div className="live-status">Activa</div>
              </div>
              <div className="room-info">
                <span className="room-online">98 jugadores conectados</span>
              </div>
            </div>
          </div>
        </div>

        <div className="sidebar-block">
          <div className="block-header">
            <div>
              <div className="block-label">Misiones</div>
              <div className="block-title">Retos activos</div>
            </div>
            <button className="soft-button" onClick={() => setShowAllMissions(true)}>
              Ver todo
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
                  Reintentar
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
              <div className="mission-empty">No hay retos activos por ahora.</div>
            )}
          </div>
        </div>

        <div className="sidebar-block">
          <div className="block-header">
            <div>
              <div className="block-label">Eventos</div>
              <div className="block-title">Próximamente</div>
            </div>
          </div>
          <div className="events-list">
            {events.map((event) => (
              <div key={event.name} className="event-item">
                <div className="event-left">
                  <span className="event-name">{event.name}</span>
                  <span className="event-time">{event.time}</span>
                </div>
                <div className="event-badge">Entrar</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {visibleMissionList.length > 0 && (
        <div className="pixel-window-overlay">
          <div className="pixel-window">
            <div className="pixel-titlebar">
              <div className="pixel-title-left">
                <div className="pixel-app-icon" />
                <span className="pixel-window-title">Mission.exe</span>
              </div>
              <div className="pixel-window-actions">
                <button
                  className="pixel-action-btn close"
                  onClick={() => {
                    setSelectedMission(null);
                    setShowAllMissions(false);
                  }}
                >
                  ×
                </button>
              </div>
            </div>

            <div className="pixel-window-content mission-scroll">
              {visibleMissionList.map((mission) => (
                <div key={mission.id} className="mission-detail-card">
                  <div className="mission-window-tag">Misión activa</div>
                  <h2 className="mission-window-title">{mission.name}</h2>
                  <p className="mission-window-description">{mission.description}</p>

                  <div className="objectives-box">
                    <div className="objectives-title">Progreso</div>
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
                      <span className="reward-label">Recompensa</span>
                      <span className="reward-value">
                        {mission.rewards
                          ?.map((reward) => reward.label || `${reward.amount ?? ""} ${reward.type}`)
                          .join(" · ") || "Sin recompensa"}
                      </span>
                    </div>
                    <button
                      className="reward-button"
                      disabled={mission.progress.status !== "COMPLETED"}
                      onClick={() => void claimMission(mission.id)}
                    >
                      {mission.progress.status === "CLAIMED" ? "Reclamada" : "Reclamar"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default memo(RightSidebar);
