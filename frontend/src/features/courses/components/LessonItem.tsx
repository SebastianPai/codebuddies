import { ChevronDown, Star } from "lucide-react";
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

  return (
    <div className="border-b-2" style={{ borderColor: theme.colors.border }}>
      <button
        className={`w-full flex items-center justify-between p-4 transition-colors ${
          isAccessible ? "" : "opacity-50"
        }`}
        onClick={onToggle}
        disabled={!isAccessible}
        style={{ color: theme.colors.text }}
      >
        <div className="flex items-center">
          <div
            className="w-10 h-10 rounded-md flex items-center justify-center mr-4 border-2"
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
            }}
          >
            <span className="font-bold">{index + 1}</span>
          </div>
          <span className="text-lg">
            {lesson.title}
            {isCompleted && (
              <Star
                className="inline-block ml-2 w-4 h-4"
                style={{ color: theme.colors.accent }}
              />
            )}
          </span>
        </div>
        <ChevronDown
          className={`transition-transform ${isExpanded ? "rotate-180" : ""}`}
          size={20}
          style={{ color: theme.colors.text }}
        />
      </button>
      {isExpanded && (
        <div
          className="p-4 border-t-2"
          style={{
            background: theme.colors.background,
            color: theme.colors.secondaryText,
            borderColor: theme.colors.border,
          }}
        >
          <p className="mb-4">{lesson.description}</p>
          {isCompleted && (
            <p
              className="mb-4 p-2 rounded-md border-2"
              style={{
                color: theme.colors.success,
                background: theme.colors.card,
                borderColor: theme.colors.success,
              }}
            >
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
