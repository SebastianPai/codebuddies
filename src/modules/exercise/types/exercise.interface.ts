// apps/api/src/modules/exercise/types/exercise.interface.ts

export interface BaseExercise {
  id: string;
  lessonId: string;
  order: number;
  title: string | null;
  description: string | null;
  experience: number;
  coins: number;
  completed: boolean;
  locked: boolean;
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correct: number[]; // índices de las respuestas correctas (puede ser varios)
  isMultiple: boolean; // true = selección múltiple
  explanation: string;
}

export interface QuizExercise extends BaseExercise {
  type: 'QUIZ';
  questions: QuizQuestion[]; // ahora soporta múltiples preguntas
}

// Mantén los otros tipos
export interface CodingExercise extends BaseExercise {
  type: 'CODE';
  starterCode: string;
  solutionCode: string;
  language: string;
}

export interface LiveExercise extends BaseExercise {
  type: 'LIVE';
  schedule?: string;
  link?: string;
}

export type Exercise = QuizExercise | CodingExercise | LiveExercise;
