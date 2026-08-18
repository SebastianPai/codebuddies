import { IsBoolean, IsEnum, IsIn, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';
import { Role } from '@prisma/client';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export class ListUsersQueryDto extends PaginationQueryDto {
  @IsOptional()
  q?: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  premiumOnly?: boolean;

  @IsOptional()
  @IsIn(['createdAt', 'coins', 'experience', 'lastLoginAt'])
  sortBy?: 'createdAt' | 'coins' | 'experience' | 'lastLoginAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}
