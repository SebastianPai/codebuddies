import { IsString } from 'class-validator';

export class UnlockTechnologyDto {
  @IsString()
  technologyId!: string;
}
