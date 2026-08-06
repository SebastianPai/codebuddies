import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../identity/guards/jwt.guard';
import { RankingsService } from './rankings.service';

@Controller('rankings')
export class RankingsController {
  constructor(private readonly rankingsService: RankingsService) {}

  @Get('community-stats')
  getCommunityStats() {
    return this.rankingsService.getCommunityStats();
  }

  @Get()
  getRankings(@Query('userId') userId?: string) {
    return this.rankingsService.getRankings(userId);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMyRankings(@Req() req: { user: { userId: string } }) {
    return this.rankingsService.getRankings(req.user.userId);
  }
}
