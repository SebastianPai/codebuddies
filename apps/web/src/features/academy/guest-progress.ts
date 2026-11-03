// Avance de quien prueba la primera lección SIN cuenta. Solo vive en este
// navegador y solo sirve para mostrar qué ejercicios ya resolvió y dejarlo
// seguir al siguiente: no da XP, monedas ni nada que se pueda reclamar o
// duplicar (las recompensas las da el servidor a un usuario con sesión, una
// vez por ejercicio, cuando vuelve a tocar Comprobar).
const key = (exerciseId: string) => `cb:guest-done:${exerciseId}`;

export function markGuestDone(exerciseId: string) {
  try {
    localStorage.setItem(key(exerciseId), "1");
  } catch {
    /* noop */
  }
}

/** La teoría de la lección se leyó hasta el final en este navegador. */
export function isLessonReadLocally(lessonId: string): boolean {
  try {
    return localStorage.getItem(`cb:lesson-read:${lessonId}`) === "1";
  } catch {
    return false;
  }
}

export function isGuestDone(exerciseId: string): boolean {
  try {
    return localStorage.getItem(key(exerciseId)) === "1";
  } catch {
    return false;
  }
}
