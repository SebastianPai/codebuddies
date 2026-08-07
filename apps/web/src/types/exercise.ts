// apps/web/src/types/exercise.ts

export interface BaseExercise {
  id: string;
  lessonId: string;
  order: number;
  title: string | null;
  description: string | null;
  experience: number;
  coins: number;
  completed: boolean;
  nextExerciseId?: string | null;
  nextExerciseType?: "QUIZ" | "CODE" | "LIVE" | null;
  prevExerciseId?: string | null;
  prevExerciseType?: "QUIZ" | "CODE" | "LIVE" | null;
}

// Pregunta individual dentro de un quiz
export interface QuizQuestion {
  id: string; // ID único generado (ej: "uuid-q0")
  question: string;
  options: string[];
  correct: number[]; // índices de las respuestas correctas (puede ser varios)
  isMultiple: boolean; // true = selección múltiple permitida
  explanation: string; // explicación/retroalimentación al responder
}

// Ejercicio tipo QUIZ (soporta múltiples preguntas)
export interface QuizExercise extends BaseExercise {
  type: "QUIZ";
  questions: QuizQuestion[];
}

// Ejercicio tipo Código (sin cambios)
export interface CodingExercise extends BaseExercise {
  type: "CODE";
  starterCode: string;
  solutionCode: string;
  language: string; // js, python, etc.
}

// Ejercicio tipo Sesión en vivo (sin cambios)
export interface LiveExercise extends BaseExercise {
  type: "LIVE";
  schedule?: string; // fecha/hora de la sesión
  link?: string; // enlace a la sala
}

// Unión de todos los tipos de ejercicios
export type Exercise = QuizExercise | CodingExercise | LiveExercise;
