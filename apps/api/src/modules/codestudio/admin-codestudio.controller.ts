import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Roles } from '../identity/decorators/roles.decorator';
import { JwtAuthGuard } from '../identity/guards/jwt.guard';
import { RolesGuard } from '../identity/guards/roles.guard';
import { CodeStudioService } from './codestudio.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/codestudio')
export class AdminCodeStudioController {
  constructor(private readonly codeStudio: CodeStudioService) {}

  @Get(':resource')
  list(@Param('resource') resource: string) {
    return this.codeStudio.adminList(resource);
  }

  @Post(':resource')
  create(@Param('resource') resource: string, @Body() body: Record<string, any>) {
    return this.codeStudio.adminCreate(resource, body);
  }

  @Patch(':resource/:id')
  update(
    @Param('resource') resource: string,
    @Param('id') id: string,
    @Body() body: Record<string, any>,
  ) {
    return this.codeStudio.adminUpdate(resource, id, body);
  }

  @Delete(':resource/:id')
  remove(@Param('resource') resource: string, @Param('id') id: string) {
    return this.codeStudio.adminDelete(resource, id);
  }
}
