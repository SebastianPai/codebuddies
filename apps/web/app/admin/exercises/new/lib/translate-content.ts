import { autoTranslateMany } from "@/shared/lib/translate";
import type { InstructionElement, QuizQuestion } from "../types";

// Traduce el contenido real del ejercicio a `targetLang` (lo que el
// <TranslationsForm> no toca: solo hace título + descripción). No traduce
// bloques de código / URLs de imagen ni video. Junta TODOS los textos y los
// manda en UNA sola request por lote — antes eran decenas de requests que
// reventaban el rate limit y dejaban parte del contenido sin traducir.

export async function translateInstructions(
  elements: InstructionElement[],
  targetLang: string,
): Promise<InstructionElement[]> {
  const targets: number[] = [];
  const texts: string[] = [];
  elements.forEach((el, index) => {
    if (el.type === "text" && el.value.trim()) {
      targets.push(index);
      texts.push(el.value);
    }
  });
  if (texts.length === 0) return elements.map((el) => ({ ...el }));

  const translated = await autoTranslateMany(texts, targetLang);
  const out = elements.map((el) => ({ ...el }));
  targets.forEach((elementIndex, i) => {
    out[elementIndex] = { ...out[elementIndex], value: translated[i] };
  });
  return out;
}

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
