import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../../identity/decorators/roles.decorator';
import { JwtAuthGuard } from '../../identity/guards/jwt.guard';
import { RolesGuard } from '../../identity/guards/roles.guard';
import { FlagReferralFraudDto } from '../dto/flag-referral-fraud.dto';
import { UpdateReferralSettingsDto } from '../dto/update-referral-settings.dto';
import { UpsertReferralRewardDto } from '../dto/upsert-referral-reward.dto';
import { UpsertReferralSeasonDto } from '../dto/upsert-referral-season.dto';
import { ReferralAdminService } from '../services/referral-admin.service';
import { ReferralFraudService } from '../services/referral-fraud.service';
import { ReferralRankingService } from '../services/referral-ranking.service';
import { ReferralRewardService } from '../services/referral-reward.service';
import { ReferralSettingsService } from '../services/referral-settings.service';
import { ReferralValidationService } from '../services/referral-validation.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Controller('admin/referrals')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class ReferralsAdminController {
  constructor(
    private readonly adminService: ReferralAdminService,
    private readonly settingsService: ReferralSettingsService,
    private readonly rewardService: ReferralRewardService,
    private readonly fraudService: ReferralFraudService,
    private readonly validationService: ReferralValidationService,
    private readonly rankingService: ReferralRankingService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('dashboard')
  getDashboard() {
    return this.adminService.getDashboard();
  }

  @Get('settings')
  getSettings() {
    return this.settingsService.getSettings();
  }

  @Patch('settings')
  updateSettings(@Body() dto: UpdateReferralSettingsDto) {
    return this.settingsService.updateSettings(dto);
  }

  @Get('rewards')
  getRewards(@Query('scope') scope?: 'MILESTONE' | 'RANKING') {
    return this.rewardService.listRewards(scope);
  }

  @Post('rewards')
  createReward(@Body() dto: UpsertReferralRewardDto) {
    return this.rewardService.createReward(dto);
  }

  @Patch('rewards/:id')
  updateReward(@Param('id') id: string, @Body() dto: UpsertReferralRewardDto) {
    return this.rewardService.updateReward(id, dto);
  }

  @Patch('rewards/:id/toggle')
  toggleReward(@Param('id') id: string, @Body() body: { active: boolean }) {
    return this.rewardService.toggleReward(id, !!body.active);
  }

  @Post('rewards/reorder')
  reorderRewards(@Body() items: Array<{ id: string; sortOrder: number }>) {
    return this.rewardService.reorderRewards(items);
  }

  @Delete('rewards/:id')
  deleteReward(@Param('id') id: string) {
    return this.rewardService.deleteReward(id);
  }

  @Get('seasons')
  getSeasons() {
    return this.prisma.referralSeason.findMany({
      orderBy: { startsAt: 'desc' },
    });
  }

  @Post('seasons')
  createSeason(@Body() dto: UpsertReferralSeasonDto) {
    return this.prisma.referralSeason.create({
      data: {
        name: dto.name,
        periodKey: dto.periodKey,
        startsAt: new Date(dto.startsAt),
        endsAt: new Date(dto.endsAt),
        metadata: (dto.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  }

  @Patch('seasons/:id')
  updateSeason(@Param('id') id: string, @Body() dto: UpsertReferralSeasonDto) {
    return this.prisma.referralSeason.update({
      where: { id },
      data: {
        name: dto.name,
        periodKey: dto.periodKey,
        startsAt: new Date(dto.startsAt),
        endsAt: new Date(dto.endsAt),
        metadata: (dto.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  }

  @Delete('seasons/:id')
  async deleteSeason(@Param('id') id: string) {
    await this.prisma.referralReward.updateMany({
      where: { seasonId: id },
      data: { seasonId: null },
    });
    return this.prisma.referralSeason.delete({
      where: { id },
    });
  }

  @Get('ranking')
  getRanking(@Query('seasonId') seasonId?: string) {
    return this.rankingService.getSeasonLeaderboard(seasonId);
  }

  @Post('ranking/recalculate')
  recalculateRanking(@Body() body: { seasonId: string }) {
    return this.rankingService.recalculateSeasonStats(body.seasonId);
  }

  @Post('ranking/finalize')
  finalizeSeason(@Body() body: { seasonId: string }) {
    return this.rankingService.finalizeSeason(body.seasonId);
  }

  @Get('records')
  listReferrals(
    @Query('q') q?: string,
    @Query('status') status?: string,
    @Query('seasonId') seasonId?: string,
  ) {
    return this.adminService.listReferrals({ q, status, seasonId });
  }

  @Post('records/:id/evaluate')
  evaluateReferral(@Param('id') id: string) {
    return this.validationService.evaluateReferral(id);
  }

  @Post('records/:id/flag-fraud')
  flagFraud(@Param('id') id: string, @Body() dto: FlagReferralFraudDto) {
    return this.fraudService.flagFraud(id, dto);
  }

  @Post('records/:id/revoke')
  revokeReferral(@Param('id') id: string, @Body() body: { reason: string }) {
    return this.fraudService.revokeReferral(id, body.reason ?? 'manual_revoke');
  }

  @Get('fraud')
  listFraudLogs() {
    return this.adminService.listFraudLogs();
  }

  @Get('history')
  getRewardHistory() {
    return this.adminService.listRewardHistory();
  }

  @Get('export')
  exportData() {
    return this.adminService.exportData();
  }
}
