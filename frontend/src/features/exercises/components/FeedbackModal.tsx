import { FC } from "react";
import { useTheme } from "@/context/ThemeContext";

interface UserProgress {
  xp: number;
  level: number;
  maxXp: number;
  coins: number;
  streak: number;
  lives: number;
  gainedXp?: number;
  gainedCoins?: number;
  isAlreadyCompleted?: boolean;
  newAchievements?: { name: string }[];
}

interface ModalContent {
  isCorrect: boolean;
  message: string;
  results: {
    [lang: string]: {
      isCorrect: boolean;
      message: string;
      feedback: string[];
    };
  };
}

interface FeedbackModalProps {
  isModalOpen: boolean;
  setIsModalOpen: (isOpen: boolean) => void;
  modalContent: ModalContent;
  userProgress: UserProgress | null;
  handleNavigate: (direction: string) => void;
}

export const FeedbackModal: FC<FeedbackModalProps> = ({
  isModalOpen,
  setIsModalOpen,
  modalContent,
  userProgress,
  handleNavigate,
}) => {
  const { theme } = useTheme();

  if (!isModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-80 flex justify-center items-center p-4">
      <div
        className="p-8 rounded-lg max-w-md w-full animate-pulse"
        style={{
          background: theme.colors.card,
          border: `4px solid ${
            modalContent.isCorrect ? theme.colors.success : theme.colors.error
          }`,
        }}
      >
        <div className="flex justify-center mb-4">
          <div
            className="flex items-center justify-center w-12 h-12 rounded-full"
            style={{
              background: modalContent.isCorrect
                ? theme.colors.success
                : theme.colors.error,
            }}
          >
            <span className="text-2xl">
              {modalContent.isCorrect ? "🎉" : "💀"}
            </span>
          </div>
        </div>
        <h1
          className="text-3xl uppercase font-mono text-center font-bold tracking-widest mb-4"
          style={{
            color: modalContent.isCorrect
              ? theme.colors.success
              : theme.colors.error,
          }}
        >
          {modalContent.isCorrect ? "¡ÉXITO!" : "¡ERROR!"}
        </h1>
        <div
          className="p-4 rounded-md"
          style={{
            border: `2px solid ${
              modalContent.isCorrect ? theme.colors.success : theme.colors.error
            }`,
            background: theme.colors.background,
          }}
        >
          <p
            className="text-center font-mono text-sm uppercase tracking-wide"
            style={{ color: theme.colors.highlightText }}
          >
            {modalContent.message}
          </p>
          {/* Mostrar feedback detallado */}
          {!modalContent.isCorrect && modalContent.results && (
            <div className="mt-4">
              {Object.entries(modalContent.results).map(([lang, result]) => (
                <div key={lang} className="mb-4">
                  <h3
                    className="font-mono text-sm uppercase"
                    style={{ color: theme.colors.highlightText }}
                  >
                    {lang.toUpperCase()}
                  </h3>
                  <ul className="list-disc pl-5">
                    {result.feedback && result.feedback.length > 0 ? (
                      result.feedback.map((msg, index) => (
                        <li
                          key={index}
                          className="font-mono text-xs"
                          style={{ color: theme.colors.text }}
                        >
                          {msg}
                        </li>
                      ))
                    ) : (
                      <li
                        className="font-mono text-xs"
                        style={{ color: theme.colors.text }}
                      >
                        {result.message}
                      </li>
                    )}
                  </ul>
                </div>
              ))}
            </div>
          )}
          <div className="flex justify-center mt-4">
            <div className="relative">
              <img
                src={
                  modalContent.isCorrect
                    ? "/images/feliz1.png"
                    : "/images/triste2.png"
                }
                alt={
                  modalContent.isCorrect ? "Mascota feliz" : "Mascota triste"
                }
                className="mx-auto w-24 h-24 pixelated animate-bounce"
                onError={(e) => {
                  e.currentTarget.src = "/images/default-bitzi.jpg";
                }}
              />
              <div className="absolute -top-2 -right-2 text-xl animate-bounce">
                {modalContent.isCorrect ? "😊" : "😢"}
              </div>
            </div>
          </div>
          <p
            className="text-center mt-4 font-mono text-xs"
            style={{ color: theme.colors.text }}
          >
            <span
              style={{
                color: modalContent.isCorrect
                  ? theme.colors.success
                  : theme.colors.error,
              }}
            >
              BITZI
            </span>{" "}
            ESTÁ {modalContent.isCorrect ? "FELIZ" : "TRISTE"}...
          </p>
          {modalContent.isCorrect && userProgress && (
            <div className="mt-4">
              <p
                className="text-center font-mono text-sm"
                style={{ color: theme.colors.highlightText }}
              >
                {userProgress.isAlreadyCompleted
                  ? "Misión ya completada. ¡Solo se otorgan 10 XP y 5 monedas la primera vez!"
                  : userProgress.gainedXp && userProgress.gainedXp > 0
                  ? `+${userProgress.gainedXp} XP GANADOS`
                  : "Ejercicio completado"}
              </p>
              {userProgress.gainedCoins && userProgress.gainedCoins > 0 && (
                <p
                  className="text-center font-mono text-sm mt-2"
                  style={{ color: theme.colors.highlightText }}
                >
                  +{userProgress.gainedCoins} MONEDAS GANADAS
                </p>
              )}
              {userProgress.newAchievements &&
                userProgress.newAchievements.length > 0 && (
                  <div className="mt-2">
                    {userProgress.newAchievements.map((achievement) => (
                      <p
                        key={achievement.name}
                        className="text-center font-mono text-sm"
                        style={{ color: theme.colors.highlightText }}
                      >
                        Logro: {achievement.name}
                      </p>
                    ))}
                  </div>
                )}
              <p
                className="text-center font-mono text-xs mt-2"
                style={{ color: theme.colors.text }}
              >
                TOTAL: {userProgress.xp}/{userProgress.maxXp} XP
              </p>
              <div className="mt-2">
                <div
                  className="h-2 rounded-full"
                  style={{ background: theme.colors.progressBackground }}
                >
                  <div
                    className="h-2 rounded-full"
                    style={{
                      background: theme.colors.progressFill,
                      width: `${(userProgress.xp / userProgress.maxXp) * 100}%`,
                    }}
                  ></div>
                </div>
              </div>
              <p
                className="text-center font-mono text-xs mt-2"
                style={{ color: theme.colors.text }}
              >
                MONEDAS: {userProgress.coins}
              </p>
              <p
                className="text-center font-mono text-xs mt-2"
                style={{ color: theme.colors.text }}
              >
                RACHA: {userProgress.streak} DÍAS
              </p>
              <p
                className="text-center font-mono text-xs mt-2"
                style={{ color: theme.colors.text }}
              >
                VIDAS: {userProgress.lives}
              </p>
            </div>
          )}
          {!modalContent.isCorrect && userProgress && (
            <div className="mt-4">
              <p
                className="text-center font-mono text-sm"
                style={{ color: theme.colors.highlightText }}
              >
                Intenta de nuevo para ganar XP
              </p>
              <p
                className="text-center font-mono text-xs mt-2"
                style={{ color: theme.colors.text }}
              >
                TOTAL: {userProgress.xp}/{userProgress.maxXp} XP
              </p>
              <div className="mt-2">
                <div
                  className="h-2 rounded-full"
                  style={{ background: theme.colors.progressBackground }}
                >
                  <div
                    className="h-2 rounded-full"
                    style={{
                      background: theme.colors.progressFill,
                      width: `${(userProgress.xp / userProgress.maxXp) * 100}%`,
                    }}
                  ></div>
                </div>
              </div>
              <p
                className="text-center font-mono text-xs mt-2"
                style={{ color: theme.colors.text }}
              >
                MONEDAS: {userProgress.coins}
              </p>
              <p
                className="text-center font-mono text-xs mt-2"
                style={{ color: theme.colors.text }}
              >
                RACHA: {userProgress.streak} DÍAS
              </p>
              <p
                className="text-center font-mono text-xs mt-2"
                style={{ color: theme.colors.text }}
              >
                VIDAS: {userProgress.lives}
              </p>
            </div>
          )}
        </div>
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            onClick={() => {
              setIsModalOpen(false);
              if (modalContent.isCorrect) {
                handleNavigate("next");
              }
            }}
            className="border-2 hover:scale-105 transition duration-150 py-2 rounded-md font-bold uppercase tracking-widest px-4 flex items-center justify-center"
            style={{
              background: modalContent.isCorrect
                ? theme.colors.success
                : theme.colors.error,
              color: theme.colors.buttonText,
              borderColor: theme.colors.border,
            }}
          >
            <span className="mr-2">{modalContent.isCorrect ? "➡️" : "🔄"}</span>
            {modalContent.isCorrect ? "Continuar" : "Reintentar"}
          </button>
          <button
            onClick={() => setIsModalOpen(false)}
            className="border-2 hover:scale-105 transition duration-150 py-2 rounded-md font-bold uppercase tracking-widest px-4 flex items-center justify-center"
            style={{
              background: theme.colors.secondaryButton,
              color: theme.colors.buttonText,
              borderColor: theme.colors.border,
            }}
          >
            <span className="mr-2">❌</span> Cerrar
          </button>
        </div>
        {userProgress && (
          <div
            className="mt-6 border-t-2 pt-4"
            style={{
              borderColor: modalContent.isCorrect
                ? theme.colors.success
                : theme.colors.error,
            }}
          >
            <div className="flex justify-between">
              <div
                className="font-mono text-xs"
                style={{ color: theme.colors.highlightText }}
              >
                NIVEL: {userProgress.level}
              </div>
              <div
                className="font-mono text-xs"
                style={{ color: theme.colors.highlightText }}
              >
                VIDAS: {"❤️".repeat(userProgress.lives)}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
