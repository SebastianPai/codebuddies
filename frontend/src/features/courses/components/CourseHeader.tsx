import { useNavigate } from "react-router-dom";
import { Zap } from "lucide-react";
import { toast } from "react-toastify";
import { Course, Exercise } from "@/types/course";
import { useTheme } from "@/context/ThemeContext";

interface CourseHeaderProps {
  course: Course | null;
  currentExercise: { lessonId: string; exercise: Exercise } | null;
  handleExerciseStart: (
    lessonId: string,
    order: number,
    exercise: Exercise,
    lessonIndex: number
  ) => void;
  lessonIndex: number;
}

export const CourseHeader: React.FC<CourseHeaderProps> = ({
  course,
  currentExercise,
  handleExerciseStart,
  lessonIndex,
}) => {
  const navigate = useNavigate();
  const { theme } = useTheme();

  return (
    <section
      className="relative w-full h-[400px] overflow-hidden"
      style={{ borderBottom: `4px solid ${theme.colors.border}` }}
    >
      <div
        className="absolute inset-0 bg-cover bg-center opacity-30"
        style={{
          backgroundImage: course?.image
            ? `url(${course.image})`
            : `url('/placeholder.svg?height=400&width=1200')`,
          imageRendering: "pixelated",
        }}
      />
      <div className="relative z-10 max-w-5xl mx-auto px-4 pt-16">
        <div className="flex items-center mb-8">
          <div
            className="rounded-md px-4 py-1 text-xs flex items-center border-2"
            style={{
              background: theme.colors.card,
              borderColor: theme.colors.border,
            }}
          >
            <Zap
              className="w-4 h-4 mr-2"
              style={{ color: theme.colors.accent }}
            />
            <span style={{ color: theme.colors.text }}>
              {course?.difficulty?.toUpperCase() || "PRINCIPIANTE"}
            </span>
          </div>
          <div
            className="ml-2 text-xs"
            style={{ color: theme.colors.secondaryText }}
          >
            CURSO
          </div>
        </div>
        <h1
          className="text-5xl md:text-6xl font-bold mb-6 tracking-wider"
          style={{ color: theme.colors.text }}
        >
          {course?.title || "Curso dinámico"}
        </h1>
        <p
          className="max-w-xl leading-relaxed mb-8 p-4 rounded-lg border-2"
          style={{
            color: theme.colors.secondaryText,
            background: theme.colors.card,
            borderColor: theme.colors.border,
          }}
        >
          {course?.description || "Descripción del curso no disponible aún."}
        </p>
        <button
          className="font-bold py-3 px-6 rounded-md transition-all transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed border-4"
          disabled={!currentExercise}
          style={{
            background: currentExercise
              ? theme.colors.button
              : theme.colors.border,
            color: currentExercise
              ? theme.colors.buttonText
              : theme.colors.secondaryText,
            borderColor: theme.colors.border,
          }}
          onClick={() => {
            if (currentExercise) {
              handleExerciseStart(
                currentExercise.lessonId,
                currentExercise.exercise.order,
                currentExercise.exercise,
                lessonIndex
              );
            } else {
              toast.info("¡Has completado todas las lecciones del curso!", {
                toastId: "course-completed",
              });
              navigate("/learn");
            }
          }}
          onMouseEnter={(e) => {
            if (currentExercise) {
              e.currentTarget.style.background = theme.colors.accent;
              e.currentTarget.style.color = theme.colors.buttonText;
            }
          }}
          onMouseLeave={(e) => {
            if (currentExercise) {
              e.currentTarget.style.background = theme.colors.button;
              e.currentTarget.style.color = theme.colors.buttonText;
            }
          }}
        >
          {currentExercise ? "Empieza a aprender" : "Curso completado"}
        </button>
      </div>
    </section>
  );
};
