import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "@/context/AuthContext";
import { Course, Lesson, Progress } from "@/types/course";
import { fetchCourse, fetchLessons, fetchProgress } from "../services/courseService";

export const useCourseData = () => {
  const { id } = useParams<{ id: string }>();
  const { fetchWithAuth } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [progress, setProgress] = useState<Progress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) {
        setError("ID del curso no proporcionado.");
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const [courseData, lessonData, progressData] = await Promise.all([
          fetchCourse(id, fetchWithAuth),
          fetchLessons(id, fetchWithAuth),
          fetchProgress(id, fetchWithAuth),
        ]);
        setCourse(courseData);
        setLessons(lessonData);
        setProgress(progressData);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "No se pudieron cargar los datos del curso.";
        setError(errorMessage);
        toast.error(errorMessage, { toastId: "fetch-error" });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, fetchWithAuth]);

  return { course, lessons, progress, loading, error };
};