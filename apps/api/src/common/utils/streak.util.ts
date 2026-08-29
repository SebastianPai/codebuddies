// Lógica de racha única, compartida entre login (identity) y actividad de
// aprendizaje (progress) — antes cada servicio la reimplementaba por su
// cuenta, una en UTC y la otra en hora local del servidor, y encima cada
// una leía/escribía un campo de "última actividad" distinto
// (lastLoginAt vs lastLearningActivityAt) mientras competían por el mismo
// contador `streak`/`bestStreak`. Eso permitía que loguearse y luego
// completar un ejercicio el mismo día resetee la racha a 1 en vez de
// dejarla como estaba. Ahora ambos triggers comparten el mismo campo
// (lastLearningActivityAt) y el mismo límite de día (UTC).
export function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

export interface StreakState {
  streak: number;
  bestStreak: number;
  lastActivityAt: Date | null;
}

export interface StreakUpdate {
  streak: number;
  bestStreak: number;
  lastActivityAt: Date;
  // true si la racha se extendió respecto de ayer (streak + 1); false si se
  // reinició en 1 porque se perdió un día. Ver IdentityService — solo se
  // celebra en el frontend cuando esto es true, nunca en un reinicio.
  continued: boolean;
}

// Devuelve la nueva racha a persistir, o null si la actividad de hoy ya
// había sido contabilizada (no hace falta escribir nada).
export function computeStreakUpdate(
  state: StreakState,
  now: Date = new Date(),
): StreakUpdate | null {
  const today = startOfUtcDay(now);
  const lastDay = state.lastActivityAt
    ? startOfUtcDay(state.lastActivityAt)
    : null;

  if (lastDay?.getTime() === today.getTime()) {
    return null;
  }

  const yesterday = new Date(today);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const continued = lastDay?.getTime() === yesterday.getTime();
  const nextStreak = continued ? state.streak + 1 : 1;

  return {
    streak: nextStreak,
    bestStreak: Math.max(state.bestStreak, nextStreak),
    lastActivityAt: now,
    continued,
  };
}
