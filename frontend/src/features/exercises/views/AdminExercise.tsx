"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Trash2,
  Save,
  RefreshCw,
  Plus,
  ArrowLeft,
  Copy,
  Image as ImageIcon,
} from "lucide-react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Highlight, themes } from "prism-react-renderer";

interface Code {
  language:
    | "javascript"
    | "python"
    | "html"
    | "css"
    | "c"
    | "java"
    | "markup"
    | "sql"
    | "php";
  initialCode: string;
  expectedCode?: string;
}

interface Exercise {
  order: number;
  title: string;
  codes: Code[];
  instructions?: string;
  language:
    | "javascript"
    | "python"
    | "html"
    | "css"
    | "c"
    | "java"
    | "markup"
    | "sql"
    | "php";
}

interface Lesson {
  _id: string;
  title: string;
  exercises: Exercise[];
}

type InstructionElement =
  | { type: "text"; value: string }
  | { type: "code"; language: string; value: string }
  | { type: "image"; value: string };

const AdminExercise = () => {
  const { lessonId, order } = useParams<{ lessonId: string; order?: string }>();
  const navigate = useNavigate();
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [newExercise, setNewExercise] = useState<Exercise>({
    order: 0,
    title: "",
    codes: [{ language: "javascript", initialCode: "", expectedCode: "" }],
    instructions: "",
    language: "javascript",
  });
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [instructionElements, setInstructionElements] = useState<
    InstructionElement[]
  >([{ type: "text", value: "" }]);
  const isCreating = !order;

  // Configura Axios con el token JWT
  const axiosInstance = axios.create({
    baseURL: "http://localhost:5000/api",
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  });

  const fetchExerciseAndLesson = useCallback(async () => {
    try {
      setLoading(true);
      const lessonRes = await axiosInstance.get(`/lessons/${lessonId}`);
      const lessonData = lessonRes.data;
      setLesson(lessonData);

      if (isCreating) {
        const maxOrder = lessonData.exercises.length
          ? Math.max(...lessonData.exercises.map((ex: Exercise) => ex.order))
          : 0;
        setNewExercise((prev) => ({ ...prev, order: maxOrder + 1 }));
      } else if (order) {
        const exerciseRes = await axiosInstance.get(
          `/lessons/${lessonId}/exercises/${order}`
        );
        const fetchedExercise = exerciseRes.data;
        setExercise(fetchedExercise);
        if (fetchedExercise.instructions) {
          parseInstructions(fetchedExercise.instructions);
        } else {
          setInstructionElements([{ type: "text", value: "" }]);
        }
      }
    } catch (error: any) {
      toast.error(
        error.response?.data?.message ||
          "No se pudo cargar el ejercicio o la lección."
      );
      console.error("Error al cargar datos:", error);
    } finally {
      setLoading(false);
    }
  }, [lessonId, order, isCreating]);

  useEffect(() => {
    if (lessonId) {
      fetchExerciseAndLesson();
    }
  }, [lessonId, fetchExerciseAndLesson]);

  // Parse instructions to extract elements
  const parseInstructions = (instructions: string) => {
    const lines = instructions.split("\n");
    const elements: InstructionElement[] = [];
    let currentText = "";
    let inCodeBlock = false;
    let currentCode = "";
    let currentCodeLang = "";

    lines.forEach((line) => {
      if (line.match(/!\[.*\]\(.*\)/)) {
        const urlMatch = line.match(/!\[.*\]\((.*)\)/);
        if (urlMatch) {
          if (currentText.trim()) {
            elements.push({ type: "text", value: currentText.trim() });
            currentText = "";
          }
          elements.push({ type: "image", value: urlMatch[1] });
        }
        return;
      }
      if (line.startsWith("```")) {
        if (inCodeBlock) {
          if (currentText.trim()) {
            elements.push({ type: "text", value: currentText.trim() });
            currentText = "";
          }
          elements.push({
            type: "code",
            language: currentCodeLang || "javascript",
            value: currentCode.trim(),
          });
          currentCode = "";
          currentCodeLang = "";
          inCodeBlock = false;
        } else {
          currentCodeLang = line.slice(3).trim() || "javascript";
          inCodeBlock = true;
        }
        return;
      }
      if (inCodeBlock) {
        currentCode += line + "\n";
        return;
      }
      currentText += line + "\n";
    });

    if (currentText.trim()) {
      elements.push({ type: "text", value: currentText.trim() });
    }

    setInstructionElements(
      elements.length ? elements : [{ type: "text", value: "" }]
    );
  };

  // Add a new instruction element
  const addInstructionElement = (
    type: InstructionElement["type"],
    index: number
  ) => {
    const newElement: InstructionElement =
      type === "text"
        ? { type: "text", value: "" }
        : type === "code"
        ? { type: "code", language: "javascript", value: "" }
        : { type: "image", value: "" };
    const newElements = [
      ...instructionElements.slice(0, index + 1),
      newElement,
      ...instructionElements.slice(index + 1),
    ];
    setInstructionElements(newElements);
  };

  // Update instruction element
  const updateInstructionElement = (
    index: number,
    field: "value" | "language",
    value: string
  ) => {
    const updatedElements = [...instructionElements];
    if (field === "language" && updatedElements[index].type === "code") {
      updatedElements[index] = { ...updatedElements[index], language: value };
    } else if (field === "value") {
      updatedElements[index] = { ...updatedElements[index], value };
    }
    setInstructionElements(updatedElements);
  };

  // Remove instruction element
  const removeInstructionElement = (index: number) => {
    if (instructionElements.length === 1) {
      setInstructionElements([{ type: "text", value: "" }]);
    } else {
      setInstructionElements(instructionElements.filter((_, i) => i !== index));
    }
  };

  // Generate instructions string
  const generateInstructions = () => {
    return instructionElements
      .filter((el) => el.value.trim())
      .map((el) => {
        if (el.type === "text") return el.value.trim();
        if (el.type === "code")
          return `\`\`\`${el.language}\n${el.value.trim()}\n\`\`\``;
        if (el.type === "image") return `![Imagen](${el.value.trim()})`;
        return "";
      })
      .join("\n\n");
  };

  // Add a new code entry
  const addCodeEntry = () => {
    const newCode: Code = {
      language: "javascript",
      initialCode: "",
      expectedCode: "",
    };
    if (isCreating) {
      setNewExercise((prev) => ({
        ...prev,
        codes: [...prev.codes, newCode],
      }));
    } else if (exercise) {
      setExercise({
        ...exercise,
        codes: [...exercise.codes, newCode],
      });
    }
  };

  // Update a code entry
  const updateCodeEntry = (
    index: number,
    field: "language" | "initialCode" | "expectedCode",
    value: string
  ) => {
    if (isCreating) {
      setNewExercise((prev) => {
        const updatedCodes = [...prev.codes];
        updatedCodes[index] = { ...updatedCodes[index], [field]: value };
        return { ...prev, codes: updatedCodes };
      });
    } else if (exercise) {
      setExercise({
        ...exercise,
        codes: exercise.codes.map((code, i) =>
          i === index ? { ...code, [field]: value } : code
        ),
      });
    }
  };

  // Remove a code entry
  const removeCodeEntry = (index: number) => {
    if (isCreating) {
      setNewExercise((prev) => ({
        ...prev,
        codes:
          prev.codes.length > 1
            ? prev.codes.filter((_, i) => i !== index)
            : [{ language: "javascript", initialCode: "", expectedCode: "" }],
      }));
    } else if (exercise) {
      setExercise({
        ...exercise,
        codes:
          exercise.codes.length > 1
            ? exercise.codes.filter((_, i) => i !== index)
            : [{ language: "javascript", initialCode: "", expectedCode: "" }],
      });
    }
  };

  const handleCreateExercise = async () => {
    if (
      !newExercise.title ||
      !newExercise.language ||
      !newExercise.codes.length
    ) {
      toast.error(
        "Título, lenguaje principal y al menos un código son obligatorios."
      );
      return;
    }
    try {
      setActionLoading(true);
      const exerciseData = {
        order: newExercise.order,
        title: newExercise.title,
        codes: newExercise.codes,
        instructions: generateInstructions(),
        language: newExercise.language,
      };
      await axiosInstance.post(`/lessons/${lessonId}/exercises`, exerciseData);
      toast.success("Ejercicio creado exitosamente.");
      setNewExercise({
        order: lesson?.exercises.length
          ? Math.max(...lesson.exercises.map((ex) => ex.order)) + 1
          : 1,
        title: "",
        codes: [{ language: "javascript", initialCode: "", expectedCode: "" }],
        instructions: "",
        language: "javascript",
      });
      setInstructionElements([{ type: "text", value: "" }]);
      navigate(`/admin/lessons/${lessonId}`);
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Error al crear el ejercicio."
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateExercise = async () => {
    if (
      !exercise ||
      !exercise.order ||
      !exercise.title ||
      !exercise.language ||
      !exercise.codes.length
    ) {
      toast.error(
        "Orden, título, lenguaje principal y al menos un código son obligatorios."
      );
      return;
    }
    try {
      setActionLoading(true);
      const exerciseData = {
        order: exercise.order,
        title: exercise.title,
        codes: exercise.codes,
        instructions: generateInstructions(),
        language: exercise.language,
      };
      await axiosInstance.put(
        `/lessons/${lessonId}/exercises/${order}`,
        exerciseData
      );
      toast.success("Ejercicio actualizado exitosamente.");
      fetchExerciseAndLesson();
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Error al actualizar el ejercicio."
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteExercise = async () => {
    if (!window.confirm("¿Estás seguro de que deseas eliminar este ejercicio?"))
      return;
    try {
      setActionLoading(true);
      await axiosInstance.delete(`/lessons/${lessonId}/exercises/${order}`);
      toast.success("Ejercicio eliminado exitosamente.");
      navigate(`/admin/lessons/${lessonId}`);
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Error al eliminar el ejercicio."
      );
    } finally {
      setActionLoading(false);
    }
  };

  const renderCodeBlock = (
    code: string,
    language: string,
    showCopyButton: boolean = false
  ) => (
    <div className="relative">
      <Highlight theme={themes.vsDark} code={code} language={language}>
        {({ className, style, tokens, getLineProps, getTokenProps }) => (
          <pre className={`${className} p-4 rounded-md`} style={style}>
            {tokens.map((line, i) => {
              const { key, ...lineProps } = getLineProps({ line, key: i });
              return (
                <div key={i} {...lineProps}>
                  {line.map((token, index) => {
                    const { key: tokenKey, ...tokenProps } = getTokenProps({
                      token,
                      key: index,
                    });
                    return <span key={index} {...tokenProps} />;
                  })}
                </div>
              );
            })}
          </pre>
        )}
      </Highlight>
      {showCopyButton && (
        <button
          onClick={() => {
            navigator.clipboard.writeText(code);
            toast.success("Código copiado al portapapeles.");
          }}
          className="absolute top-2 right-2 bg-gray-700 text-white p-1 rounded-md hover:bg-gray-600 transition-colors"
          aria-label="Copiar código"
        >
          <Copy className="w-4 h-4" />
        </button>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="flex justify-center p-8 bg-[#0f1729] text-white">
        <div
          className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"
          aria-label="Cargando ejercicio"
        ></div>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="p-8 text-center bg-[#0f1729] text-white">
        <p className="text-gray-400" aria-live="polite">
          Lección no encontrada.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#0f1729] text-white">
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
      />

      <header className="flex items-center justify-between p-4 bg-[#1a1a2e] border-b border-gray-800">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate(`/admin/lessons/${lessonId}`)}
            className="p-2 bg-gray-700 rounded-md hover:bg-gray-600 transition-colors"
            aria-label="Volver a lecciones"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">
            {isCreating ? "Crear Ejercicio" : "Editar Ejercicio"}
          </h1>
        </div>
        <button
          onClick={fetchExerciseAndLesson}
          disabled={loading || actionLoading}
          className="p-2 bg-gray-700 rounded-md hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Refrescar datos"
          aria-label="Refrescar datos"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </header>

      <div className="flex-1 p-6 overflow-auto">
        <header className="mb-6 text-center">
          <h2 className="text-2xl font-bold text-white">{lesson.title}</h2>
          {!isCreating && exercise && (
            <p className="text-gray-400 mt-2">
              Ejercicio {exercise.order}: {exercise.title}
            </p>
          )}
        </header>

        <section className="bg-[#1a1a2e] p-4 rounded-xl border border-gray-800">
          <h2 className="text-lg font-semibold mb-4 text-white">
            {isCreating ? "Crear Nuevo Ejercicio" : "Editar Ejercicio"}
          </h2>
          <div className="space-y-4">
            {/* Order (only for editing) */}
            {!isCreating && exercise && (
              <div className="space-y-2">
                <label
                  htmlFor="exercise-order"
                  className="text-sm text-gray-400"
                >
                  Orden
                </label>
                <input
                  id="exercise-order"
                  type="number"
                  value={exercise.order}
                  onChange={(e) =>
                    setExercise({
                      ...exercise,
                      order: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-required="true"
                  aria-label="Orden del ejercicio"
                />
              </div>
            )}

            {/* Title and Language Side by Side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label
                  htmlFor="exercise-title"
                  className="text-sm text-gray-400"
                >
                  Título
                </label>
                <input
                  id="exercise-title"
                  type="text"
                  value={isCreating ? newExercise.title : exercise?.title ?? ""}
                  onChange={(e) =>
                    isCreating
                      ? setNewExercise({
                          ...newExercise,
                          title: e.target.value,
                        })
                      : exercise &&
                        setExercise({ ...exercise, title: e.target.value })
                  }
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-required="true"
                  aria-label="Título del ejercicio"
                />
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="exercise-language"
                  className="text-sm text-gray-400"
                >
                  Lenguaje Principal
                </label>
                <select
                  id="exercise-language"
                  value={
                    isCreating
                      ? newExercise.language
                      : exercise?.language ?? "javascript"
                  }
                  onChange={(e) =>
                    isCreating
                      ? setNewExercise({
                          ...newExercise,
                          language: e.target.value as Exercise["language"],
                        })
                      : exercise &&
                        setExercise({
                          ...exercise,
                          language: e.target.value as Exercise["language"],
                        })
                  }
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-required="true"
                  aria-label="Lenguaje principal del ejercicio"
                >
                  <option value="javascript">JavaScript</option>
                  <option value="python">Python</option>
                  <option value="html">HTML</option>
                  <option value="css">CSS</option>
                  <option value="c">C</option>
                  <option value="java">Java</option>
                  <option value="markup">Markup</option>
                  <option value="sql">SQL</option>
                  <option value="php">PHP</option>
                </select>
              </div>
            </div>

            {/* Instructions */}
            <div className="space-y-2">
              <label className="text-sm text-gray-400">
                Instrucciones (Opcional)
              </label>
              <div className="space-y-4">
                {instructionElements.map((element, index) => (
                  <div
                    key={index}
                    className="space-y-2 mb-4 border-b border-gray-700 pb-4"
                  >
                    <div className="flex justify-between items-center">
                      <h4 className="text-sm text-gray-400">
                        {element.type === "text"
                          ? "Texto"
                          : element.type === "code"
                          ? "Código"
                          : "Imagen"}{" "}
                        {index + 1}
                      </h4>
                      <button
                        onClick={() => removeInstructionElement(index)}
                        className="bg-red-600 text-white px-2 py-1 rounded-md hover:bg-red-700 transition-colors"
                        aria-label={`Eliminar ${element.type} ${index + 1}`}
                      >
                        Eliminar
                      </button>
                    </div>
                    {element.type === "text" && (
                      <textarea
                        value={element.value}
                        onChange={(e) =>
                          updateInstructionElement(
                            index,
                            "value",
                            e.target.value
                          )
                        }
                        className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows={4}
                        aria-label={`Texto de instrucción ${index + 1}`}
                      />
                    )}
                    {element.type === "code" && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label
                            htmlFor={`code-language-${index}`}
                            className="text-sm text-gray-400"
                          >
                            Lenguaje
                          </label>
                          <select
                            id={`code-language-${index}`}
                            value={element.language}
                            onChange={(e) =>
                              updateInstructionElement(
                                index,
                                "language",
                                e.target.value
                              )
                            }
                            className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="javascript">JavaScript</option>
                            <option value="python">Python</option>
                            <option value="html">HTML</option>
                            <option value="css">CSS</option>
                            <option value="c">C</option>
                            <option value="java">Java</option>
                            <option value="markup">Markup</option>
                            <option value="sql">SQL</option>
                            <option value="php">PHP</option>
                          </select>
                          <label
                            htmlFor={`code-value-${index}`}
                            className="text-sm text-gray-400"
                          >
                            Código
                          </label>
                          <textarea
                            id={`code-value-${index}`}
                            value={element.value}
                            onChange={(e) =>
                              updateInstructionElement(
                                index,
                                "value",
                                e.target.value
                              )
                            }
                            className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                            rows={4}
                            aria-label={`Código de instrucción ${index + 1}`}
                          />
                        </div>
                        {element.value && (
                          <div className="space-y-2">
                            <p className="text-sm text-gray-400">
                              Vista Previa:
                            </p>
                            {renderCodeBlock(
                              element.value,
                              element.language,
                              true
                            )}
                          </div>
                        )}
                      </div>
                    )}
                    {element.type === "image" && (
                      <div className="space-y-2">
                        <label
                          htmlFor={`image-url-${index}`}
                          className="text-sm text-gray-400"
                        >
                          URL de la Imagen
                        </label>
                        <input
                          id={`image-url-${index}`}
                          type="url"
                          value={element.value}
                          onChange={(e) =>
                            updateInstructionElement(
                              index,
                              "value",
                              e.target.value
                            )
                          }
                          className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="https://example.com/image.jpg"
                          aria-label={`URL de imagen ${index + 1}`}
                        />
                        {element.value && (
                          <img
                            src={element.value}
                            alt={`Imagen ${index + 1}`}
                            className="w-48 h-48 object-cover rounded-md mt-2"
                            onError={() =>
                              toast.error(
                                `No se pudo cargar la imagen ${index + 1}.`
                              )
                            }
                          />
                        )}
                      </div>
                    )}
                    <div className="flex space-x-2">
                      <button
                        onClick={() => addInstructionElement("text", index)}
                        className="bg-blue-600 text-white px-2 py-1 rounded-md hover:bg-blue-700 transition-colors"
                        aria-label="Agregar texto después"
                      >
                        + Texto
                      </button>
                      <button
                        onClick={() => addInstructionElement("code", index)}
                        className="bg-blue-600 text-white px-2 py-1 rounded-md hover:bg-blue-700 transition-colors"
                        aria-label="Agregar código después"
                      >
                        + Código
                      </button>
                      <button
                        onClick={() => addInstructionElement("image", index)}
                        className="bg-blue-600 text-white px-2 py-1 rounded-md hover:bg-blue-700 transition-colors"
                        aria-label="Agregar imagen después"
                      >
                        + Imagen
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Codes Section */}
            <div className="space-y-2">
              <label className="text-sm text-gray-400">
                Códigos (Inicial y Esperado)
              </label>
              <div className="space-y-4">
                {(isCreating ? newExercise.codes : exercise?.codes ?? []).map(
                  (code, index) => (
                    <div
                      key={index}
                      className="space-y-2 mb-4 border-b border-gray-700 pb-4"
                    >
                      <div className="flex justify-between items-center">
                        <h4 className="text-sm text-gray-400">
                          Código {index + 1} ({code.language})
                        </h4>
                        <button
                          onClick={() => removeCodeEntry(index)}
                          className="bg-red-600 text-white px-2 py-1 rounded-md hover:bg-red-700 transition-colors"
                          aria-label={`Eliminar código ${index + 1}`}
                        >
                          Eliminar
                        </button>
                      </div>
                      <div className="space-y-2">
                        <label
                          htmlFor={`code-language-${index}`}
                          className="text-sm text-gray-400"
                        >
                          Lenguaje
                        </label>
                        <select
                          id={`code-language-${index}`}
                          value={code.language}
                          onChange={(e) =>
                            updateCodeEntry(index, "language", e.target.value)
                          }
                          className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="javascript">JavaScript</option>
                          <option value="python">Python</option>
                          <option value="html">HTML</option>
                          <option value="css">CSS</option>
                          <option value="c">C</option>
                          <option value="java">Java</option>
                          <option value="markup">Markup</option>
                          <option value="sql">SQL</option>
                          <option value="php">PHP</option>
                        </select>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label
                            htmlFor={`initial-code-${index}`}
                            className="text-sm text-gray-400"
                          >
                            Código Inicial
                          </label>
                          <textarea
                            id={`initial-code-${index}`}
                            value={code.initialCode}
                            onChange={(e) =>
                              updateCodeEntry(
                                index,
                                "initialCode",
                                e.target.value
                              )
                            }
                            className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                            rows={6}
                            aria-label={`Código inicial ${index + 1}`}
                          />
                        </div>
                        {code.initialCode && (
                          <div className="space-y-2">
                            <p className="text-sm text-gray-400">
                              Vista Previa Inicial:
                            </p>
                            {renderCodeBlock(code.initialCode, code.language)}
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label
                            htmlFor={`expected-code-${index}`}
                            className="text-sm text-gray-400"
                          >
                            Código Esperado (Opcional)
                          </label>
                          <textarea
                            id={`expected-code-${index}`}
                            value={code.expectedCode ?? ""}
                            onChange={(e) =>
                              updateCodeEntry(
                                index,
                                "expectedCode",
                                e.target.value
                              )
                            }
                            className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                            rows={6}
                            aria-label={`Código esperado ${index + 1}`}
                          />
                        </div>
                        {code.expectedCode && (
                          <div className="space-y-2">
                            <p className="text-sm text-gray-400">
                              Vista Previa Esperado:
                            </p>
                            {renderCodeBlock(code.expectedCode, code.language)}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                )}
                <button
                  onClick={addCodeEntry}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center"
                  aria-label="Agregar nuevo código"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar Código
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mt-4">
              {isCreating ? (
                <button
                  onClick={handleCreateExercise}
                  disabled={actionLoading}
                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Crear nuevo ejercicio"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Crear Ejercicio
                </button>
              ) : (
                <>
                  <button
                    onClick={handleUpdateExercise}
                    disabled={actionLoading || !exercise}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Guardar cambios del ejercicio"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Guardar
                  </button>
                  <button
                    onClick={handleDeleteExercise}
                    disabled={actionLoading || !exercise}
                    className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Eliminar ejercicio"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Eliminar
                  </button>
                </>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AdminExercise;
