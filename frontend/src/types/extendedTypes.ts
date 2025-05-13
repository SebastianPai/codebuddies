import { Exercise } from "./exercise"; // Ajusta la ruta según tu estructura

export interface ExtendedExercise extends Exercise {
  sqlSetup?: {
    setupScript: string;
  };
}
