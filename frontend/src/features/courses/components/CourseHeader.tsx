// frontend/src/components/CourseHeader.tsx
import { useNavigate } from "react-router-dom";
import { Zap, CheckCircle, BookOpen, Star } from "lucide-react";
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

  const getDifficultyColor = (level: string | undefined) => {
    switch (level?.toLowerCase()) {
      case "principiante":
        return theme.colors.success;
      case "intermedio":
        return theme.colors.accent;
      case "avanzado":
        return theme.colors.error;
      default:
        return theme.colors.accent; // Color por defecto si level es undefined
    }
  };

  return (
    <section
      className="relative w-full py-16 px-4 overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${theme.colors.card} 0%, ${theme.colors.background}80 100%)`,
        borderBottom: `4px solid ${theme.colors.border}`,
      }}
    >
      <style>
        {`
          @keyframes background-flow {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
          .bg-flow {
            background: linear-gradient(
              45deg,
              ${theme.colors.accent}20,
              ${theme.colors.primary}20,
              ${theme.colors.accenttwo}20,
              ${theme.colors.accent}20
            );
            background-size: 400% 400%;
            animation: background-flow 15s ease-in-out infinite;
          }
          @keyframes gradient-shift {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
          .gradient-title {
            background: linear-gradient(
              90deg,
              ${theme.colors.accent} 0%,
              ${theme.colors.primary} 50%,
              ${theme.colors.accent} 100%
            );
            background-size: 200% 200%;
            animation: gradient-shift 10s ease-in-out infinite;
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
          }
          @keyframes neon-pulse {
            0%, 100% { text-shadow: 0 0 10px ${theme.colors.accent}50; }
            50% { text-shadow: 0 0 20px ${theme.colors.accent}80, 0 0 30px ${theme.colors.accent}50; }
          }
          .neon-title {
            animation: neon-pulse 3s ease-in-out;
          }
          @keyframes medal-spin {
            0% { transform: rotate(0deg) scale(1); }
            50% { transform: rotate(10deg) scale(1.1); }
            100% { transform: rotate(0deg) scale(1); }
          }
          .medal-spin {
            animation: medal-spin 2s ease-in-out;
          }
          @keyframes float {
            0%, 100% { transform: translateY(0); box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2); }
            50% { transform: translateY(-5px); box-shadow: 0 15px 35px rgba(0, 0, 0, 0.3); }
          }
          .float {
            animation: float 4s ease-in-out infinite;
          }
          @keyframes icon-pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.2); }
          }
          .icon-pulse {
            animation: icon-pulse 2s ease-in-out infinite;
          }
          @keyframes spark {
            0% { transform: translate(0, 0) scale(1); opacity: 1; }
            100% { transform: translate(20px, -20px) scale(0); opacity: 0; }
          }
          .spark-button::after {
            content: '';
            position: absolute;
            width: 10px;
            height: 10px;
            background: ${theme.colors.accent};
            border-radius: 50%;
            opacity: 0;
            pointer-events: none;
          }
          .spark-button:active::after {
            animation: spark 0.5s ease-out;
          }
          @keyframes hero-item {
            0% { opacity: 0; transform: translateY(30px); }
            100% { opacity: 1; transform: translateY(0); }
          }
          .hero-item {
            animation: hero-item 0.8s ease-out forwards;
          }
          @media (prefers-reduced-motion) {
            .bg-flow, .gradient-title, .float, .icon-pulse, .medal-spin, .neon-title {
              animation: none;
            }
            .gradient-title {
              background: ${theme.colors.text};
              -webkit-background-clip: initial;
              -webkit-text-fill-color: ${theme.colors.text};
            }
            .neon-title {
              text-shadow: none;
            }
          }
        `}
      </style>
      <div className="bg-flow absolute inset-0" />
      <div className="relative z-10 max-w-6xl mx-auto flex flex-col items-center gap-8">
        <div className="hero-item" style={{ animationDelay: "0.2s" }}>
          <div
            className="flex items-center justify-center w-16 h-16 rounded-full border-4 medal-spin"
            style={{
              background: getDifficultyColor(course?.level),
              borderColor: theme.colors.border,
              boxShadow: `0 0 15px ${getDifficultyColor(course?.level)}50`,
            }}
          >
            <Star
              className="w-8 h-8"
              style={{ color: theme.colors.buttonText }}
            />
          </div>
          <span
            className="text-sm mt-2 block text-center"
            style={{ color: theme.colors.secondaryText }}
          >
            {course?.level?.toUpperCase() || "PRINCIPIANTE"}
          </span>
        </div>
        <h1
          className="text-6xl md:text-7xl font-bold tracking-wider gradient-title neon-title text-center hero-item"
          style={{ animationDelay: "0.4s" }}
        >
          {course?.title || "Curso dinámico"}
        </h1>
        <div
          className="max-w-3xl p-6 rounded-lg border-4 float hero-item"
          style={{
            background: `linear-gradient(135deg, ${theme.colors.card} 0%, ${theme.colors.background} 100%)`,
            borderColor: theme.colors.border,
            animationDelay: "0.6s",
          }}
        >
          <div className="flex items-center gap-3">
            <BookOpen
              className="w-6 h-6"
              style={{ color: theme.colors.accent }}
            />
            <p
              className="text-lg leading-relaxed text-center"
              style={{ color: theme.colors.secondaryText }}
            >
              {course?.description ||
                "Descripción del curso no disponible aún."}
            </p>
          </div>
        </div>
        <button
          className="font-bold py-4 px-10 rounded-lg transition-all hover:scale-105 hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed border-4 spark-button hero-item"
          disabled={!currentExercise}
          style={{
            background: currentExercise
              ? `linear-gradient(90deg, ${theme.colors.accenttwo} 0%, ${theme.colors.accent} 100%)`
              : theme.colors.border,
            color: currentExercise
              ? theme.colors.buttonText
              : theme.colors.secondaryText,
            borderColor: theme.colors.border,
            boxShadow: `0 4px 14px rgba(0, 0, 0, 0.2), 0 0 10px ${theme.colors.accent}50`,
            transition: "all 0.3s ease",
            animationDelay: "0.8s",
          }}
          onClick={() => {
            if (currentExercise) {
              handleExerciseStart(
                currentExercise.lessonId,
                currentExercise.exercise.order,
                currentExercise.exercise,
                lessonIndex
              );
              toast.success("¡Iniciando tu aventura de aprendizaje!", {
                toastId: "start-learning",
                style: {
                  background: theme.colors.card,
                  color: theme.colors.text,
                  border: `2px solid ${theme.colors.accent}`,
                },
              });
            } else {
              toast.success("¡Has completado todas las lecciones del curso!", {
                toastId: "course-completed",
                style: {
                  background: theme.colors.card,
                  color: theme.colors.text,
                  border: `2px solid ${theme.colors.success}`,
                },
              });
              navigate("/learn");
            }
          }}
        >
          {currentExercise ? (
            <>
              <Zap className="w-8 h-8 mr-3 inline icon-pulse" />
              Empieza a aprender
            </>
          ) : (
            <>
              <CheckCircle className="w-8 h-8 mr-3 inline icon-pulse" />
              Curso completado
            </>
          )}
        </button>
      </div>
    </section>
  );
};
