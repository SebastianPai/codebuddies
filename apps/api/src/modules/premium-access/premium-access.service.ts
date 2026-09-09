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
  // Una lección se bloquea si: no es la primera del curso, su lección
  // anterior (por `order`) no está completa (teoría + TODOS sus ejercicios
  // publicados), y el usuario todavía no tiene ningún avance en ella (no se
  // bloquea retroactivamente lo ya tocado). Admin y Premium respetan el
  // candado; el único escape es `bypass`, que el front solo activa para
  // admins (toggle en Ajustes -> header X-Admin-Bypass-Locks).

  private isLessonComplete(
    lessonId: string,
    exerciseIds: string[],
    theoryDone: Set<string>,
    exerciseDone: Set<string>,
  ): boolean {
    return (
      theoryDone.has(lessonId) &&
      exerciseIds.every((id) => exerciseDone.has(id))
    );
  }

  // Batch (vista de curso / lista de lecciones). `lessons` ordenado por
  // `order` asc, con los ids de sus ejercicios publicados.
  async getProgressionLockedLessonIds(params: {
    courseId: string;
    userId?: string;
    role?: Role;
    bypass?: boolean;
    lessons: { id: string; exerciseIds: string[] }[];
  }): Promise<Set<string>> {
    const { courseId, userId, role, bypass, lessons } = params;
    const locked = new Set<string>();
    if (!userId || lessons.length === 0) return locked;
    if (role === Role.ADMIN && bypass) return locked;

    const completions = await this.prisma.completion.findMany({
      where: { userId, courseId },
      select: { lessonId: true, exerciseId: true },
    });

    const theoryDone = new Set<string>();
    const exerciseDone = new Set<string>();
    const lessonTouched = new Set<string>();
    for (const c of completions) {
      if (c.lessonId) lessonTouched.add(c.lessonId);
      if (c.exerciseId) exerciseDone.add(c.exerciseId);
      else if (c.lessonId) theoryDone.add(c.lessonId);
    }

    for (let i = 1; i < lessons.length; i++) {
      const lesson = lessons[i];
      if (lessonTouched.has(lesson.id)) continue; // ya tiene avance -> abierta
      const prev = lessons[i - 1];
      if (
        !this.isLessonComplete(
          prev.id,
          prev.exerciseIds,
          theoryDone,
          exerciseDone,
        )
      ) {
        locked.add(lesson.id);
      }
    }
    return locked;
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

    const priorCount = await this.prisma.lesson.count({
      where: { courseId, status: 'PUBLISHED', order: { lt: lessonOrder } },
    });
    if (priorCount === 0) return false; // primera lección

    const own = await this.prisma.completion.count({
      where: { userId, lessonId },
    });
    if (own > 0) return false; // ya tiene avance -> abierta

    const prev = await this.prisma.lesson.findFirst({
      where: { courseId, status: 'PUBLISHED', order: { lt: lessonOrder } },
      orderBy: { order: 'desc' },
      select: {
        id: true,
        exercises: { where: { status: 'PUBLISHED' }, select: { id: true } },
      },
    });
    if (!prev) return false;

    const theory = await this.prisma.completion.count({
      where: { userId, lessonId: prev.id, exerciseId: null },
    });
    if (theory === 0) return true;

    if (prev.exercises.length > 0) {
      const done = await this.prisma.completion.count({
        where: {
          userId,
          exerciseId: { in: prev.exercises.map((e) => e.id) },
        },
      });
      if (done < prev.exercises.length) return true;
    }
    return false;
  }
}
