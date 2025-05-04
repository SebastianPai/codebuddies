export interface Exercise {
  order: number;
  title: string;
  content: string;
  instructions?: string;
  language: string;
  expectedOutput?: string;
}

export interface Lesson {
  _id: string;
  title: string;
  description: string;
  exercises: Exercise[];
  courseId: string;
}

export interface Course {
  _id: string;
  title: string;
  difficulty: string;
  description: string;
  image?: string;
}

export interface Progress {
  lessonId: string;
  exerciseOrder: number;
  completed: boolean;
  completedAt?: string;
}

export interface ErrorResponse {
  message?: string;
}
