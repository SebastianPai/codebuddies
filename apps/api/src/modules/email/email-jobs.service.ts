import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { EmailTemplateType, PromoRewardType, RewardSourceType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PromoCodesService } from '../promo-codes/promo-codes.service';
import { EmailService } from './email.service';

// Regalo directo (no un código, no un descuento real de Paddle) que se
// acredita automáticamente el día del cumpleaños de cada usuario. Sin UI de
// admin a propósito -- si se necesita ajustar, se cambia acá.
const BIRTHDAY_GIFT_COINS = 200;
const BIRTHDAY_GIFT_PREMIUM_DAYS = 7;

@Injectable()
export class EmailJobsService {
  private readonly logger = new Logger(EmailJobsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly promoCodesService: PromoCodesService,
  ) {}

  @Cron('0 9 * * *')
  async sendBirthdayEmails() {
    const today = new Date();
    const month = today.getUTCMonth() + 1;
    const day = today.getUTCDate();

    const candidates = await this.prisma.user.findMany({
      where: { birthDate: { not: null }, marketingEmailsEnabled: true },
      select: { id: true, email: true, username: true, birthDate: true },
    });

    const birthdayUsers = candidates.filter(
      (user) =>
        user.birthDate &&
        user.birthDate.getUTCMonth() + 1 === month &&
        user.birthDate.getUTCDate() === day,
    );

    if (birthdayUsers.length === 0) return;

    const alreadySent = await this.prisma.emailLog.findMany({
      where: {
        templateType: EmailTemplateType.BIRTHDAY,
        userId: { in: birthdayUsers.map((user) => user.id) },
        sentAt: { gte: this.daysAgo(300) },
      },
      select: { userId: true },
    });
    const alreadySentIds = new Set(alreadySent.map((log) => log.userId));

    let sent = 0;
    for (const user of birthdayUsers) {
      if (alreadySentIds.has(user.id)) continue;

      await this.prisma.$transaction(async (tx) => {
        await this.promoCodesService.grantDirect(
          tx,
          user.id,
          PromoRewardType.COINS,
          BIRTHDAY_GIFT_COINS,
          RewardSourceType.EVENT,
          'birthday',
          'Regalo de cumpleaños',
        );
        await this.promoCodesService.grantDirect(
          tx,
          user.id,
          PromoRewardType.PREMIUM_DAYS,
          BIRTHDAY_GIFT_PREMIUM_DAYS,
          RewardSourceType.EVENT,
          'birthday',
          'Regalo de cumpleaños',
        );
      });

      await this.emailService.sendBirthdayEmail(user, {
        coins: String(BIRTHDAY_GIFT_COINS),
        premiumDays: String(BIRTHDAY_GIFT_PREMIUM_DAYS),
      });
      sent += 1;
    }

    this.logger.log(
      `Correos de cumpleaños: ${sent} enviados de ${birthdayUsers.length} candidatos.`,
    );
  }

  @Cron('0 9 25 12 *')
  async sendChristmasEmails() {
    await this.emailService.sendHolidayCampaign(
      EmailTemplateType.CHRISTMAS,
      `Navidad ${new Date().getFullYear()}`,
    );
  }

  @Cron('0 9 1 1 *')
  async sendNewYearEmails() {
    await this.emailService.sendHolidayCampaign(
      EmailTemplateType.NEW_YEAR,
      `Año Nuevo ${new Date().getFullYear()}`,
    );
  }

  // 6 días antes del 31/10 para que el cupón (creado a mano en
  // /admin/promo-codes y pegado en el body del template HALLOWEEN) llegue
  // con margen antes de vencer.
  @Cron('0 9 25 10 *')
  async sendHalloweenEmails() {
    await this.emailService.sendHolidayCampaign(
      EmailTemplateType.HALLOWEEN,
      `Halloween ${new Date().getFullYear()}`,
    );
  }

  private daysAgo(days: number) {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date;
  }
}
