import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { normalizeEmail } from '../auth-rules';

export class LoginDto {
  @Transform(({ value }) => normalizeEmail(value))
  @IsEmail({}, { message: 'Ingresá un correo electrónico válido.' })
  @MaxLength(254)
  email: string;

  // Sin MinLength ni reglas de complejidad a propósito: login debe aceptar
  // contraseñas ya existentes creadas antes de que existiera esta política.
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  password: string;
}
