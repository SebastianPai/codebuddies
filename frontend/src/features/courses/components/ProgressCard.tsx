// frontend/src/components/ProgressCard.tsx
import { Trophy, Sparkles, Rocket } from "lucide-react";
import { Lesson, Progress } from "@/types/course";
import { useTheme } from "@/context/ThemeContext";
import { calculateProgress } from "../utils/courseUtils";

interface ProgressCardProps {
  lessons: Lesson[];
  progress: Progress[];
}

export const ProgressCard: React.FC<ProgressCardProps> = ({
  lessons,
  progress,
}) => {
  const { theme } = useTheme();
  const { total, completed, percentage } = calculateProgress(lessons, progress);

  const getMotivationalMessage = () => {
    if (percentage === 100)
      return "¡Curso completado! Eres un maestro del código 🎉";
    if (percentage >= 75)
      return "¡Imparable! Solo un poco más para dominar este curso 💪";
    if (percentage >= 50) return "¡A mitad de camino! Sigue programando 🚀";
    if (percentage >= 25) return "¡Buen comienzo! Cada ejercicio cuenta 🌟";
    return "¡Tu aventura acaba de empezar! Resuelve más ejercicios 🛠️";
  };

  return (
    <div
      className="rounded-xl p-6 border-4 animate-course-item shine"
      style={{
        background: `linear-gradient(135deg, ${theme.colors.card} 0%, ${theme.colors.background} 100%)`,
        borderColor: theme.colors.border,
        boxShadow: "0 10px 25px rgba(0, 0, 0, 0.2)",
      }}
    >
      <h3
        className="mb-4 flex items-center text-lg font-bold"
        style={{ color: theme.colors.text }}
      >
        <Trophy
          className={`w-6 h-6 mr-2 ${
            percentage === 100 ? "animate-pulse" : ""
          }`}
          style={{ color: theme.colors.accent }}
        />
        Progreso del curso
      </h3>
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center">
            <div
              className="w-6 h-6 rounded-lg mr-2 border-4"
              style={{
                background: theme.colors.accent,
                borderColor: theme.colors.border,
                boxShadow: "0 4px 14px rgba(0, 0, 0, 0.1)",
              }}
            ></div>
            <span className="text-sm" style={{ color: theme.colors.text }}>
              Ejercicios
            </span>
          </div>
          <span
            className="text-sm"
            style={{ color: theme.colors.secondaryText }}
          >
            {completed} / {total}
          </span>
        </div>
        <div
          className="w-full rounded-lg h-4 border-4 overflow-hidden"
          style={{
            background: theme.colors.background,
            borderColor: theme.colors.border,
          }}
        >
          <div
            className="h-full rounded-sm transition-all duration-500"
            style={{
              background: `linear-gradient(90deg, ${theme.colors.accent} 0%, ${theme.colors.primary} 100%)`,
              width: `${percentage}%`,
              boxShadow: `0 0 10px ${theme.colors.accent}`,
            }}
          />
        </div>
        <div
          className="mt-2 text-xs text-center"
          style={{ color: theme.colors.secondaryText }}
        >
          {Math.round(percentage)}% completado
        </div>
      </div>
      <p
        className="text-sm p-3 rounded-lg border-4 flex items-center"
        style={{
          background: theme.colors.card,
          borderColor: theme.colors.accent,
          color: theme.colors.text,
          boxShadow: "0 4px 14px rgba(0, 0, 0, 0.1)",
        }}
      >
        {percentage >= 50 ? (
          <Rocket
            className="w-4 h-4 mr-2"
            style={{ color: theme.colors.accent }}
          />
        ) : (
          <Sparkles
            className="w-4 h-4 mr-2"
            style={{ color: theme.colors.accent }}
          />
        )}
        {getMotivationalMessage()}
      </p>
    </div>
  );
};
