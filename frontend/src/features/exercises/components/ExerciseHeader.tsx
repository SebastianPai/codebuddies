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
      className="flex items-center justify-between p-4 border-b font-jersey"
      style={{
        background: theme.colors.card,
        borderColor: theme.colors.border,
      }}
    >
      <style>
        {`
          @keyframes typewriter {
            from { width: 0; }
            to { width: 100%; }
          }
          .typewriter {
            overflow: hidden;
            white-space: nowrap;
            animation: typewriter 2s steps(30) 1;
          }
          @keyframes fade-in {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          .fade-in {
            animation: fade-in 1.5s ease-in;
          }
          @media (prefers-reduced-motion) {
            .typewriter {
              animation: none;
              width: 100%;
            }
          }
          @media (max-width: 640px) {
            .typewriter {
              white-space: normal;
              overflow-wrap: break-word;
              animation: fade-in 1s ease-in;
            }
            .text-4xl { font-size: 2rem; }
            .text-3xl { font-size: 1.75rem; }
            .text-2xl { font-size: 1.5rem; }
            .px-4 { padding-left: 1rem; padding-right: 1rem; }
            .py-4 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
          }
        `}
      </style>
      <h1
        className="text-4xl font-bold typewriter md:fade-in"
        style={{ color: theme.colors.text }}
      >
        Ejercicio - {exercise.language.toUpperCase()}
      </h1>
    </header>
  );
};
