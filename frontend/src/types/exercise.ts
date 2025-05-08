export interface Code {
  language: string;
  initialCode: string;
  expectedCode?: string;
}

export interface Exercise {
  order: number;
  title: string;
  codes: Code[];
  instructions?: string;
  language: string;
}

export interface Lesson {
  _id: string;
  title: string;
  exercises: Exercise[];
}

export type InstructionElement =
  | { type: "text"; value: string }
  | { type: "code"; language: string; value: string }
  | { type: "image"; value: string }
  | { type: "underline"; value: string }
  | { type: "inline-code"; value: string }
  | { type: "title"; value: string }
  | { type: "list-item"; value: string }
  | { type: "highlight"; value: string }
  | { type: "highlight-secondary"; value: string }
  | { type: "paragraph-break" };

export interface ErrorResponse {
  message?: string;
}
