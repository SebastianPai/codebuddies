import { EmailTemplateType } from '@prisma/client';
import { IsEmail, IsEnum, IsObject, IsOptional, IsString } from 'class-validator';

export class SendTestEmailDto {
  @IsEmail()
  to: string;

  // Si se omite, envía un mensaje genérico de prueba (comportamiento
  // original). Si se especifica, busca el template activo de ese tipo y lo
  // renderiza con datos de ejemplo -- no crea EmailLog, es solo una vista
  // previa real enviada por correo.
  @IsOptional()
  @IsEnum(EmailTemplateType)
  type?: EmailTemplateType;

  @IsOptional()
  @IsString()
  language?: string;

  // Variables extra para el template (ej. { promoCode: 'HALLOWEEN2026',
  // coins: '200', premiumDays: '7' }), además de username/email que ya se
  // rellenan con datos de ejemplo.
  @IsOptional()
  @IsObject()
  variables?: Record<string, string>;
}
