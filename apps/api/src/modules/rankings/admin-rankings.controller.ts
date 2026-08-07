import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Roles } from '../identity/decorators/roles.decorator';
import { JwtAuthGuard } from '../identity/guards/jwt.guard';
import { RolesGuard } from '../identity/guards/roles.guard';
import { RankingSeasonsService } from './ranking-seasons.service';
import { CreateRankingSeasonDto } from './dto/create-ranking-season.dto';

@Controller('admin/rankings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminRankingsController {
  constructor(private readonly seasonsService: RankingSeasonsService) {}

  @Get('seasons')
  listSeasons() {
    return this.seasonsService.listSeasons();
  }

  @Post('seasons')
  createSeason(@Body() dto: CreateRankingSeasonDto) {
    return this.seasonsService.createSeason(
      dto.name,
      dto.startAt ? new Date(dto.startAt) : undefined,
    );
  }

  @Post('seasons/:id/finalize')
  finalizeSeason(@Param('id') id: string) {
    return this.seasonsService.finalizeSeason(id);
  }

  @Delete('seasons/:id')
  deleteSeason(@Param('id') id: string) {
    return this.seasonsService.deleteSeason(id);
  }
}
