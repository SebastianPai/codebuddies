import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  normalizeEmail,
  PASSWORD_MAX,
  PASSWORD_MIN,
  PASSWORD_REGEX,
  USERNAME_REGEX,
} from '../auth-rules';

export class RegisterDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(3)
  @MaxLength(20)
  @Matches(USERNAME_REGEX, {
    message:
      'El usuario solo puede tener letras, números, "_" y "." (3 a 20 caracteres).',
  })
  username: string;

  @Transform(({ value }) => normalizeEmail(value))
  @IsEmail(
    { require_tld: true, allow_ip_domain: false, allow_utf8_local_part: false },
    { message: 'Ingresá un correo electrónico válido.' },
  )
  @MaxLength(254)
  email: string;

  @IsString()
  @MinLength(PASSWORD_MIN, {
    message: `La contraseña debe tener al menos ${PASSWORD_MIN} caracteres.`,
  })
  @MaxLength(PASSWORD_MAX, {
    message: `La contraseña no puede superar los ${PASSWORD_MAX} caracteres.`,
  })
  @Matches(PASSWORD_REGEX, {
    message:
      'La contraseña debe incluir mayúscula, minúscula, número y símbolo.',
  })
  password: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  referralCode?: string;
}
