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

  const updateQuestion = (
    qIndex: number,
    field: keyof QuizQuestion | "isMultiple",
    value: any,
  ) => {
    const updated = [...questions];
    if (field === "isMultiple") {
      updated[qIndex] = {
        ...updated[qIndex],
        isMultiple: value,
        correct: value
          ? updated[qIndex].correct
          : [updated[qIndex].correct[0] || 0],
      };
    } else {
      updated[qIndex] = { ...updated[qIndex], [field]: value };
    }
    setQuestions(updated);
  };

  const updateOption = (qIndex: number, optIndex: number, value: string) => {
    const updated = [...questions];
    updated[qIndex].options[optIndex] = value;
    setQuestions(updated);
  };

  const addOption = (qIndex: number) => {
    const updated = [...questions];
    updated[qIndex].options.push("");
    setQuestions(updated);
  };

  const removeOption = (qIndex: number, optIndex: number) => {
    const updated = [...questions];
    updated[qIndex].options = updated[qIndex].options.filter(
      (_, i) => i !== optIndex,
    );
    updated[qIndex].correct = updated[qIndex].correct
      .filter((c) => c !== optIndex)
      .map((c) => (c > optIndex ? c - 1 : c));
    setQuestions(updated);
  };

  const toggleCorrect = (qIndex: number, optIndex: number) => {
    const updated = [...questions];
    const correct = updated[qIndex].correct;
    if (updated[qIndex].isMultiple) {
      if (correct.includes(optIndex)) {
        updated[qIndex].correct = correct.filter((c) => c !== optIndex);
      } else {
        updated[qIndex].correct = [...correct, optIndex];
      }
    } else {
      updated[qIndex].correct = [optIndex];
    }
    setQuestions(updated);
  };

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
                  onClick={() => removeOption(qIdx, optIdx)}
                  className="text-red-400 hover:text-red-300"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          <button
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
        onClick={addQuestion}
        className="flex items-center gap-2 bg-blue-600 px-4 py-2 rounded hover:bg-blue-700"
      >
        <Plus size={16} /> {t("admin.addQuestionButton")}
      </button>
    </section>
  );
}
