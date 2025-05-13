// frontend/src/components/LessonItem.tsx
import { ChevronDown, Star, CheckCircle } from "lucide-react";
import { Lesson, Progress, Exercise } from "@/types/course";
import { useTheme } from "@/context/ThemeContext";
import { ExerciseItem } from "./ExerciseItem";
import { isLessonCompleted } from "../utils/courseUtils";

interface LessonItemProps {
  lesson: Lesson;
  index: number;
  progress: Progress[];
  isAccessible: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  onExerciseStart: (
    lessonId: string,
    order: number,
    exercise: Exercise,
    lessonIndex: number
  ) => void;
}

export const LessonItem: React.FC<LessonItemProps> = ({
  lesson,
  index,
  progress,
  isAccessible,
  isExpanded,
  onToggle,
  onExerciseStart,
}) => {
  const { theme } = useTheme();
  const lessonProgress = progress.filter((p) => p.lessonId === lesson._id);
  const isCompleted = isLessonCompleted(lesson, progress);
  const progressPercentage =
    (lessonProgress.length / lesson.exercises.length) * 100;

  return (
    <div
      className="border-b-4 animate-course-item shine"
      style={{
        borderColor: theme.colors.border,
        background: `linear-gradient(135deg, ${theme.colors.card} 0%, ${theme.colors.background} 100%)`,
        boxShadow: "0 4px 14px rgba(0, 0, 0, 0.1)",
      }}
    >
      <button
        className={`w-full flex items-center justify-between p-4 transition-colors ${
          isAccessible ? "" : "opacity-50"
        }`}
        onClick={onToggle}
        disabled={!isAccessible}
        style={{ color: theme.colors.text }}
      >
        <div className="flex items-center flex-1">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center mr-4 border-4"
            style={{
              background: isCompleted
                ? theme.colors.success
                : isAccessible
                ? theme.colors.accent
                : theme.colors.border,
              borderColor: theme.colors.border,
              color:
                isCompleted || isAccessible
                  ? theme.colors.buttonText
                  : theme.colors.secondaryText,
              boxShadow: "0 4px 14px rgba(0, 0, 0, 0.1)",
            }}
          >
            <span className="font-bold">{index + 1}</span>
          </div>
          <div className="flex flex-col flex-1">
            <span className="text-lg">
              {lesson.title}
              {isCompleted && (
                <Star
                  className="inline-block ml-2 w-4 h-4"
                  style={{ color: theme.colors.accent }}
                />
              )}
            </span>
            <div
              className="w-full h-3 rounded-full mt-2 overflow-hidden"
              style={{ background: theme.colors.background }}
            >
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${progressPercentage}%`,
                  background: `linear-gradient(90deg, ${theme.colors.accent} 0%, ${theme.colors.primary} 100%)`,
                  boxShadow: `0 0 10px ${theme.colors.accent}`,
                }}
              />
            </div>
            <span
              className="text-xs mt-1"
              style={{ color: theme.colors.secondaryText }}
            >
              {Math.round(progressPercentage)}% completado
            </span>
          </div>
        </div>
        <ChevronDown
          className={`transition-transform ${isExpanded ? "rotate-180" : ""}`}
          size={20}
          style={{ color: theme.colors.text }}
        />
      </button>
      {isExpanded && (
        <div
          className="p-4 border-t-4"
          style={{
            background: theme.colors.background,
            color: theme.colors.secondaryText,
            borderColor: theme.colors.border,
          }}
        >
          <p className="mb-4">{lesson.description}</p>
          {isCompleted && (
            <p
              className="mb-4 p-2 rounded-lg border-4 flex items-center"
              style={{
                color: theme.colors.success,
                background: theme.colors.card,
                borderColor: theme.colors.success,
                boxShadow: "0 4px 14px rgba(0, 0, 0, 0.1)",
              }}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              ¡Lección completada! Puedes avanzar a la siguiente lección.
            </p>
          )}
          <ul className="space-y-3">
            {lesson.exercises.map((exercise) => (
              <ExerciseItem
                key={exercise.order}
                lessonId={lesson._id}
                exercise={exercise}
                lessonProgress={lessonProgress}
                lessonIndex={index}
                onStart={onExerciseStart}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
