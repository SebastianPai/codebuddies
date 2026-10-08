import { Injectable } from '@nestjs/common';
import { PremiumSubscriptionStatus, Prisma, Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

type PrismaExecutor = PrismaService | Prisma.TransactionClient;

// Servicio chico y sin dependencias de subscriptions/payments a propósito:
// course/lesson/exercise necesitan poder preguntar "¿este usuario tiene
// acceso completo?" sin arrastrar todo SubscriptionsModule (que a su vez
// depende de PaddleClientModule) — evita un ciclo de módulos y mantiene el
// check de gating en un solo lugar reutilizable.
@Injectable()
export class PremiumAccessService {
  constructor(private readonly prisma: PrismaService) {}

  // Única fuente de verdad de acceso premium en toda la app -- ver el
  // resto de este servicio y PaddleWebhookService para cómo se mantiene
  // sincronizado status/expiresAt contra Paddle. Todo lo demás (course,
  // lesson, exercise, progress, identity, certificate-eligibility) debe
  // llamar a esto en vez de consultar PremiumSubscription directo.
  //
  // `client` opcional (default this.prisma) para poder llamarse dentro de
  // una transacción existente (ver CertificateEligibilityService) sin leer
  // por fuera de ella.
  async hasPremiumAccess(
    userId?: string,
    client: PrismaExecutor = this.prisma,
  ): Promise<boolean> {
    if (!userId) return false;
    const active = await client.premiumSubscription.findFirst({
      where: {
        userId,
        status: PremiumSubscriptionStatus.ACTIVE,
        expiresAt: { gt: new Date() },
      },
      select: { id: true },
    });
    return !!active;
  }

  hasFullAccess(role: Role | undefined, isPremiumUser: boolean): boolean {
    return role === Role.ADMIN || isPremiumUser;
  }

  // Posición 0-based de una lección dentro del curso según su `order` —
  // mismo criterio que ya usaba el frontend para comparar contra
  // `course.freeLimit` (se compara la posición, no el valor de `order`).
  async getLessonIndex(courseId: string, order: number): Promise<number> {
    return this.prisma.lesson.count({
      where: { courseId, order: { lt: order } },
    });
  }

  // Decisión de producto: el CONTENIDO de los cursos (lecciones, ejercicios)
  // es gratis para cualquiera, con o sin sesión, con o sin Premium. Lo único
  // que se paga es el certificado — por curso individual (ver
  // PaymentsService.purchaseCertificate, $CERTIFICATE_PRICE_USD) o para
  // todos los cursos vía Premium (ver CertificateEligibilityService, que ya
  // resuelve esto de forma independiente). Se deja toda la lógica de
  // freeLimit/posición armada y con tests por si el producto vuelve a pedir
  // gatear contenido más adelante (ej. algún curso exclusivo) — hoy
  // simplemente no se aplica.
  async isLessonLocked(_params: {
    courseId: string;
    lessonOrder: number;
    freeLimit: number;
    userId?: string;
    role?: Role;
  }): Promise<boolean> {
    return false;
  }

  // ---- Candado de progresión secuencial -----------------------------------
  // El recorrido de un curso es estrictamente lineal:
  //   Lección 1 (teoría) -> ejercicio 1.1 -> 1.2 -> ... -> Lección 2 (teoría)
  //
  // - Una lección se bloquea si no es la primera, la anterior no está
  //   completa (teoría + todos sus ejercicios calificables) y el usuario no
  //   tiene avance propio en ella (no se re-bloquea lo ya tocado).
  // - Dentro de una lección abierta, un ejercicio se bloquea si todavía no
  //   se leyó la teoría o si falta algún ejercicio calificable anterior. Un
  //   ejercicio ya completado nunca se bloquea.
  //
  // Los ejercicios LIVE no tienen flujo de completado (son un placeholder):
  // no cuentan como requisito, si no bloquearían el curso para siempre.
  //
  // Ojo: las completions de teoría/ejercicio se guardan con courseId = null
  // (courseId != null significa "curso completado" para gamificación y
  // referidos), así que el progreso se busca por ids de lección/ejercicio,
  // nunca por courseId — antes se filtraba por courseId, no encontraba nada
  // y toda lección después de la primera quedaba bloqueada.
  //
  // Admin y Premium respetan el candado; el único escape es `bypass`, que
  // el front solo activa para admins (toggle en Ajustes -> header
  // X-Admin-Bypass-Locks).

  static isGradable(type: string | null | undefined): boolean {
    return type !== 'LIVE';
  }

  // Batch (vista de curso). `lessons` ordenado por `order` asc, con sus
  // ejercicios publicados ordenados por `order` asc.
  async getCourseProgressionState(params: {
    userId?: string;
    role?: Role;
    bypass?: boolean;
    lessons: { id: string; exercises: { id: string; type: string }[] }[];
  }): Promise<{
    lockedLessons: Set<string>;
    lockedExercises: Set<string>;
    theoryDone: Set<string>;
    exerciseDone: Set<string>;
  }> {
    const { userId, role, bypass, lessons } = params;
    const lockedLessons = new Set<string>();
    const lockedExercises = new Set<string>();
    const theoryDone = new Set<string>();
    const exerciseDone = new Set<string>();
    if (!userId || lessons.length === 0) {
      return { lockedLessons, lockedExercises, theoryDone, exerciseDone };
    }

    const exerciseIds = lessons.flatMap((l) => l.exercises.map((e) => e.id));
    const completions = await this.prisma.completion.findMany({
      where: {
        userId,
        OR: [
          { lessonId: { in: lessons.map((l) => l.id) } },
          ...(exerciseIds.length ? [{ exerciseId: { in: exerciseIds } }] : []),
        ],
      },
      select: { lessonId: true, exerciseId: true },
    });

    const lessonTouched = new Set<string>();
    for (const c of completions) {
      if (c.lessonId) lessonTouched.add(c.lessonId);
      if (c.exerciseId) exerciseDone.add(c.exerciseId);
      else if (c.lessonId) theoryDone.add(c.lessonId);
    }

    if (role === Role.ADMIN && bypass) {
      return { lockedLessons, lockedExercises, theoryDone, exerciseDone };
    }

    lessons.forEach((lesson, i) => {
      if (i > 0 && !lessonTouched.has(lesson.id)) {
        const prev = lessons[i - 1];
        const prevComplete =
          theoryDone.has(prev.id) &&
          prev.exercises.every(
            (e) =>
              !PremiumAccessService.isGradable(e.type) ||
              exerciseDone.has(e.id),
          );
        if (!prevComplete) lockedLessons.add(lesson.id);
      }

      let blocked = lockedLessons.has(lesson.id) || !theoryDone.has(lesson.id);
      for (const ex of lesson.exercises) {
        if (exerciseDone.has(ex.id)) continue;
        if (blocked) lockedExercises.add(ex.id);
        // El primer ejercicio calificable pendiente queda abierto; todo lo
        // que viene después espera a que se complete.
        if (PremiumAccessService.isGradable(ex.type)) blocked = true;
      }
    });

    return { lockedLessons, lockedExercises, theoryDone, exerciseDone };
  }

  // Solo el set de lecciones bloqueadas (lista de lecciones de un curso).
  async getProgressionLockedLessonIds(params: {
    courseId: string;
    userId?: string;
    role?: Role;
    bypass?: boolean;
    lessons: { id: string; exercises: { id: string; type: string }[] }[];
  }): Promise<Set<string>> {
    const state = await this.getCourseProgressionState(params);
    return state.lockedLessons;
  }

  // Una sola lección (getLessonById / ejercicio).
  async isLessonProgressionLocked(params: {
    courseId: string;
    lessonId: string;
    lessonOrder: number;
    userId?: string;
    role?: Role;
    bypass?: boolean;
  }): Promise<boolean> {
    const { courseId, lessonId, lessonOrder, userId, role, bypass } = params;
    if (!userId) return false;
    if (role === Role.ADMIN && bypass) return false;

    const own = await this.prisma.completion.count({
      where: { userId, lessonId },
    });
    if (own > 0) return false; // ya tiene avance -> abierta

    const prev = await this.prisma.lesson.findFirst({
      where: { courseId, status: 'PUBLISHED', order: { lt: lessonOrder } },
      orderBy: { order: 'desc' },
      select: {
        id: true,
        exercises: {
          where: { status: 'PUBLISHED' },
          select: { id: true, type: true },
        },
      },
    });
    if (!prev) return false; // primera lección

    const theory = await this.prisma.completion.count({
      where: { userId, lessonId: prev.id, exerciseId: null },
    });
    if (theory === 0) return true;

    const required = prev.exercises
      .filter((e) => PremiumAccessService.isGradable(e.type))
      .map((e) => e.id);
    if (required.length > 0) {
      const done = await this.prisma.completion.findMany({
        where: { userId, exerciseId: { in: required } },
        select: { exerciseId: true },
        distinct: ['exerciseId'],
      });
      if (done.length < required.length) return true;
    }
    return false;
  }

  // Paso bloqueante dentro de la lección para un ejercicio concreto:
  // `null` si está abierto; si no, qué hay que hacer antes (leer la teoría
  // o completar un ejercicio anterior) para que el front mande ahí.
  async getExerciseStepLock(params: {
    lessonId: string;
    exerciseId: string;
    userId?: string;
    role?: Role;
    bypass?: boolean;
  }): Promise<ExerciseStepLock | null> {
    const { lessonId, exerciseId, userId, role, bypass } = params;
    if (!userId) return null;
    if (role === Role.ADMIN && bypass) return null;

    const [exercises, completions] = await Promise.all([
      this.prisma.exercise.findMany({
        where: { lessonId, status: 'PUBLISHED' },
        orderBy: { order: 'asc' },
        select: { id: true, type: true },
      }),
      this.prisma.completion.findMany({
        where: { userId, lessonId },
        select: { exerciseId: true },
      }),
    ]);

    const done = new Set<string>();
    let theoryDone = false;
    for (const c of completions) {
      if (c.exerciseId) done.add(c.exerciseId);
      else theoryDone = true;
    }

    if (done.has(exerciseId)) return null;
    if (!theoryDone) return { kind: 'theory', lessonId };

    for (const ex of exercises) {
      if (ex.id === exerciseId) break;
      if (PremiumAccessService.isGradable(ex.type) && !done.has(ex.id)) {
        return {
          kind: 'exercise',
          lessonId,
          exerciseId: ex.id,
          exerciseType: ex.type,
        };
      }
    }
    return null;
  }
}

export type ExerciseStepLock =
  | { kind: 'theory'; lessonId: string }
  | {
      kind: 'exercise';
      lessonId: string;
      exerciseId: string;
      exerciseType: string;
    };
