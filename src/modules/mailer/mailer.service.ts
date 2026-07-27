import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

export type SendMailInput = {
  to: string;
  subject: string;
  html: string;
};

export type SendMailResult = {
  success: boolean;
  error?: string;
};

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private readonly resend: Resend | null;
  private readonly from: string;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    this.from =
      this.configService.get<string>('EMAIL_FROM') ??
      'CodeBuddies <onboarding@resend.dev>';

    if (!apiKey) {
      this.logger.warn(
        'RESEND_API_KEY no definida: los correos solo se registrarán en el log, no se enviarán.',
      );
      this.resend = null;
    } else {
      this.resend = new Resend(apiKey);
    }
  }

  async send({ to, subject, html }: SendMailInput): Promise<SendMailResult> {
    if (!this.resend) {
      this.logger.log(`[email deshabilitado] Para: ${to} | Asunto: ${subject}`);
      return { success: false, error: 'RESEND_API_KEY no configurada' };
    }

    try {
      const { error } = await this.resend.emails.send({
        from: this.from,
        to,
        subject,
        html,
      });

      if (error) {
        this.logger.error(`Error enviando correo a ${to}: ${error.message}`);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      this.logger.error(`Error enviando correo a ${to}: ${message}`);
      return { success: false, error: message };
    }
  }
}
