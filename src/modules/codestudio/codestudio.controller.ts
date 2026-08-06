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
import { UnlockTechnologyDto } from './dto/unlock-technology.dto';

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

  @Post('companies/:id/employees')
  hireEmployee(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: HireEmployeeDto,
  ) {
    return this.codeStudio.hireEmployee(user.userId, id, dto);
  }

  @Post('companies/:id/infrastructure')
  installInfrastructure(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: InstallInfrastructureDto,
  ) {
    return this.codeStudio.installInfrastructure(user.userId, id, dto);
  }

  @Delete('companies/:id')
  deleteCompany(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.codeStudio.deleteCompany(user.userId, id);
  }

  @Post('companies/:id/technologies')
  unlockTechnology(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UnlockTechnologyDto,
  ) {
    return this.codeStudio.unlockTechnology(user.userId, id, dto);
  }

  @Post('companies/:id/campaigns')
  launchCampaign(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: LaunchCampaignDto,
  ) {
    return this.codeStudio.launchCampaign(user.userId, id, dto);
  }

  @Post('companies/:id/bugs/:bugId/fix')
  fixBug(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('bugId') bugId: string,
    @Body() dto: FixBugDto,
  ) {
    return this.codeStudio.fixBug(user.userId, id, bugId, dto);
  }

  @Get('ranking')
  ranking() {
    return this.codeStudio.ranking();
  }
}
