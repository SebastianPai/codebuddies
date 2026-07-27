import { Code, InstructionElement } from "../types";
import CodeHighlight from "../../../../../components/CodeHighlight";
import { Plus, Trash2 } from "lucide-react";
import { ToastContainer, toast } from "react-toastify";
import { useTranslation } from "../../../../../src/i18n/useTranslation";

interface CodeExerciseFormProps {
  codes: Code[];
  instructionElements: InstructionElement[];
  setCodes: React.Dispatch<React.SetStateAction<Code[]>>;
  setInstructionElements: React.Dispatch<
    React.SetStateAction<InstructionElement[]>
  >;
}

export default function CodeExerciseForm({
  codes,
  instructionElements,
  setCodes,
  setInstructionElements,
}: CodeExerciseFormProps) {
  const t = useTranslation();
  // Funciones para instrucciones dinámicas (texto/code/image/video)
  const addElement = (type: InstructionElement["type"], index: number) => {
    const newElement: InstructionElement =
      type === "text"
        ? { type: "text", value: "" }
        : type === "code"
          ? { type: "code", value: "", language: "javascript" }
          : type === "image"
            ? { type: "image", value: "" }
            : { type: "video", value: "" };

    setInstructionElements([
      ...instructionElements.slice(0, index + 1),
      newElement,
      ...instructionElements.slice(index + 1),
    ]);
  };

  const updateElement = (
    index: number,
    field: "value" | "language",
    value: string,
  ) => {
    const updated = [...instructionElements];
    if (field === "language" && updated[index].type === "code") {
      updated[index] = { ...updated[index], language: value };
    } else if (field === "value") {
      updated[index] = { ...updated[index], value };
    }
    setInstructionElements(updated);
  };

  const removeElement = (index: number) => {
    if (instructionElements.length === 1) {
      setInstructionElements([{ type: "text", value: "" }]);
    } else {
      setInstructionElements(instructionElements.filter((_, i) => i !== index));
    }
  };

  // Funciones para códigos
  const addCode = () => {
    setCodes([
      ...codes,
      { language: "javascript", initialCode: "", expectedCode: "" },
    ]);
  };

  const updateCode = (index: number, field: keyof Code, value: string) => {
    const updated = [...codes];
    updated[index] = { ...updated[index], [field]: value };
    setCodes(updated);
  };

  const removeCode = (index: number) => {
    if (codes.length > 1) {
      setCodes(codes.filter((_, i) => i !== index));
    }
  };

  return (
    <>
      {/* Instrucciones dinámicas */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold mb-4">
          {t("admin.instructionsTitle")}
        </h2>
        {instructionElements.map((el, idx) => (
          <div
            key={idx}
            className="mb-6 p-4 bg-gray-800 rounded border border-gray-700"
          >
            <div className="flex justify-between mb-2">
              <span className="text-sm text-gray-400">
                {el.type === "text"
                  ? t("admin.instructionTypeText")
                  : el.type === "code"
                    ? t("admin.codeTypeOption")
                    : el.type === "image"
                      ? t("admin.instructionTypeImage")
                      : t("admin.instructionTypeVideo")}
              </span>
              <button
                onClick={() => removeElement(idx)}
                className="text-red-400 hover:text-red-300"
              >
                <Trash2 size={16} />
              </button>
            </div>

            {el.type === "text" && (
              <textarea
                value={el.value}
                onChange={(e) => updateElement(idx, "value", e.target.value)}
                className="w-full p-3 bg-gray-900 border border-gray-700 rounded text-white font-mono text-sm"
                rows={4}
                placeholder={t("admin.textPlaceholder")}
              />
            )}

            {el.type === "code" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <select
                    value={el.language || "javascript"}
                    onChange={(e) =>
                      updateElement(idx, "language", e.target.value)
                    }
                    className="w-full p-2 mb-2 bg-gray-900 border border-gray-700 rounded text-white"
                  >
                    <option value="javascript">JavaScript</option>
                    <option value="python">Python</option>
                    <option value="html">HTML</option>
                    <option value="css">CSS</option>
                  </select>
                  <textarea
                    value={el.value}
                    onChange={(e) =>
                      updateElement(idx, "value", e.target.value)
                    }
                    className="w-full p-3 bg-gray-900 border border-gray-700 rounded text-white font-mono text-sm"
                    rows={6}
                    placeholder={t("admin.codePlaceholder")}
                  />
                </div>
                {el.value.trim() && (
                  <CodeHighlight
                    code={el.value}
                    language={el.language || "text"}
                    showCopy
                  />
                )}
              </div>
            )}

            {(el.type === "image" || el.type === "video") && (
              <>
                <input
                  type="url"
                  value={el.value}
                  onChange={(e) => updateElement(idx, "value", e.target.value)}
                  placeholder={
                    el.type === "image"
                      ? t("admin.imageUrlPlaceholder")
                      : t("admin.videoUrlPlaceholder")
                  }
                  className="w-full p-3 bg-gray-900 border border-gray-700 rounded text-white mb-2"
                />
                {el.value.trim() && el.type === "image" && (
                  <img
                    src={el.value.trim()}
                    alt={t("items.previewAlt")}
                    className="max-h-48 object-contain rounded"
                    onError={(e) => {
                      toast.error(t("admin.invalidUrlToast"));
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                )}
                {el.value.trim() && el.type === "video" && (
                  <iframe
                    src={el.value.trim()}
                    title={t("admin.videoPreviewTitle")}
                    className="w-full h-48 rounded"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                )}
              </>
            )}

            <div className="flex gap-2 mt-3">
              <button
                onClick={() => addElement("text", idx)}
                className="text-xs bg-blue-600 px-3 py-1 rounded hover:bg-blue-700"
              >
                {t("admin.addTextButton")}
              </button>
              <button
                onClick={() => addElement("code", idx)}
                className="text-xs bg-blue-600 px-3 py-1 rounded hover:bg-blue-700"
              >
                {t("admin.addCodeButton")}
              </button>
              <button
                onClick={() => addElement("image", idx)}
                className="text-xs bg-blue-600 px-3 py-1 rounded hover:bg-blue-700"
              >
                {t("admin.addImageButton")}
              </button>
              <button
                onClick={() => addElement("video", idx)}
                className="text-xs bg-blue-600 px-3 py-1 rounded hover:bg-blue-700"
              >
                {t("admin.addVideoButton")}
              </button>
            </div>
          </div>
        ))}
      </section>

      {/* Códigos múltiples */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold mb-4">
          {t("admin.codesTitle")}
        </h2>
        {codes.map((code, idx) => (
          <div
            key={idx}
            className="mb-6 p-4 bg-gray-800 rounded border border-gray-700"
          >
            <div className="flex justify-between mb-3">
              <span className="text-sm text-gray-400">{t("admin.codeNumberLabel", { index: idx + 1 })}</span>
              <button
                onClick={() => removeCode(idx)}
                className="text-red-400 hover:text-red-300"
              >
                <Trash2 size={16} />
              </button>
            </div>

            <select
              value={code.language}
              onChange={(e) => updateCode(idx, "language", e.target.value)}
              className="w-full p-2 mb-3 bg-gray-900 border border-gray-700 rounded text-white"
            >
              <option value="javascript">JavaScript</option>
              <option value="python">Python</option>
              <option value="html">HTML</option>
              <option value="css">CSS</option>
            </select>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">
                  {t("admin.initialCodeLabel")}
                </label>
                <textarea
                  value={code.initialCode}
                  onChange={(e) =>
                    updateCode(idx, "initialCode", e.target.value)
                  }
                  className="w-full p-3 bg-gray-900 border border-gray-700 rounded text-white font-mono text-sm"
                  rows={6}
                />
                {code.initialCode.trim() && (
                  <CodeHighlight
                    code={code.initialCode}
                    language={code.language}
                    showCopy
                  />
                )}
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">
                  {t("admin.expectedCodeOptionalLabel")}
                </label>
                <textarea
                  value={code.expectedCode || ""}
                  onChange={(e) =>
                    updateCode(idx, "expectedCode", e.target.value)
                  }
                  className="w-full p-3 bg-gray-900 border border-gray-700 rounded text-white font-mono text-sm"
                  rows={6}
                />
                {code.expectedCode?.trim() && (
                  <CodeHighlight
                    code={code.expectedCode}
                    language={code.language}
                    showCopy
                  />
                )}
              </div>
            </div>
          </div>
        ))}
        <button
          onClick={addCode}
          className="flex items-center gap-2 bg-green-600 px-4 py-2 rounded hover:bg-green-700"
        >
          <Plus size={16} /> {t("admin.addCodeBlockButton")}
        </button>
      </section>
    </>
  );
}
