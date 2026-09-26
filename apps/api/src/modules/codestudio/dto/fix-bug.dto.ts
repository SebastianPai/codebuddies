import { IsIn, IsOptional, IsString } from 'class-validator';

// diagnose = el jugador elige la causa (mini-juego, da XP)
// employee = lo toma un empleado técnico (tarda, gratis)
// cash     = consultora (instantáneo, caro, sin XP)
export class FixBugDto {
  @IsIn(['diagnose', 'employee', 'cash'])
  method!: 'diagnose' | 'employee' | 'cash';

  @IsOptional()
  @IsString()
  optionKey?: string;

  @IsOptional()
  @IsString()
  employeeId?: string;
}
