import { IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export class CreateCommentDto {
  @IsString()
  @MaxLength(3000)
  body!: string;

  @IsOptional()
  @IsString()
  parentId?: string;
}

export class CreateReportDto {
  @IsString()
  @MaxLength(200)
  reason!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}

// Extiende PaginationQueryDto en vez de usar dos @Query() en la misma
// ruta: con forbidNonWhitelisted global, un @Query('status') separado del
// @Query() dto de paginación hace que Nest rechace toda la query string
// porque "status" no está declarado en PaginationQueryDto.
export class ListContentReportsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  status?: string;
}
