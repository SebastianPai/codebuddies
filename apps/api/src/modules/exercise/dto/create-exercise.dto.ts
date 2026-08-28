import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ContentStatus, ExerciseType } from '@prisma/client';
import { MaxJsonSize } from '../../../common/validators/max-json-size.validator';

const MAX_CONTENT_BYTES = 300_000; // ~300KB — generoso para instrucciones/quiz, corta payloads abusivos
const MAX_CODE_LENGTH = 50_000; // ~50k caracteres por bloque de código

export class CreateExerciseTranslationDto {
  @IsString()
  @MaxLength(10)
  languageCode: string; // 'es', 'en', 'de', etc.

  @IsString()
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @MaxJsonSize(MAX_CONTENT_BYTES)
  content?: unknown; // JSON con el contenido traducido (instrucciones, quiz, etc. según el tipo)
}

export class ExerciseTestCaseDto {
  @IsString()
  @MaxLength(300)
  description!: string;

  // Expresión/snippet JS evaluado DESPUÉS del código del estudiante, en el
  // mismo contexto — ej. "typeof suma === 'function' && suma(2,3) === 5".
  // Autorada por el admin (confiable); ver exercise.service.ts#runCodeTests
  // para las restricciones de sandbox que sí aplican al código del
  // estudiante.
  @IsString()
  @MaxLength(2000)
  assertCode!: string;
}

export class ExerciseCodeDto {
  @IsString()
  @MaxLength(50)
  language: string;

  @IsString()
  @MaxLength(MAX_CODE_LENGTH)
  initialCode: string;

  @IsOptional()
  @IsString()
  @MaxLength(MAX_CODE_LENGTH)
  expectedCode?: string;

  // NF26: tests automáticos reales — sin esto, el ejercicio sigue
  // funcionando como hoy (el cliente marca "completado" sin verificación).
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExerciseTestCaseDto)
  tests?: ExerciseTestCaseDto[];

  // Campos adicionales usados por ejercicios LIVE (schedule/link) — ver
  // exercise.service.ts, que lee codes[0].schedule / codes[0].link.
  @IsOptional()
  @IsString()
  @MaxLength(200)
  schedule?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  link?: string;
}

export class CreateExerciseDto {
  @IsString()
  lessonId: string;

  @IsEnum(ExerciseType)
  type: ExerciseType;

  @IsOptional()
  @IsEnum(ContentStatus)
  status?: ContentStatus;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExerciseCodeDto)
  codes?: ExerciseCodeDto[];

  @IsOptional()
  @IsInt()
  @Min(0)
  experience?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  coins?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  order?: number; // opcional, si no se pasa se calcula automáticamente

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateExerciseTranslationDto)
  translations: CreateExerciseTranslationDto[];
}
