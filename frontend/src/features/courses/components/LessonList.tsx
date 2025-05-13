// frontend/src/components/LessonList.tsx
import { useState } from "react";
import { Lesson, Progress, Exercise } from "@/types/course";
import { useTheme } from "@/context/ThemeContext";
import { LessonItem } from "./LessonItem";
import { isLessonCompleted, sortLessons } from "../utils/courseUtils";
import { Sparkles } from "lucide-react";

interface LessonListProps {
  lessons: Lesson[];
  progress: Progress[];
  onExerciseStart: (
    lessonId: string,
    order: number,
    exercise: Exercise,
    lessonIndex: number
  ) => void;
  defaultExpandedIndex: number;
}

export const LessonList: React.FC<LessonListProps> = ({
  lessons,
  progress,
  onExerciseStart,
  defaultExpandedIndex,
}) => {
  const { theme } = useTheme();
  const [expandedLesson, setExpandedLesson] = useState<number | null>(
    defaultExpandedIndex
  );
  const sortedLessons = sortLessons(lessons);

  const toggleLesson = (index: number) => {
    setExpandedLesson(expandedLesson === index ? null : index);
  };

  return (
    <div
      className="rounded-xl overflow-hidden border-4 animate-course-item shine"
      style={{
        background: `linear-gradient(135deg, ${theme.colors.card} 0%, ${theme.colors.background} 100%)`,
        borderColor: theme.colors.border,
        boxShadow: "0 10px 25px rgba(0, 0, 0, 0.2)",
      }}
    >
      <style>
        {`
          @keyframes shine {
            0% { box-shadow: 0 0 0 0 ${theme.colors.accent}50; }
            50% { box-shadow: 0 0 20px 10px ${theme.colors.accent}20; }
            100% { box-shadow: 0 0 0 0 ${theme.colors.accent}50; }
          }
          .shine {
            animation: shine 2s ease-in-out;
          }
        `}
      </style>
      {lessons.length === 0 ? (
        <div
          className="p-6 rounded-lg text-center border-4 animate-course-item"
          style={{
            background: theme.colors.card,
            borderColor: theme.colors.border,
            color: theme.colors.secondaryText,
            boxShadow: "0 4px 14px rgba(0, 0, 0, 0.1)",
          }}
        >
          <p className="text-lg">No hay lecciones disponibles.</p>
          <p className="text-sm mt-2">
            ¡Explora otros cursos para continuar tu aventura!
          </p>
        </div>
      ) : (
        sortedLessons.map((lesson, index) => {
          const isAccessible =
            index === 0 ||
            (index > 0 &&
              isLessonCompleted(sortedLessons[index - 1], progress));
          return (
            <div
              key={lesson._id}
              className="relative"
              style={{
                background:
                  index === defaultExpandedIndex
                    ? `linear-gradient(135deg, ${theme.colors.accent}10 0%, transparent 100%)`
                    : "transparent",
              }}
            >
              {index === defaultExpandedIndex && (
                <Sparkles
                  className="absolute top-4 right-4 w-6 h-6 animate-pulse"
                  style={{ color: theme.colors.accent }}
                />
              )}
              <LessonItem
                lesson={lesson}
                index={index}
                progress={progress}
                isAccessible={isAccessible}
                isExpanded={expandedLesson === index}
                onToggle={() => toggleLesson(index)}
                onExerciseStart={onExerciseStart}
              />
            </div>
          );
        })
      )}
    </div>
  );
};
