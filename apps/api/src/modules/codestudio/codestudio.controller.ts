import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../identity/guards/jwt.guard';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import type { AuthUser } from '../identity/decorators/current-user.decorator';
import { CodeStudioService } from './codestudio.service';
import { CreateCodeStudioCompanyDto } from './dto/create-codestudio-company.dto';
import { StartDevelopmentDto } from './dto/start-development.dto';
import { HireEmployeeDto } from './dto/hire-employee.dto';
import { InstallInfrastructureDto } from './dto/install-infrastructure.dto';
import { FixBugDto } from './dto/fix-bug.dto';
import { LaunchCampaignDto } from './dto/launch-campaign.dto';
import { ChooseDecisionDto } from './dto/choose-decision.dto';
import { SetPricingDto } from './dto/set-pricing.dto';
import { langFromHeader } from './content/i18n';

@UseGuards(JwtAuthGuard)
// ?lang=es|en-us|de: el idioma del contenido (features, bugs, eventos) y de
// los mensajes. Por query y no por header para no tocar la config de CORS.
@Controller('codestudio')
export class CodeStudioController {
  constructor(private readonly codeStudio: CodeStudioService) {}

  @Get('catalog')
  catalog(@Query('lang') lang?: string) {
    return this.codeStudio.catalog(langFromHeader(lang));
  }

  @Get('me')
  me(@CurrentUser() user: AuthUser, @Query('lang') lang?: string) {
    return this.codeStudio.myStudio(user.userId, langFromHeader(lang));
  }

  @Get('ranking')
  ranking(@Query('lang') lang?: string) {
    return this.codeStudio.ranking(langFromHeader(lang));
  }

  @Post('companies')
  createCompany(@CurrentUser() user: AuthUser, @Body() dto: CreateCodeStudioCompanyDto, @Query('lang') lang?: string) {
    return this.codeStudio.createCompany(user.userId, dto, langFromHeader(lang));
  }

  // El cliente lo consulta cada ~10s mientras la empresa está abierta: cada
  // llamada avanza la simulación el tiempo transcurrido (máx. 30s).
  @Get('companies/:id')
  company(@CurrentUser() user: AuthUser, @Param('id') id: string, @Query('lang') lang?: string) {
    return this.codeStudio.getCompany(user.userId, id, langFromHeader(lang));
  }

  @Delete('companies/:id')
  deleteCompany(@CurrentUser() user: AuthUser, @Param('id') id: string, @Query('lang') lang?: string) {
    return this.codeStudio.deleteCompany(user.userId, id, langFromHeader(lang));
  }

  @Post('companies/:id/development')
  startDevelopment(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: StartDevelopmentDto, @Query('lang') lang?: string) {
    return this.codeStudio.startDevelopment(user.userId, id, dto, langFromHeader(lang));
  }

  @Delete('companies/:id/development/:taskId')
  cancelDevelopment(@CurrentUser() user: AuthUser, @Param('id') id: string, @Param('taskId') taskId: string, @Query('lang') lang?: string) {
    return this.codeStudio.cancelDevelopment(user.userId, id, taskId, langFromHeader(lang));
  }

  @Post('companies/:id/employees')
  hireEmployee(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: HireEmployeeDto, @Query('lang') lang?: string) {
    return this.codeStudio.hireEmployee(user.userId, id, dto, langFromHeader(lang));
  }

  @Delete('companies/:id/employees/:employeeId')
  fireEmployee(@CurrentUser() user: AuthUser, @Param('id') id: string, @Param('employeeId') employeeId: string, @Query('lang') lang?: string) {
    return this.codeStudio.fireEmployee(user.userId, id, employeeId, langFromHeader(lang));
  }

  @Post('companies/:id/infrastructure')
  installInfrastructure(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: InstallInfrastructureDto, @Query('lang') lang?: string) {
    return this.codeStudio.installInfrastructure(user.userId, id, dto, langFromHeader(lang));
  }

  @Post('companies/:id/campaigns')
  launchCampaign(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: LaunchCampaignDto, @Query('lang') lang?: string) {
    return this.codeStudio.launchCampaign(user.userId, id, dto, langFromHeader(lang));
  }

  @Post('companies/:id/bugs/:bugId/fix')
  fixBug(@CurrentUser() user: AuthUser, @Param('id') id: string, @Param('bugId') bugId: string, @Body() dto: FixBugDto, @Query('lang') lang?: string) {
    return this.codeStudio.fixBug(user.userId, id, bugId, dto, langFromHeader(lang));
  }

  @Post('companies/:id/decisions/:eventId')
  chooseDecision(@CurrentUser() user: AuthUser, @Param('id') id: string, @Param('eventId') eventId: string, @Body() dto: ChooseDecisionDto, @Query('lang') lang?: string) {
    return this.codeStudio.chooseDecision(user.userId, id, eventId, dto, langFromHeader(lang));
  }

  @Post('companies/:id/funding')
  raiseFunding(@CurrentUser() user: AuthUser, @Param('id') id: string, @Query('lang') lang?: string) {
    return this.codeStudio.raiseFunding(user.userId, id, langFromHeader(lang));
  }

  @Post('companies/:id/pricing')
  setPricing(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: SetPricingDto, @Query('lang') lang?: string) {
    return this.codeStudio.setPricing(user.userId, id, dto, langFromHeader(lang));
  }
}
