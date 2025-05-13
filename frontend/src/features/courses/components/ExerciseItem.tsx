// frontend/src/components/ExerciseItem.tsx
import { Lock, CheckCircle } from "lucide-react";
import { Exercise, Progress } from "@/types/course";
import { useTheme } from "@/context/ThemeContext";
import { toast } from "react-toastify";

interface ExerciseItemProps {
  lessonId: string;
  exercise: Exercise;
  lessonProgress: Progress[];
  lessonIndex: number;
  onStart: (
    lessonId: string,
    order: number,
    exercise: Exercise,
    lessonIndex: number
  ) => void;
}

export const ExerciseItem: React.FC<ExerciseItemProps> = ({
  lessonId,
  exercise,
  lessonProgress,
  lessonIndex,
  onStart,
}) => {
  const { theme } = useTheme();
  const isExerciseCompleted = lessonProgress.some(
    (p) => p.exerciseOrder === exercise.order && p.completed
  );
  const isExerciseAccessible =
    isExerciseCompleted ||
    exercise.order === 1 ||
    lessonProgress.some(
      (p) => p.exerciseOrder === exercise.order - 1 && p.completed
    );

  return (
    <li
      className="flex items-center justify-between p-3 rounded-lg border-4 animate-course-item shine"
      style={{
        background: theme.colors.card,
        borderColor: theme.colors.border,
        boxShadow: "0 4px 14px rgba(0, 0, 0, 0.1)",
      }}
    >
      <div className="flex items-center">
        <span
          className="w-8 h-8 rounded-lg flex items-center justify-center text-sm mr-3 border-4"
          style={{
            background: isExerciseCompleted
              ? theme.colors.success
              : isExerciseAccessible
              ? theme.colors.accent
              : theme.colors.border,
            color:
              isExerciseCompleted || isExerciseAccessible
                ? theme.colors.buttonText
                : theme.colors.secondaryText,
            borderColor: theme.colors.border,
            boxShadow: "0 4px 14px rgba(0, 0, 0, 0.1)",
          }}
        >
          {exercise.order}
        </span>
        <span
          style={{
            color: isExerciseAccessible
              ? theme.colors.text
              : theme.colors.secondaryText,
          }}
        >
          {exercise.title}
        </span>
      </div>
      <button
        onClick={() => {
          if (isExerciseAccessible) {
            onStart(lessonId, exercise.order, exercise, lessonIndex);
            toast.success("¡Iniciando ejercicio!", {
              toastId: `exercise-start-${exercise.order}`,
              style: {
                background: theme.colors.card,
                color: theme.colors.text,
                border: `2px solid ${theme.colors.accent}`,
              },
            });
          } else {
            toast.info(
              "Completa el ejercicio anterior para desbloquear este.",
              {
                toastId: `exercise-locked-${exercise.order}`,
                style: {
                  background: theme.colors.card,
                  color: theme.colors.text,
                  border: `2px solid ${theme.colors.error}`,
                },
              }
            );
          }
        }}
        className="font-bold py-1 px-4 rounded-lg transition-all hover:scale-105 flex items-center disabled:opacity-50 disabled:cursor-not-allowed course-pulse"
        style={{
          background: isExerciseCompleted
            ? theme.colors.success
            : isExerciseAccessible
            ? `linear-gradient(90deg, ${theme.colors.accenttwo} 0%, ${theme.colors.accent} 100%)`
            : theme.colors.border,
          color:
            isExerciseCompleted || isExerciseAccessible
              ? theme.colors.buttonText
              : theme.colors.secondaryText,
          border: `2px solid ${theme.colors.border}`,
          boxShadow: "0 4px 14px rgba(0, 0, 0, 0.1)",
          transition: "all 0.3s ease",
        }}
        disabled={!isExerciseAccessible}
      >
        {isExerciseCompleted ? (
          <>
            <CheckCircle className="w-4 h-4 mr-2" />
            Completado
          </>
        ) : isExerciseAccessible ? (
          "Iniciar"
        ) : (
          <>
            <Lock className="w-4 h-4 mr-2" />
            Bloqueado
          </>
        )}
      </button>
    </li>
  );
};
