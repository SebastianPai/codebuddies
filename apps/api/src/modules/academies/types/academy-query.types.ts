import { AcademyType } from '@prisma/client';

export interface AcademyFilters {
  active?: boolean;
  type?: AcademyType;
}
