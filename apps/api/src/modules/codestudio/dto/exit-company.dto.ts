import { IsIn } from 'class-validator';

// Salida al llegar a Unicornio: vender la startup o salir a bolsa.
export class ExitCompanyDto {
  @IsIn(['sale', 'ipo'])
  type!: 'sale' | 'ipo';
}
