import { autoTranslateMany } from "@/shared/lib/translate";
import type { QuizQuestion } from "../types";

// Traduce las preguntas del quiz a `targetLang` (lo que el <TranslationsForm>
// no toca: solo hace título + descripción). Junta TODOS los textos y los
// manda en UNA sola request por lote. Las instrucciones de un ejercicio CODE
// usan `translateLessonContent` de @/features/academy (mismo doc que teoría).

export async function translateQuiz(
  questions: QuizQuestion[],
  targetLang: string,
): Promise<QuizQuestion[]> {
  // Un solo array plano con todos los textos + un mapa para re-ubicarlos.
  const slots: Array<
    | { q: number; kind: "question" }
    | { q: number; kind: "option"; o: number }
    | { q: number; kind: "explanation" }
  > = [];
  const texts: string[] = [];

  questions.forEach((question, qIndex) => {
    slots.push({ q: qIndex, kind: "question" });
    texts.push(question.question);
    question.options.forEach((option, oIndex) => {
      slots.push({ q: qIndex, kind: "option", o: oIndex });
      texts.push(option);
    });
    if (question.explanation && question.explanation.trim()) {
      slots.push({ q: qIndex, kind: "explanation" });
      texts.push(question.explanation);
    }
  });

  const out = questions.map((question) => ({
    ...question,
    options: [...question.options],
    correct: [...question.correct],
  }));

  if (texts.length === 0) return out;

  const translated = await autoTranslateMany(texts, targetLang);
  translated.forEach((value, i) => {
    const slot = slots[i];
    if (slot.kind === "question") out[slot.q].question = value;
    else if (slot.kind === "option") out[slot.q].options[slot.o] = value;
    else out[slot.q].explanation = value;
  });
  return out;
}
