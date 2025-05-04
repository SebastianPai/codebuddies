import { Trophy } from "lucide-react";
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

  return (
    <div
      className="rounded-lg p-4 border-4"
      style={{
        background: theme.colors.card,
        borderColor: theme.colors.border,
      }}
    >
      <h3
        className="mb-4 flex items-center"
        style={{ color: theme.colors.text }}
      >
        <Trophy
          className="w-5 h-5 mr-2"
          style={{ color: theme.colors.button }}
        />
        Progreso del curso
      </h3>
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center">
            <div
              className="w-6 h-6 rounded-md mr-2 border-2"
              style={{
                background: theme.colors.button,
                borderColor: theme.colors.border,
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
          className="w-full rounded-md h-4 border-2"
          style={{
            background: theme.colors.border,
            borderColor: theme.colors.border,
          }}
        >
          <div
            className="h-full rounded-sm"
            style={{ background: theme.colors.accent, width: `${percentage}%` }}
          ></div>
        </div>
        <div
          className="mt-2 text-xs text-center"
          style={{ color: theme.colors.secondaryText }}
        >
          {Math.round(percentage)}% completado
        </div>
      </div>
    </div>
  );
};
