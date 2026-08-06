import { EmailAudienceType, Role } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateEmailCampaignDto {
  @IsString()
  templateId: string;

  @IsString()
  name: string;

  @IsEnum(EmailAudienceType)
  audience: EmailAudienceType;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsString()
  country?: string;
}
