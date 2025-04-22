"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { Trash2, Save, RefreshCw, Plus, ArrowLeft } from "lucide-react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Highlight, themes } from "prism-react-renderer";

interface Exercise {
  order: number;
  title: string;
  content: string;
  instructions?: string;
  language: "javascript" | "python" | "html" | "css" | "c" | "java" | "markup";
  expectedOutput?: string;
}

interface Lesson {
  _id: string;
  title: string;
}

const AdminExercise = () => {
  const { lessonId, order } = useParams<{ lessonId: string; order?: string }>();
  const navigate = useNavigate();
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [newExercise, setNewExercise] = useState<Exercise>({
    order: 0,
    title: "",
    content: "",
    instructions: "",
    language: "javascript",
    expectedOutput: "",
  });
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const isCreating = !order;

  const fetchExerciseAndLesson = useCallback(async () => {
    try {
      setLoading(true);
      const lessonRes = await axios.get(
        `http://localhost:5000/api/lessons/${lessonId}`
      );
      setLesson(lessonRes.data);
      if (order && !isCreating) {
        const exerciseRes = await axios.get(
          `http://localhost:5000/api/lessons/${lessonId}/exercises/${order}`
        );
        setExercise(exerciseRes.data);
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

  const handleCreateExercise = async () => {
    if (
      !newExercise.order ||
      !newExercise.title ||
      !newExercise.content ||
      !newExercise.language
    ) {
      toast.error("Orden, título, contenido y lenguaje son obligatorios.");
      return;
    }
    try {
      setActionLoading(true);
      await axios.post(
        `http://localhost:5000/api/lessons/${lessonId}/exercises`,
        newExercise
      );
      toast.success("Ejercicio creado exitosamente.");
      setNewExercise({
        order: 0,
        title: "",
        content: "",
        instructions: "",
        language: "javascript",
        expectedOutput: "",
      });
      navigate(`/admin/lessons/${lessonId}`);
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Error al crear el ejercicio."
      );
      console.error("Error al crear ejercicio:", error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateExercise = async () => {
    if (
      !exercise ||
      !exercise.order ||
      !exercise.title ||
      !exercise.content ||
      !exercise.language
    ) {
      toast.error("Orden, título, contenido y lenguaje son obligatorios.");
      return;
    }
    try {
      setActionLoading(true);
      await axios.put(
        `http://localhost:5000/api/lessons/${lessonId}/exercises/${order}`,
        exercise
      );
      toast.success("Ejercicio actualizado exitosamente.");
      fetchExerciseAndLesson();
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Error al actualizar el ejercicio."
      );
      console.error("Error al actualizar ejercicio:", error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteExercise = async () => {
    if (!window.confirm("¿Estás seguro de que deseas eliminar este ejercicio?"))
      return;
    try {
      setActionLoading(true);
      await axios.delete(
        `http://localhost:5000/api/lessons/${lessonId}/exercises/${order}`
      );
      toast.success("Ejercicio eliminado exitosamente.");
      navigate(`/admin/lessons/${lessonId}`);
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Error al eliminar el ejercicio."
      );
      console.error("Error al eliminar ejercicio:", error);
    } finally {
      setActionLoading(false);
    }
  };

  const renderCodeBlock = (code: string, language: string) => (
    <Highlight theme={themes.vsDark} code={code} language={language}>
      {({ className, style, tokens, getLineProps, getTokenProps }) => (
        <pre className={`${className} p-4 rounded-md`} style={style}>
          {tokens.map((line, i) => {
            const { key, ...lineProps } = getLineProps({ line, key: i }); // Extraer key explícitamente
            return (
              <div key={i} {...lineProps}>
                {line.map((token, index) => {
                  const { key: tokenKey, ...tokenProps } = getTokenProps({
                    token,
                    key: index,
                  }); // Extraer key explícitamente
                  return <span key={index} {...tokenProps} />;
                })}
              </div>
            );
          })}
        </pre>
      )}
    </Highlight>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="exercise-order" className="text-sm text-gray-400">
                Orden
              </label>
              <input
                id="exercise-order"
                type="number"
                value={isCreating ? newExercise.order : exercise?.order ?? 0}
                onChange={(e) =>
                  isCreating
                    ? setNewExercise({
                        ...newExercise,
                        order: parseInt(e.target.value) || 0,
                      })
                    : setExercise({
                        ...exercise!,
                        order: parseInt(e.target.value) || 0,
                      })
                }
                className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-required="true"
                aria-label="Orden del ejercicio"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="exercise-title" className="text-sm text-gray-400">
                Título
              </label>
              <input
                id="exercise-title"
                type="text"
                value={isCreating ? newExercise.title : exercise?.title ?? ""}
                onChange={(e) =>
                  isCreating
                    ? setNewExercise({ ...newExercise, title: e.target.value })
                    : setExercise({ ...exercise!, title: e.target.value })
                }
                className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-required="true"
                aria-label="Título del ejercicio"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label
                htmlFor="exercise-content"
                className="text-sm text-gray-400"
              >
                Contenido (Código Inicial)
              </label>
              <textarea
                id="exercise-content"
                value={
                  isCreating ? newExercise.content : exercise?.content ?? ""
                }
                onChange={(e) =>
                  isCreating
                    ? setNewExercise({
                        ...newExercise,
                        content: e.target.value,
                      })
                    : setExercise({ ...exercise!, content: e.target.value })
                }
                className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                rows={6}
                aria-required="true"
                aria-label="Contenido del ejercicio"
              />
              {(isCreating ? newExercise.content : exercise?.content) && (
                <div className="mt-2">
                  <p className="text-sm text-gray-400 mb-1">Vista Previa:</p>
                  {renderCodeBlock(
                    isCreating ? newExercise.content : exercise!.content,
                    isCreating ? newExercise.language : exercise!.language
                  )}
                </div>
              )}
            </div>
            <div className="space-y-2 md:col-span-2">
              <label
                htmlFor="exercise-instructions"
                className="text-sm text-gray-400"
              >
                Instrucciones (Opcional)
              </label>
              <textarea
                id="exercise-instructions"
                value={
                  isCreating
                    ? newExercise.instructions ?? ""
                    : exercise?.instructions ?? ""
                }
                onChange={(e) =>
                  isCreating
                    ? setNewExercise({
                        ...newExercise,
                        instructions: e.target.value,
                      })
                    : setExercise({
                        ...exercise!,
                        instructions: e.target.value,
                      })
                }
                className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
                aria-label="Instrucciones del ejercicio"
              />
            </div>
            <div className="space-y-2">
              <label
                htmlFor="exercise-language"
                className="text-sm text-gray-400"
              >
                Lenguaje
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
                    : setExercise({
                        ...exercise!,
                        language: e.target.value as Exercise["language"],
                      })
                }
                className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-required="true"
                aria-label="Lenguaje del ejercicio"
              >
                <option value="javascript">JavaScript</option>
                <option value="python">Python</option>
                <option value="html">HTML</option>
                <option value="css">CSS</option>
                <option value="c">C</option>
                <option value="java">Java</option>
                <option value="markup">Markup</option>
              </select>
            </div>
            <div className="space-y-2">
              <label
                htmlFor="exercise-expectedOutput"
                className="text-sm text-gray-400"
              >
                Salida Esperada (Opcional)
              </label>
              <textarea
                id="exercise-expectedOutput"
                value={
                  isCreating
                    ? newExercise.expectedOutput ?? ""
                    : exercise?.expectedOutput ?? ""
                }
                onChange={(e) =>
                  isCreating
                    ? setNewExercise({
                        ...newExercise,
                        expectedOutput: e.target.value,
                      })
                    : setExercise({
                        ...exercise!,
                        expectedOutput: e.target.value,
                      })
                }
                className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                rows={4}
                aria-label="Salida esperada del ejercicio"
              />
              {(isCreating
                ? newExercise.expectedOutput
                : exercise?.expectedOutput) && (
                <div className="mt-2">
                  <p className="text-sm text-gray-400 mb-1">Vista Previa:</p>
                  {renderCodeBlock(
                    isCreating
                      ? newExercise.expectedOutput!
                      : exercise!.expectedOutput!,
                    isCreating ? newExercise.language : exercise!.language
                  )}
                </div>
              )}
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
                  disabled={actionLoading}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Guardar cambios del ejercicio"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Guardar
                </button>
                <button
                  onClick={handleDeleteExercise}
                  disabled={actionLoading}
                  className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Eliminar ejercicio"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Eliminar
                </button>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default AdminExercise;
