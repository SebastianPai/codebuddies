import { useState } from "react";
import { Lesson, Progress, Exercise } from "@/types/course";
import { useTheme } from "@/context/ThemeContext";
import { LessonItem } from "./LessonItem";
import { isLessonCompleted, sortLessons } from "../utils/courseUtils";

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
      className="rounded-lg overflow-hidden border-4"
      style={{
        background: theme.colors.card,
        borderColor: theme.colors.border,
      }}
    >
      {lessons.length === 0 ? (
        <p className="p-4" style={{ color: theme.colors.secondaryText }}>
          No hay lecciones disponibles.
        </p>
      ) : (
        sortedLessons.map((lesson, index) => {
          const isAccessible =
            index === 0 ||
            (index > 0 &&
              isLessonCompleted(sortedLessons[index - 1], progress));
          return (
            <LessonItem
              key={lesson._id}
              lesson={lesson}
              index={index}
              progress={progress}
              isAccessible={isAccessible}
              isExpanded={expandedLesson === index}
              onToggle={() => toggleLesson(index)}
              onExerciseStart={onExerciseStart}
            />
          );
        })
      )}
    </div>
  );
};
