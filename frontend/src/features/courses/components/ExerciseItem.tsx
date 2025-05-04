import { Lock } from "lucide-react";
import { Exercise, Progress } from "@/types/course";
import { useTheme } from "@/context/ThemeContext";

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
      className="flex items-center justify-between p-3 rounded-md border-2"
      style={{
        background: theme.colors.card,
        borderColor: theme.colors.border,
      }}
    >
      <div className="flex items-center">
        <span
          className="w-8 h-8 rounded-md flex items-center justify-center text-sm mr-3"
          style={{
            background: isExerciseCompleted
              ? theme.colors.success
              : isExerciseAccessible
              ? theme.colors.button
              : theme.colors.border,
            color:
              isExerciseCompleted || isExerciseAccessible
                ? theme.colors.buttonText
                : theme.colors.secondaryText,
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
        onClick={() => onStart(lessonId, exercise.order, exercise, lessonIndex)}
        className="font-bold py-1 px-4 rounded-md transition-all flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          background: isExerciseCompleted
            ? theme.colors.success
            : isExerciseAccessible
            ? theme.colors.button
            : theme.colors.border,
          color:
            isExerciseCompleted || isExerciseAccessible
              ? theme.colors.buttonText
              : theme.colors.secondaryText,
          border: `2px solid ${theme.colors.border}`,
        }}
        disabled={!isExerciseAccessible}
        onMouseEnter={(e) => {
          if (isExerciseAccessible) {
            e.currentTarget.style.background = theme.colors.button;
            e.currentTarget.style.color = theme.colors.buttonText;
          }
        }}
        onMouseLeave={(e) => {
          if (isExerciseAccessible) {
            e.currentTarget.style.background = isExerciseCompleted
              ? theme.colors.success
              : theme.colors.button;
            e.currentTarget.style.color = theme.colors.buttonText;
          }
        }}
      >
        {isExerciseCompleted ? "Completado" : "Iniciar"}
        {!isExerciseCompleted && !isExerciseAccessible && (
          <Lock
            size={14}
            className="ml-2"
            style={{ color: theme.colors.secondaryText }}
          />
        )}
      </button>
    </li>
  );
};
