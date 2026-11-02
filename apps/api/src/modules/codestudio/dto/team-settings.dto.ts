import { IsBoolean, IsIn } from 'class-validator';

/** Departamento que contrata solo cuando hace falta gente. */
export class SetDepartmentDto {
  @IsIn(['support', 'qa', 'devops'])
  roleSlug!: string;

  @IsBoolean()
  auto!: boolean;
}

/** Puesto fijo: el empleado se sienta siempre, antes que los demás. */
export class SetSeatDto {
  @IsBoolean()
  pinned!: boolean;
}
