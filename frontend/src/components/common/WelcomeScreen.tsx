"use client";

import { useTheme } from "@/context/ThemeContext";

interface WelcomeScreenProps {
  playerName: string;
  level: number;
  currentXp: number;
  maxXp: number;
  missionTitle: string;
  missionProgress: number;
  petName: string;
}

export default function WelcomeScreen({
  playerName = "CODER_X",
  level = 1,
  currentXp = 0,
  maxXp = 100,
  missionTitle = "Aprende los fundamentos de React",
  missionProgress = 50,
  petName = "Bitzi",
}: WelcomeScreenProps) {
  const { theme } = useTheme();

  return (
    <div
      className="flex flex-col min-h-screen font-mono"
      style={{ background: theme.colors.background, color: theme.colors.text }}
    >
      <div className="flex justify-center items-center flex-grow p-4">
        <div
          className="w-full max-w-md rounded-xl p-6 sm:p-8 shadow-lg"
          style={{
            background: theme.colors.card,
            border: `4px solid ${theme.colors.border}`,
          }}
        >
          {/* Header */}
          <div className="text-center mb-6">
            <h1
              className="text-2xl sm:text-3xl font-bold mb-2"
              style={{ color: theme.colors.accent }}
            >
              {`BIENVENIDO/A ${playerName}`.split("").map((letter, index) => (
                <span
                  key={index}
                  className="inline-block transform hover:scale-110 transition-transform duration-300"
                >
                  {letter}
                </span>
              ))}
            </h1>
            <div className="flex justify-center items-center gap-2 sm:gap-4 text-xs sm:text-sm">
              <div
                className="px-2 py-1 rounded-md"
                style={{
                  background: theme.colors.background,
                  border: `2px solid ${theme.colors.border}`,
                }}
              >
                NIVEL: {level}
              </div>
              <div
                className="px-2 py-1 rounded-md"
                style={{
                  background: theme.colors.background,
                  border: `2px solid ${theme.colors.border}`,
                }}
              >
                XP: {currentXp}/{maxXp}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* Mission Card */}
            <div
              className="rounded-md p-4"
              style={{
                background: theme.colors.background,
                border: `2px solid ${theme.colors.border}`,
              }}
            >
              <h2
                className="text-lg sm:text-xl font-bold mb-2 flex items-center"
                style={{ color: theme.colors.accent }}
              >
                <TrophyIcon className="mr-2 h-4 w-4 sm:h-5 sm:w-5" /> MISIÓN DE
                HOY
              </h2>
              <p
                className="mb-3 text-sm sm:text-base"
                style={{ color: theme.colors.text }}
              >
                {missionTitle}
              </p>
              <div
                className="mb-2 text-xs sm:text-sm"
                style={{ color: theme.colors.secondaryText }}
              >
                PROGRESO: {missionProgress}%
              </div>
              <div
                className="w-full h-3 rounded overflow-hidden"
                style={{
                  background: theme.colors.card,
                  border: `1px solid ${theme.colors.border}`,
                }}
              >
                <div
                  className="h-full"
                  style={{
                    width: `${missionProgress}%`,
                    background: theme.colors.accent,
                  }}
                ></div>
              </div>
            </div>

            {/* Mascot Area */}
            <div className="flex flex-col items-center">
              <div
                className="w-24 h-24 sm:w-32 sm:h-32 rounded-md flex items-center justify-center mb-2 relative overflow-hidden"
                style={{
                  background: theme.colors.background,
                  border: `2px solid ${theme.colors.border}`,
                }}
              >
                <div className="w-16 h-16 sm:w-24 sm:h-24 relative">
                  {/* Pixel art mascot */}
                  <div className="absolute inset-0 grid grid-cols-8 grid-rows-8">
                    {Array(64)
                      .fill(0)
                      .map((_, i) => {
                        const row = Math.floor(i / 8);
                        const col = i % 8;
                        const isBody =
                          row >= 2 && row <= 5 && col >= 2 && col <= 5;
                        const isEye = row === 3 && (col === 3 || col === 4);
                        const isMouth = row === 4 && (col === 3 || col === 4);

                        let bgColor = "bg-transparent";
                        if (isBody) bgColor = "bg-[#a855f7]";
                        if (isEye) bgColor = "bg-white";
                        if (isMouth) bgColor = "bg-[#facc15]";

                        return (
                          <div
                            key={i}
                            className={`${bgColor} border`}
                            style={{
                              borderColor: theme.colors.background,
                            }}
                          ></div>
                        );
                      })}
                  </div>
                </div>
              </div>
              <div
                className="text-center text-xs sm:text-sm"
                style={{ color: theme.colors.text }}
              >
                TU COMPAÑERO:{" "}
                <span style={{ color: theme.colors.accent }}>{petName}</span>
              </div>
            </div>

            {/* Training Buttons */}
            <div>
              <h2
                className="text-lg sm:text-xl font-bold mb-3"
                style={{ color: theme.colors.accent }}
              >
                SELECCIONA TU ENTRENAMIENTO:
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                <button
                  className="w-full py-2 rounded-md font-bold hover:scale-105 transition-transform duration-300 flex items-center justify-center"
                  style={{
                    background: theme.colors.button,
                    color: theme.colors.buttonText,
                    border: `2px solid ${theme.colors.border}`,
                  }}
                >
                  <MonitorIcon className="mr-1 h-4 w-4" /> JS BÁSICO
                </button>
                <button
                  className="w-full py-2 rounded-md font-bold hover:scale-105 transition-transform duration-300 flex items-center justify-center"
                  style={{
                    background: theme.colors.button,
                    color: theme.colors.buttonText,
                    border: `2px solid ${theme.colors.border}`,
                  }}
                >
                  <MonitorIcon className="mr-1 h-4 w-4" /> PYTHON
                </button>
                <button
                  className="w-full py-2 rounded-md font-bold hover:scale-105 transition-transform duration-300 flex items-center justify-center"
                  style={{
                    background: theme.colors.button,
                    color: theme.colors.buttonText,
                    border: `2px solid ${theme.colors.border}`,
                  }}
                >
                  <ScrollIcon className="mr-1 h-4 w-4" /> RETOS DIARIOS
                </button>
                <button
                  className="w-full py-2 rounded-md font-bold hover:scale-105 transition-transform duration-300 flex items-center justify-center"
                  style={{
                    background: theme.colors.button,
                    color: theme.colors.buttonText,
                    border: `2px solid ${theme.colors.border}`,
                  }}
                >
                  <TrophyIcon className="mr-1 h-4 w-4" /> JEFES FINALES
                </button>
              </div>
            </div>

            {/* Footer Menu */}
            <div
              className="pt-4 border-t-2"
              style={{ borderColor: theme.colors.border }}
            >
              <div className="flex justify-around">
                <button
                  className="flex flex-col items-center transition-transform duration-300 hover:scale-105"
                  style={{ color: theme.colors.text }}
                >
                  <PackageIcon className="h-5 w-5 sm:h-6 sm:w-6 mb-1" />
                  <span className="text-xs">MI PERFIL</span>
                </button>
                <button
                  className="flex flex-col items-center transition-transform duration-300 hover:scale-105"
                  style={{ color: theme.colors.text }}
                >
                  <div
                    className="h-5 w-5 sm:h-6 sm:w-6 mb-1 rounded-full"
                    style={{ background: theme.colors.accent }}
                  ></div>
                  <span className="text-xs">BITZI</span>
                </button>
                <button
                  className="flex flex-col items-center transition-transform duration-300 hover:scale-105"
                  style={{ color: theme.colors.text }}
                >
                  <ScrollIcon className="h-5 w-5 sm:h-6 sm:w-6 mb-1" />
                  <span className="text-xs">NOTICIAS DEL GREMIO</span>
                </button>
              </div>
            </div>
          </div>

          {/* Tip Section */}
          <div
            className="mt-4 p-3 rounded-md"
            style={{
              background: theme.colors.background,
              border: `2px solid ${theme.colors.border}`,
            }}
          >
            <p
              className="text-xs"
              style={{ color: theme.colors.secondaryText }}
            >
              <span style={{ color: theme.colors.success }}>// </span>
              Tip: Completa misiones diarias para ganar XP y subir de nivel
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Inline SVG icons to avoid external dependencies
function MonitorIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect width="20" height="14" x="2" y="3" rx="2" />
      <line x1="8" x2="16" y1="21" y2="21" />
      <line x1="12" x2="12" y1="17" y2="21" />
    </svg>
  );
}

function PackageIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M16.5 9.4 7.55 4.24" />
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.29 7 12 12 20.71 7" />
      <line x1="12" x2="12" y1="22" y2="12" />
    </svg>
  );
}

function ScrollIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M8 21h12a2 2 0 0 0 2-2v-2H10v2a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v3h4" />
      <path d="M19 17V5a2 2 0 0 0-2-2H4" />
    </svg>
  );
}

function TrophyIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  );
}
