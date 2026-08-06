import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  EmailAudienceType,
  EmailCampaignStatus,
  EmailLogStatus,
  EmailTemplate,
  EmailTemplateType,
  Role,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { MailerService } from '../mailer/mailer.service';
import { CreateEmailCampaignDto } from './dto/create-email-campaign.dto';
import { UpdateMarketingPreferencesDto } from './dto/update-marketing-preferences.dto';
import { UpsertEmailTemplateDto } from './dto/upsert-email-template.dto';

type TransactionalRecipient = {
  id: string;
  email: string;
  username: string;
};

type AudienceFilters = {
  roleFilter?: Role | null;
  languageFilter?: string | null;
  countryFilter?: string | null;
};

const SEND_DELAY_MS = 550;
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailer: MailerService,
  ) {}

  listTemplates() {
    return this.prisma.emailTemplate.findMany({
      orderBy: [{ type: 'asc' }, { language: 'asc' }],
    });
  }

  upsertTemplate(dto: UpsertEmailTemplateDto) {
    return this.prisma.emailTemplate.upsert({
      where: { type_language: { type: dto.type, language: dto.language } },
      create: dto,
      update: dto,
    });
  }

  listCampaigns() {
    return this.prisma.emailCampaign.findMany({
      include: { template: true, _count: { select: { logs: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  createCampaign(adminId: string, dto: CreateEmailCampaignDto) {
    return this.prisma.emailCampaign.create({
      data: {
        templateId: dto.templateId,
        name: dto.name,
        audience: dto.audience,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        status: dto.scheduledAt
          ? EmailCampaignStatus.SCHEDULED
          : EmailCampaignStatus.DRAFT,
        createdById: adminId,
        roleFilter: dto.role,
        languageFilter: dto.language,
        countryFilter: dto.country,
      },
    });
  }

  async sendCampaign(campaignId: string) {
    const campaign = await this.prisma.emailCampaign.findUnique({
      where: { id: campaignId },
      include: { template: true },
    });
    if (!campaign) throw new NotFoundException('Campaign not found');

    const recipients = await this.resolveAudience(campaign.audience, {
      roleFilter: campaign.roleFilter,
      languageFilter: campaign.languageFilter,
      countryFilter: campaign.countryFilter,
    });

    this.dispatchCampaign(campaignId, campaign.template, recipients).catch(
      (err) =>
        this.logger.error(
          `Error despachando campaña ${campaignId}: ${err instanceof Error ? err.message : err}`,
        ),
    );

    return { queued: recipients.length };
  }

  private async dispatchCampaign(
    campaignId: string,
    template: EmailTemplate,
    recipients: TransactionalRecipient[],
  ) {
    for (const recipient of recipients) {
      const result = await this.mailer.send({
        to: recipient.email,
        subject: this.renderTemplate(template.subject, recipient),
        html: this.renderTemplate(template.body, recipient),
      });

      await this.prisma.emailLog.create({
        data: {
          campaignId,
          userId: recipient.id,
          email: recipient.email,
          templateType: template.type,
          status: result.success ? EmailLogStatus.SENT : EmailLogStatus.FAILED,
          error: result.error,
          sentAt: result.success ? new Date() : null,
        },
      });

      await delay(SEND_DELAY_MS);
    }

    await this.prisma.emailCampaign.update({
      where: { id: campaignId },
      data: { status: EmailCampaignStatus.SENT, sentAt: new Date() },
    });
  }

  async sendWelcomeEmail(user: TransactionalRecipient) {
    await this.sendTransactionalEmail(EmailTemplateType.WELCOME, user);
  }

  async sendBirthdayEmail(user: TransactionalRecipient) {
    await this.sendTransactionalEmail(EmailTemplateType.BIRTHDAY, user);
  }

  async sendHolidayCampaign(
    type: EmailTemplateType,
    name: string,
    language = 'es',
  ) {
    const alreadyExists = await this.prisma.emailCampaign.findFirst({
      where: { name },
    });
    if (alreadyExists) {
      this.logger.log(`Campaña "${name}" ya existe, se omite.`);
      return;
    }

    const template = await this.prisma.emailTemplate.findFirst({
      where: { type, language, active: true },
    });
    if (!template) {
      this.logger.warn(
        `No hay template activo de tipo ${type} (${language}) para campaña automática "${name}".`,
      );
      return;
    }

    const campaign = await this.prisma.emailCampaign.create({
      data: {
        templateId: template.id,
        name,
        audience: EmailAudienceType.ALL_USERS,
        status: EmailCampaignStatus.DRAFT,
        createdById: null,
      },
    });

    await this.sendCampaign(campaign.id);
  }

  private renderTemplate(text: string, user: TransactionalRecipient) {
    const variables: Record<string, string> = {
      username: user.username,
      email: user.email,
    };
    return Object.entries(variables).reduce(
      (acc, [key, value]) => acc.replaceAll(`{{${key}}}`, value),
      text,
    );
  }

  private async sendTransactionalEmail(
    type: EmailTemplateType,
    user: TransactionalRecipient,
    language = 'es',
  ) {
    try {
      const template = await this.prisma.emailTemplate.findFirst({
        where: { type, language, active: true },
      });

      if (!template) {
        this.logger.warn(
          `No hay template activo de tipo ${type} (${language}); no se envía correo a ${user.email}.`,
        );
        return;
      }

      const result = await this.mailer.send({
        to: user.email,
        subject: this.renderTemplate(template.subject, user),
        html: this.renderTemplate(template.body, user),
      });

      await this.prisma.emailLog.create({
        data: {
          campaignId: null,
          userId: user.id,
          email: user.email,
          templateType: type,
          status: result.success ? EmailLogStatus.SENT : EmailLogStatus.FAILED,
          error: result.error,
          sentAt: result.success ? new Date() : null,
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      this.logger.error(
        `Error procesando correo transaccional (${type}) para ${user.email}: ${message}`,
      );
    }
  }

  listLogs() {
    return this.prisma.emailLog.findMany({
      include: {
        campaign: true,
        user: { select: { username: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  getPreferences(userId: string) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { marketingEmailsEnabled: true, marketingEmailOptedAt: true },
    });
  }

  async updatePreferences(userId: string, dto: UpdateMarketingPreferencesDto) {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: userId },
        data: {
          marketingEmailsEnabled: dto.receiveMarketingEmails,
          marketingEmailOptedAt: new Date(),
        },
        select: { marketingEmailsEnabled: true, marketingEmailOptedAt: true },
      });
      await tx.emailAuditLog.create({
        data: {
          userId,
          action: dto.receiveMarketingEmails
            ? 'MARKETING_OPT_IN'
            : 'MARKETING_OPT_OUT',
          metadata: { source: 'user_settings' },
        },
      });
      return user;
    });
  }

  private resolveAudience(
    audience: EmailAudienceType,
    filters: AudienceFilters = {},
  ) {
    const base: Record<string, unknown> = {
      marketingEmailsEnabled: true,
    };
    if (filters.roleFilter) base.role = filters.roleFilter;
    if (filters.languageFilter) {
      base.preferredLanguage = { code: filters.languageFilter };
    }
    if (filters.countryFilter) base.country = filters.countryFilter;

    const select = { id: true, email: true, username: true };

    switch (audience) {
      case EmailAudienceType.PREMIUM_USERS:
        return this.prisma.user.findMany({
          where: {
            ...base,
            premiumSubscriptions: {
              some: { status: 'ACTIVE', expiresAt: { gt: new Date() } },
            },
          },
          select,
        });
      case EmailAudienceType.FREE_USERS:
        return this.prisma.user.findMany({
          where: {
            ...base,
            premiumSubscriptions: { none: { status: 'ACTIVE' } },
          },
          select,
        });
      case EmailAudienceType.ACTIVE_USERS:
        return this.prisma.user.findMany({
          where: {
            ...base,
            activities: { some: { createdAt: { gte: this.daysAgo(30) } } },
          },
          select,
        });
      case EmailAudienceType.INACTIVE_USERS:
        return this.prisma.user.findMany({
          where: {
            ...base,
            activities: { none: { createdAt: { gte: this.daysAgo(30) } } },
          },
          select,
        });
      case EmailAudienceType.CERTIFICATE_HOLDERS:
        return this.prisma.user.findMany({
          where: { ...base, certificates: { some: {} } },
          select,
        });
      case EmailAudienceType.ALL_USERS:
      default:
        return this.prisma.user.findMany({
          where: base,
          select,
        });
    }
  }

  private daysAgo(days: number) {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date;
  }
}
