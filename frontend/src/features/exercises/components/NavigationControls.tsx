import { useMemo } from "react";
import { useTheme } from "@/context/ThemeContext";
import { ChevronLeft, ChevronRight, Code, Info } from "lucide-react";
import { Exercise, Lesson } from "@/types/exercise";

interface NavigationControlsProps {
  exercise: Exercise | null;
  lesson: Lesson | null;
  isExerciseCompleted: boolean;
  htmlCode: string;
  cssCode: string;
  jsCode: string;
  onNavigate: (direction: "prev" | "next") => void;
  onCheckAnswer: () => Promise<void>;
  userProgress: {
    xp: number;
    maxXp: number;
    level: number;
    gainedXp?: number;
    isAlreadyCompleted?: boolean;
  } | null;
  hasNextLesson: boolean;
}

export const NavigationControls = ({
  exercise,
  lesson,
  isExerciseCompleted,
  htmlCode,
  cssCode,
  jsCode,
  onNavigate,
  onCheckAnswer,
  userProgress,
  hasNextLesson,
}: NavigationControlsProps) => {
  const { theme } = useTheme();

  // Memoizar estilos
  const themeStyles = useMemo(
    () => ({
      background: theme.colors.background,
      text: theme.colors.text,
      accent: theme.colors.accent,
      accenttwo: theme.colors.accenttwo,
      border: theme.colors.border,
      card: theme.colors.card,
      buttonText: theme.colors.buttonText,
      progressBackground: theme.colors.progressBackground || "#4B5563",
      progressFill: theme.colors.progressFill || "#10B981",
    }),
    [theme]
  );

  const isPrevDisabled =
    !lesson ||
    !exercise ||
    lesson.exercises.findIndex((ex) => ex.order === exercise.order) === 0;

  const isNextDisabled = !lesson || !exercise || !isExerciseCompleted;

  const isCheckDisabled =
    exercise?.language === "html" || exercise?.language === "css"
      ? !htmlCode.trim() && !cssCode.trim()
      : !jsCode.trim();

  return (
    <footer
      className="border-t p-4 flex flex-col md:flex-row items-center justify-between gap-4"
      style={{
        background: themeStyles.card,
        borderColor: themeStyles.border,
      }}
    >
      {/* Información del Ejercicio */}
      <div className="flex items-center space-x-3">
        <button
          className="p-2 rounded-lg"
          style={{
            background: themeStyles.background,
            color: themeStyles.text,
            border: `2px solid ${themeStyles.border}`,
          }}
          aria-label="Ícono de código"
        >
          <Code className="w-5 h-5" />
        </button>
        <div className="text-sm">
          <div
            className="font-mono font-semibold text-base"
            style={{ color: themeStyles.text }}
          >
            {exercise ? `${exercise.order}. ${exercise.title}` : "Cargando..."}
          </div>
          <div
            className="font-mono text-xs"
            style={{ color: themeStyles.accent }}
          >
            NIVEL: {userProgress ? userProgress.level : 1}
          </div>
        </div>
      </div>

      {/* Botones de Navegación */}
      <div className="flex items-center space-x-2">
        <button
          onClick={() => onNavigate("prev")}
          disabled={isPrevDisabled}
          className="px-3 py-1.5 rounded-lg font-mono text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-transform hover:scale-105"
          style={{
            background: themeStyles.background,
            color: themeStyles.text,
            border: `2px solid ${themeStyles.border}`,
          }}
          aria-label="Ejercicio anterior"
        >
          <ChevronLeft className="w-4 h-4 inline mr-1" />
          Anterior
        </button>
        <button
          onClick={onCheckAnswer}
          disabled={isCheckDisabled}
          className="px-4 py-1.5 rounded-lg font-mono text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-transform hover:scale-105"
          style={{
            background: themeStyles.accent,
            color: themeStyles.buttonText,
            border: `2px solid ${themeStyles.accent}`,
          }}
          aria-label="Comprobar respuesta"
        >
          Comprobar
        </button>
        <button
          onClick={() => onNavigate("next")}
          disabled={isNextDisabled}
          className="px-3 py-1.5 rounded-lg font-mono text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-transform hover:scale-105"
          style={{
            background: themeStyles.background,
            color: themeStyles.text,
            border: `2px solid ${themeStyles.border}`,
          }}
          aria-label="Próximo ejercicio"
        >
          Próximo
          <ChevronRight className="w-4 h-4 inline ml-1" />
        </button>
        <button
          className="p-2 rounded-lg transition-transform hover:scale-105"
          style={{
            background: themeStyles.background,
            color: themeStyles.text,
            border: `2px solid ${themeStyles.border}`,
          }}
          aria-label="Información adicional"
        >
          <Info className="w-5 h-5" />
        </button>
      </div>

      {/* Barra de Progreso */}
      <div className="flex items-center">
        <div className="flex flex-col items-end space-y-1">
          <div
            className="text-sm font-mono"
            style={{ color: themeStyles.accent }}
          >
            XP: {userProgress ? userProgress.xp : 0}/
            {userProgress ? userProgress.maxXp : 100}
          </div>
          <div
            className="w-28 h-2 rounded-full"
            style={{ background: themeStyles.progressBackground }}
          >
            <div
              className="h-2 rounded-full"
              style={{
                background: themeStyles.progressFill,
                width: `${
                  userProgress
                    ? (userProgress.xp / userProgress.maxXp) * 100
                    : 0
                }%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Estilos */}
      <style>
        {`
          @media (max-width: 640px) {
            .text-base { font-size: 0.875rem; }
            .text-sm { font-size: 0.75rem; }
            .w-28 { width: 5rem; }
            .px-3 { padding-left: 0.5rem; padding-right: 0.5rem; }
            .px-4 { padding-left: 0.75rem; padding-right: 0.75rem; }
            .py-1.5 { padding-top: 0.25rem; padding-bottom: 0.25rem; }
          }
        `}
      </style>
    </footer>
  );
};
