import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../identity/decorators/roles.decorator';
import { JwtAuthGuard } from '../identity/guards/jwt.guard';
import { RolesGuard } from '../identity/guards/roles.guard';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import type { AuthUser } from '../identity/decorators/current-user.decorator';
import { CreateEmailCampaignDto } from './dto/create-email-campaign.dto';
import { SendTestEmailDto } from './dto/send-test-email.dto';
import { UpdateMarketingPreferencesDto } from './dto/update-marketing-preferences.dto';
import { UpsertEmailTemplateDto } from './dto/upsert-email-template.dto';
import { EmailService } from './email.service';

@Controller('email')
@UseGuards(JwtAuthGuard)
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Get('preferences')
  preferences(@CurrentUser() user: AuthUser) {
    return this.emailService.getPreferences(user.userId);
  }

  @Patch('preferences')
  updatePreferences(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateMarketingPreferencesDto,
  ) {
    return this.emailService.updatePreferences(user.userId, dto);
  }

  @Get('admin/templates')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  listTemplates() {
    return this.emailService.listTemplates();
  }

  @Post('admin/templates')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  upsertTemplate(@Body() dto: UpsertEmailTemplateDto) {
    return this.emailService.upsertTemplate(dto);
  }

  @Get('admin/campaigns')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  listCampaigns() {
    return this.emailService.listCampaigns();
  }

  @Post('admin/campaigns')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  createCampaign(@CurrentUser() user: AuthUser, @Body() dto: CreateEmailCampaignDto) {
    return this.emailService.createCampaign(user.userId, dto);
  }

  @Post('admin/campaigns/:id/send')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  sendCampaign(@Param('id') id: string) {
    return this.emailService.sendCampaign(id);
  }

  @Get('admin/history')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  listLogs() {
    return this.emailService.listLogs();
  }

  @Post('admin/test-send')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  sendTestEmail(@Body() dto: SendTestEmailDto) {
    return this.emailService.sendTestEmail(dto.to);
  }
}
