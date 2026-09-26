import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
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

  @Get('ranking')
  ranking() {
    return this.codeStudio.ranking();
  }

  @Post('companies')
  createCompany(@CurrentUser() user: AuthUser, @Body() dto: CreateCodeStudioCompanyDto) {
    return this.codeStudio.createCompany(user.userId, dto);
  }

  // El cliente lo consulta cada ~10s mientras la empresa está abierta: cada
  // llamada avanza la simulación el tiempo transcurrido (máx. 30s).
  @Get('companies/:id')
  company(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.codeStudio.getCompany(user.userId, id);
  }

  @Delete('companies/:id')
  deleteCompany(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.codeStudio.deleteCompany(user.userId, id);
  }

  @Post('companies/:id/development')
  startDevelopment(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: StartDevelopmentDto) {
    return this.codeStudio.startDevelopment(user.userId, id, dto);
  }

  @Delete('companies/:id/development/:taskId')
  cancelDevelopment(@CurrentUser() user: AuthUser, @Param('id') id: string, @Param('taskId') taskId: string) {
    return this.codeStudio.cancelDevelopment(user.userId, id, taskId);
  }

  @Post('companies/:id/employees')
  hireEmployee(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: HireEmployeeDto) {
    return this.codeStudio.hireEmployee(user.userId, id, dto);
  }

  @Delete('companies/:id/employees/:employeeId')
  fireEmployee(@CurrentUser() user: AuthUser, @Param('id') id: string, @Param('employeeId') employeeId: string) {
    return this.codeStudio.fireEmployee(user.userId, id, employeeId);
  }

  @Post('companies/:id/infrastructure')
  installInfrastructure(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: InstallInfrastructureDto) {
    return this.codeStudio.installInfrastructure(user.userId, id, dto);
  }

  @Post('companies/:id/campaigns')
  launchCampaign(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: LaunchCampaignDto) {
    return this.codeStudio.launchCampaign(user.userId, id, dto);
  }

  @Post('companies/:id/bugs/:bugId/fix')
  fixBug(@CurrentUser() user: AuthUser, @Param('id') id: string, @Param('bugId') bugId: string, @Body() dto: FixBugDto) {
    return this.codeStudio.fixBug(user.userId, id, bugId, dto);
  }

  @Post('companies/:id/decisions/:eventId')
  chooseDecision(@CurrentUser() user: AuthUser, @Param('id') id: string, @Param('eventId') eventId: string, @Body() dto: ChooseDecisionDto) {
    return this.codeStudio.chooseDecision(user.userId, id, eventId, dto);
  }

  @Post('companies/:id/funding')
  raiseFunding(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.codeStudio.raiseFunding(user.userId, id);
  }

  @Post('companies/:id/pricing')
  setPricing(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: SetPricingDto) {
    return this.codeStudio.setPricing(user.userId, id, dto);
  }
}
