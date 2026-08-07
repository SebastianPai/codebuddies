import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../identity/guards/jwt.guard';
import { RankingsService } from './rankings.service';
import { RankingSeasonsService } from './ranking-seasons.service';

@Controller('rankings')
export class RankingsController {
  constructor(
    private readonly rankingsService: RankingsService,
    private readonly seasonsService: RankingSeasonsService,
  ) {}

  @Get('community-stats')
  getCommunityStats() {
    return this.rankingsService.getCommunityStats();
  }

  // Antes de :id implícito de /seasons/:id — estas rutas van primero para
  // que Nest no intente matchear "current"/"seasons" como parte de otra ruta.
  @Get('seasons/current')
  getCurrentSeason() {
    return this.seasonsService.getCurrentLeaderboard();
  }

  @Get('seasons')
  listSeasons() {
    return this.seasonsService.listSeasons();
  }

  @Get('seasons/:id')
  getSeason(@Param('id') id: string) {
    return this.seasonsService.getSeasonDetail(id);
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
