import { IsString } from 'class-validator';

// Ya no se asignan empleados a mano: el poder de desarrollo de todo el
// equipo se reparte entre las features activas (ver teamDevPower en el
// engine).
export class StartDevelopmentDto {
  @IsString()
  moduleId!: string;
}
