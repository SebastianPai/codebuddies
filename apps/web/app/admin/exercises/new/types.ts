export interface Code {
  language: string;
  initialCode: string;
  expectedCode?: string;
}

export interface InstructionElement {
  type: "text" | "code" | "image" | "video";
  value: string;
  language?: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correct: number[]; // array para permitir selección múltiple
  isMultiple: boolean;
  explanation?: string;
}

interface QuizOption {
  type: "text" | "code";
  value: string;
  language?: string; // si es code
}

export interface AdminExerciseResponse {
  id: string;
  lessonId: string;
  type: "CODE" | "QUIZ" | "VIDEO_THEORY" | "LIVE";
  status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  experience: number;
  coins: number;
  order: number;
  codes?: Array<{
    language: string;
    initialCode: string;
    expectedCode?: string | null;
  }>;
  translations: Array<{
    language: {
      code: string;
    };
    title: string;
    description: string | null;
    // CODE/VIDEO_THEORY: LessonContentDoc `{ version, blocks, ... }` (nuevo) o
    // `{ instructionElements }` (viejo). QUIZ: `{ questions }`. Se normaliza al
    // leer, así que el tipo queda laxo a propósito.
    content: {
      version?: number;
      blocks?: unknown[];
      instructionElements?: InstructionElement[];
      questions?: QuizQuestion[];
    } | null;
  }>;
}
