// NavigationControls.tsx
import { useTheme } from "@/context/ThemeContext";
import { ChevronLeft, ChevronRight, Code, Info } from "lucide-react";
import { Exercise, Lesson } from "@/types/exercise";

interface NavigationControlsProps {
  exercise: Exercise;
  lesson: Lesson | null;
  isExerciseCompleted: boolean;
  htmlCode: string;
  cssCode: string;
  jsCode: string;
  onNavigate: (direction: "prev" | "next") => void;
  onCheckAnswer: () => void;
}

export const NavigationControls = ({
  exercise,
  lesson,
  isExerciseCompleted,
  htmlCode,
  cssCode,
  jsCode,
  onNavigate,
  onCheckAnswer,
}: NavigationControlsProps) => {
  const { theme } = useTheme();

  const isPrevDisabled =
    !lesson ||
    !exercise ||
    lesson.exercises.findIndex((ex) => ex.order === exercise.order) === 0;

  const isNextDisabled =
    !lesson ||
    !exercise ||
    lesson.exercises.findIndex((ex) => ex.order === exercise.order) ===
      lesson.exercises.length - 1 ||
    !isExerciseCompleted;

  const isCheckDisabled =
    exercise.language === "html" || exercise.language === "css"
      ? !htmlCode.trim() && !cssCode.trim()
      : !jsCode.trim();

  return (
    <footer
      className="border-t p-3 flex flex-col md:flex-row items-center justify-between gap-3"
      style={{
        background: theme.colors.card,
        borderColor: theme.colors.border,
      }}
    >
      <div className="flex items-center space-x-3">
        <button
          className="p-1 rounded-md"
          style={{
            background: theme.colors.border,
            color: theme.colors.text,
          }}
        >
          <Code className="w-4 h-4" />
        </button>
        <div className="text-sm">
          <div className="font-bold" style={{ color: theme.colors.text }}>
            {`${exercise.order}. ${exercise.title}`}
          </div>
          <div style={{ color: theme.colors.accent }}>10 XP</div>
        </div>
      </div>
      <div className="flex items-center justify-center space-x-2">
        <button
          onClick={() => onNavigate("prev")}
          disabled={isPrevDisabled}
          className="px-3 py-1 rounded-md flex items-center text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: theme.colors.border,
            color: theme.colors.text,
          }}
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Anterior
        </button>
        <button
          onClick={onCheckAnswer}
          className="px-3 py-1 rounded-md flex items-center text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: theme.colors.accent,
            color: theme.colors.buttonText,
          }}
          disabled={isCheckDisabled}
        >
          Comprobar
        </button>
        <button
          onClick={() => onNavigate("next")}
          disabled={isNextDisabled}
          className="px-3 py-1 rounded-md flex items-center text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: theme.colors.border,
            color: theme.colors.text,
          }}
        >
          Próximo
          <ChevronRight className="w-4 h-4 ml-1" />
        </button>
        <button
          className="p-1 rounded-md"
          style={{
            background: theme.colors.border,
            color: theme.colors.text,
          }}
        >
          <Info className="w-4 h-4" />
        </button>
      </div>
      <div className="flex items-center">
        <div className="flex -space-x-1">
          <div
            className="w-6 h-6 rounded-full bg-red-500 border-2"
            style={{ borderColor: theme.colors.border }}
          ></div>
          <div
            className="w-6 h-6 rounded-full bg-blue-500 border-2"
            style={{ borderColor: theme.colors.border }}
          ></div>
          <div
            className="w-6 h-6 rounded-full bg-green-500 border-2"
            style={{ borderColor: theme.colors.border }}
          ></div>
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-xs"
            style={{
              background: theme.colors.accent,
              color: theme.colors.buttonText,
              borderColor: theme.colors.border,
            }}
          >
            +13
          </div>
        </div>
      </div>
    </footer>
  );
};
