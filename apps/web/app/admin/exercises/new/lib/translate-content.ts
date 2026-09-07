import { autoTranslate } from "@/shared/lib/translate";
import type { InstructionElement, QuizQuestion } from "../types";

// Traduce el contenido real del ejercicio a `targetLang` (lo que el
// <TranslationsForm> no toca: solo hace título + descripción). No traduce
// bloques de código / URLs de imagen ni video. Secuencial: el endpoint
// /translate suele tener rate limit.

export async function translateInstructions(
  elements: InstructionElement[],
  targetLang: string,
): Promise<InstructionElement[]> {
  const out: InstructionElement[] = [];
  for (const el of elements) {
    out.push(
      el.type === "text"
        ? { ...el, value: await autoTranslate(el.value, targetLang) }
        : { ...el },
    );
  }
  return out;
}

export async function translateQuiz(
  questions: QuizQuestion[],
  targetLang: string,
): Promise<QuizQuestion[]> {
  const out: QuizQuestion[] = [];
  for (const q of questions) {
    const options: string[] = [];
    for (const option of q.options) {
      options.push(option.trim() ? await autoTranslate(option, targetLang) : option);
    }
    out.push({
      ...q,
      question: await autoTranslate(q.question, targetLang),
      options,
      explanation: q.explanation
        ? await autoTranslate(q.explanation, targetLang)
        : q.explanation,
    });
  }
  return out;
}
