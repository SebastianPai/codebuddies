import { Course, Lesson, Progress, ErrorResponse } from "@/types/course";
import { AuthContextType } from "@/context/AuthContext";

export const fetchCourse = async (
  courseId: string,
  fetchWithAuth: AuthContextType["fetchWithAuth"]
): Promise<Course> => {
  const response = await fetchWithAuth(`/api/courses/${courseId}`);
  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as ErrorResponse;
    throw new Error(
      error.message || `Error al obtener el curso (status: ${response.status})`
    );
  }
  return response.json();
};

export const fetchLessons = async (
  courseId: string,
  fetchWithAuth: AuthContextType["fetchWithAuth"]
): Promise<Lesson[]> => {
  const response = await fetchWithAuth(`/api/courses/${courseId}/lessons`);
  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as ErrorResponse;
    throw new Error(
      error.message ||
        `Error al obtener las lecciones (status: ${response.status})`
    );
  }
  return response.json();
};

export const fetchProgress = async (
  courseId: string,
  fetchWithAuth: AuthContextType["fetchWithAuth"]
): Promise<Progress[]> => {
  const response = await fetchWithAuth(`/api/progress/${courseId}/all`);
  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as ErrorResponse;
    throw new Error(
      error.message ||
        `Error al obtener el progreso (status: ${response.status})`
    );
  }
  return response.json();
};

export const checkExerciseAccessApi = async (
  courseId: string,
  lessonId: string,
  exerciseOrder: number,
  fetchWithAuth: AuthContextType["fetchWithAuth"]
): Promise<boolean> => {
  const response = await fetchWithAuth(
    `/api/progress/${courseId}/${lessonId}/${exerciseOrder}/can-access`
  );
  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as ErrorResponse;
    throw new Error(error.message || "Error al verificar acceso al ejercicio");
  }
  const data = await response.json();
  return data.canAccess;
};
