import { Plus, Trash2 } from "lucide-react";
import { QuizQuestion } from "../types";
import { useTranslation } from "../../../../../src/i18n/useTranslation";

interface QuizExerciseFormProps {
  questions: QuizQuestion[];
  setQuestions: React.Dispatch<React.SetStateAction<QuizQuestion[]>>;
}

export default function QuizExerciseForm({
  questions,
  setQuestions,
}: QuizExerciseFormProps) {
  const t = useTranslation();
  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        question: "",
        options: ["", "", "", ""],
        correct: [0],
        isMultiple: false,
        explanation: "",
      },
    ]);
  };

  // Todo inmutable: mutar options/correct in-place compartía referencias
  // entre idiomas (el quiz de EN mutaba el de ES) y podía "perder" preguntas.
  const patchQuestion = (
    qIndex: number,
    patch: (q: QuizQuestion) => QuizQuestion,
  ) =>
    setQuestions(questions.map((q, i) => (i === qIndex ? patch(q) : q)));

  const updateQuestion = (
    qIndex: number,
    field: keyof QuizQuestion | "isMultiple",
    value: any,
  ) =>
    patchQuestion(qIndex, (q) =>
      field === "isMultiple"
        ? {
            ...q,
            isMultiple: value,
            correct: value ? [...q.correct] : [q.correct[0] || 0],
          }
        : { ...q, [field]: value },
    );

  const updateOption = (qIndex: number, optIndex: number, value: string) =>
    patchQuestion(qIndex, (q) => ({
      ...q,
      options: q.options.map((o, i) => (i === optIndex ? value : o)),
    }));

  const addOption = (qIndex: number) =>
    patchQuestion(qIndex, (q) => ({ ...q, options: [...q.options, ""] }));

  const removeOption = (qIndex: number, optIndex: number) =>
    patchQuestion(qIndex, (q) => ({
      ...q,
      options: q.options.filter((_, i) => i !== optIndex),
      correct: q.correct
        .filter((c) => c !== optIndex)
        .map((c) => (c > optIndex ? c - 1 : c)),
    }));

  const toggleCorrect = (qIndex: number, optIndex: number) =>
    patchQuestion(qIndex, (q) => ({
      ...q,
      correct: q.isMultiple
        ? q.correct.includes(optIndex)
          ? q.correct.filter((c) => c !== optIndex)
          : [...q.correct, optIndex]
        : [optIndex],
    }));

  const removeQuestion = (index: number) => {
    if (questions.length > 1) {
      setQuestions(questions.filter((_, i) => i !== index));
    }
  };

  return (
    <section className="mb-10">
      <h2 className="text-lg font-semibold mb-4">{t("admin.quizQuestionsTitle")}</h2>
      {questions.map((q, qIdx) => (
        <div
          key={qIdx}
          className="mb-8 p-4 bg-gray-800 rounded border border-gray-700"
        >
          <div className="flex justify-between mb-3">
            <span className="text-sm text-gray-400">{t("admin.questionNumberLabel", { index: qIdx + 1 })}</span>
            <button
              type="button"
              onClick={() => removeQuestion(qIdx)}
              className="text-red-400 hover:text-red-300"
            >
              <Trash2 size={16} />
            </button>
          </div>

          <input
            type="text"
            value={q.question}
            onChange={(e) => updateQuestion(qIdx, "question", e.target.value)}
            placeholder={t("admin.questionPlaceholder")}
            className="w-full p-3 mb-4 bg-gray-900 border border-gray-700 rounded text-white"
          />

          <label className="flex items-center gap-2 mb-4">
            <input
              type="checkbox"
              checked={q.isMultiple}
              onChange={(e) =>
                updateQuestion(qIdx, "isMultiple", e.target.checked)
              }
              className="form-checkbox text-blue-500"
            />
            {t("admin.multipleChoiceCheckboxLabel")}
          </label>

          <div className="space-y-3">
            {q.options.map((opt, optIdx) => (
              <div key={optIdx} className="flex items-center gap-3">
                <input
                  type={q.isMultiple ? "checkbox" : "radio"}
                  name={q.isMultiple ? undefined : `correct-${qIdx}`}
                  checked={q.correct.includes(optIdx)}
                  onChange={() => toggleCorrect(qIdx, optIdx)}
                  className={q.isMultiple ? "form-checkbox" : "form-radio"}
                />
                <input
                  type="text"
                  value={opt}
                  onChange={(e) => updateOption(qIdx, optIdx, e.target.value)}
                  placeholder={t("admin.optionPlaceholder", { index: optIdx + 1 })}
                  className="flex-1 p-2 bg-gray-900 border border-gray-700 rounded text-white"
                />
                <button
                  type="button"
                  onClick={() => removeOption(qIdx, optIdx)}
                  className="text-red-400 hover:text-red-300"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => addOption(qIdx)}
            className="mt-2 text-xs bg-blue-600 px-3 py-1 rounded hover:bg-blue-700"
          >
            {t("admin.addOptionButton")}
          </button>

          <textarea
            value={q.explanation || ""}
            onChange={(e) =>
              updateQuestion(qIdx, "explanation", e.target.value)
            }
            placeholder={t("admin.explanationOptionalPlaceholder")}
            className="w-full p-3 mt-4 bg-gray-900 border border-gray-700 rounded text-white font-mono text-sm"
            rows={3}
          />
        </div>
      ))}

      <button
        type="button"
        onClick={addQuestion}
        className="flex items-center gap-2 bg-blue-600 px-4 py-2 rounded hover:bg-blue-700"
      >
        <Plus size={16} /> {t("admin.addQuestionButton")}
      </button>
    </section>
  );
}
