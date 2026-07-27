import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../identity/guards/jwt.guard';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import type { AuthUser } from '../identity/decorators/current-user.decorator';
import { CodeStudioService } from './codestudio.service';
import { CreateCodeStudioCompanyDto } from './dto/create-codestudio-company.dto';
import { StartDevelopmentDto } from './dto/start-development.dto';

@UseGuards(JwtAuthGuard)
@Controller('codestudio')
export class CodeStudioController {
  constructor(private readonly codeStudio: CodeStudioService) {}

  @Get('catalog')
  catalog() {
    return this.codeStudio.catalog();
  }

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.codeStudio.myStudio(user.userId);
  }

  @Post('companies')
  createCompany(@CurrentUser() user: AuthUser, @Body() dto: CreateCodeStudioCompanyDto) {
    return this.codeStudio.createCompany(user.userId, dto);
  }

  @Get('companies/:id')
  company(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.codeStudio.getCompany(user.userId, id);
  }

  @Post('companies/:id/development')
  startDevelopment(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: StartDevelopmentDto,
  ) {
    return this.codeStudio.startDevelopment(user.userId, id, dto);
  }

  @Get('ranking')
  ranking() {
    return this.codeStudio.ranking();
  }
}
