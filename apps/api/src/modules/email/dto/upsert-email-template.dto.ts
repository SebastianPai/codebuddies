import { EmailTemplateType } from '@prisma/client';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';

export class UpsertEmailTemplateDto {
  @IsEnum(EmailTemplateType)
  type: EmailTemplateType;

  @IsString()
  language: string;

  @IsString()
  name: string;

  @IsString()
  subject: string;

  @IsString()
  body: string;

  @IsArray()
  @IsString({ each: true })
  variables: string[];

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
