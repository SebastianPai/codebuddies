import { FC } from "react";
import { Exercise } from "@/types/exercise";
import { useTheme } from "@/context/ThemeContext";

interface ExerciseHeaderProps {
  exercise: Exercise;
}

export const ExerciseHeader: FC<ExerciseHeaderProps> = ({ exercise }) => {
  const { theme } = useTheme();

  return (
    <header
      className="flex items-center justify-between p-4 border-b"
      style={{
        background: theme.colors.card,
        borderColor: theme.colors.border,
      }}
    >
      <h1 className="text-4xl font-bold" style={{ color: theme.colors.text }}>
        Ejercicio - {exercise.language.toUpperCase()}
      </h1>
      <div className="flex items-center space-x-2">
        <div className="flex space-x-1">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
        </div>
      </div>
    </header>
  );
};
