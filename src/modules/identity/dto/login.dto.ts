import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  // Sin MinLength aquí a propósito: login debe aceptar contraseñas ya existentes
  // creadas antes de que existiera esta política, no sólo las nuevas.
  @IsString()
  @IsNotEmpty()
  password: string;
}
