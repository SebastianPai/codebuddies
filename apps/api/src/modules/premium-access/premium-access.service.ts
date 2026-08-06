import { Injectable } from '@nestjs/common';
import { PremiumSubscriptionStatus, Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

// Servicio chico y sin dependencias de subscriptions/payments a propósito:
// course/lesson/exercise necesitan poder preguntar "¿este usuario tiene
// acceso completo?" sin arrastrar todo SubscriptionsModule (que a su vez
// depende de PaddleClientModule) — evita un ciclo de módulos y mantiene el
// check de gating en un solo lugar reutilizable.
@Injectable()
export class PremiumAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async isPremium(userId?: string): Promise<boolean> {
    if (!userId) return false;
    const active = await this.prisma.premiumSubscription.findFirst({
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
}
