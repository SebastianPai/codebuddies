import { useEffect, useCallback, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "@/context/AuthContext";
import { Exercise, Lesson, InstructionElement } from "@/types/exercise";
import { parseInstructions } from "../utils/parseInstructions";

interface UseExerciseDataReturn {
  exercise: Exercise | null;
  lesson: Lesson | null;
  loading: boolean;
  isExerciseCompleted: boolean;
  instructionElements: InstructionElement[];
  codes: { [language: string]: string };
  setExercise: React.Dispatch<React.SetStateAction<Exercise | null>>;
  setLesson: React.Dispatch<React.SetStateAction<Lesson | null>>;
  setIsExerciseCompleted: React.Dispatch<React.SetStateAction<boolean>>;
  setInstructionElements: React.Dispatch<
    React.SetStateAction<InstructionElement[]>
  >;
  setCodes: React.Dispatch<
    React.SetStateAction<{ [language: string]: string }>
  >;
}

export const useExerciseData = (): UseExerciseDataReturn => {
  const { fetchWithAuth } = useAuth();
  const { courseId, lessonId, exerciseOrder } = useParams<{
    courseId: string;
    lessonId: string;
    exerciseOrder: string;
  }>();
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [isExerciseCompleted, setIsExerciseCompleted] = useState(false);
  const [instructionElements, setInstructionElements] = useState<
    InstructionElement[]
  >([]);
  const [codes, setCodes] = useState<{ [language: string]: string }>({});

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      if (!courseId || !lessonId || !exerciseOrder) {
        throw new Error(
          `Parámetros inválidos: courseId=${courseId}, lessonId=${lessonId}, exerciseOrder=${exerciseOrder}`
        );
      }

      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error(
          "No se encontró un token de autenticación. Por favor, inicia sesión."
        );
      }

      const lessonRes = await fetchWithAuth(`/api/lessons/${lessonId}`);
      if (!lessonRes.ok) {
        const errorData = await lessonRes.json();
        throw new Error(errorData.message || "Error al obtener la lección");
      }
      const lessonData = await lessonRes.json();
      setLesson(lessonData);

      const exerciseRes = await fetchWithAuth(
        `/api/lessons/${lessonId}/exercises/${exerciseOrder}`
      );
      if (!exerciseRes.ok) {
        const errorData = await exerciseRes.json();
        throw new Error(errorData.message || "Error al obtener el ejercicio");
      }
      const fetchedExercise = await exerciseRes.json();
      setExercise(fetchedExercise);

      // Inicializar códigos
      const initialCodes: { [language: string]: string } = {};
      fetchedExercise.codes.forEach(
        (code: { language: string; initialCode: string }) => {
          initialCodes[code.language] =
            code.initialCode ||
            `// Escribe tu código ${code.language} aquí\n\n`;
        }
      );
      setCodes(initialCodes);

      if (fetchedExercise.instructions) {
        setInstructionElements(parseInstructions(fetchedExercise.instructions));
      }

      const progressRes = await fetchWithAuth(
        `/api/progress/courses/${courseId}/lessons/${lessonId}/exercises/${exerciseOrder}/progress`
      );
      if (progressRes.ok) {
        const progressData = await progressRes.json();
        setIsExerciseCompleted(progressData.completed || false);
      } else {
        setIsExerciseCompleted(false);
        const errorData = await progressRes.json();
        toast.warn(
          errorData.message || "No se pudo cargar el progreso del ejercicio.",
          {
            toastId: "progress-error",
            autoClose: 3000,
          }
        );
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "No se pudo cargar el ejercicio.";
      toast.error(errorMessage, { toastId: "fetch-error", autoClose: 3000 });
    } finally {
      setLoading(false);
    }
  }, [courseId, lessonId, exerciseOrder, fetchWithAuth]);

  useEffect(() => {
    if (courseId && lessonId && exerciseOrder) {
      fetchData();
    } else {
      toast.error("Faltan parámetros en la URL.", {
        toastId: "url-error",
        autoClose: 3000,
      });
      setLoading(false);
    }
  }, [courseId, lessonId, exerciseOrder, fetchData]);

  return {
    exercise,
    lesson,
    loading,
    isExerciseCompleted,
    instructionElements,
    codes,
    setExercise,
    setLesson,
    setIsExerciseCompleted,
    setInstructionElements,
    setCodes,
  };
};
