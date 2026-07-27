import { Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../identity/guards/jwt.guard';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import type { AuthUser } from '../identity/decorators/current-user.decorator';
import { GamificationService } from './gamification.service';

@Controller()
@UseGuards(JwtAuthGuard)
export class GamificationController {
  constructor(private readonly gamificationService: GamificationService) {}

  @Get('missions')
  getMissions(@CurrentUser() user: AuthUser) {
    return this.gamificationService.getMissionsForUser(user.userId);
  }

  @Post('missions/:id/claim')
  claimMission(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.gamificationService.claimMission(user.userId, id);
  }

  @Get('achievements')
  getAchievements(@CurrentUser() user: AuthUser) {
    return this.gamificationService.getAchievementsForUser(user.userId);
  }

  @Patch('achievements/:id/unlock')
  unlockAchievement(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.gamificationService.unlockAchievement(user.userId, id);
  }

  @Get('rewards-center')
  getRewardCenter(@CurrentUser() user: AuthUser, @Query() query: { sourceType?: string; rewardType?: string; page?: string; pageSize?: string }) {
    return this.gamificationService.getRewardCenter(user.userId, query);
  }
}
