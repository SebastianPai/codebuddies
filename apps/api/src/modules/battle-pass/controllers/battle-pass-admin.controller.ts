import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Roles } from '../../identity/decorators/roles.decorator';
import { JwtAuthGuard } from '../../identity/guards/jwt.guard';
import { RolesGuard } from '../../identity/guards/roles.guard';
import { UpsertBattlePassSeasonDto } from '../dto/upsert-battle-pass-season.dto';
import { UpsertBattlePassTierDto } from '../dto/upsert-battle-pass-tier.dto';
import { BattlePassService } from '../services/battle-pass.service';

@Controller('admin/battle-pass')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class BattlePassAdminController {
  constructor(private readonly battlePassService: BattlePassService) {}

  @Get('seasons')
  listSeasons() {
    return this.battlePassService.listSeasons();
  }

  @Get('seasons/:id')
  getSeason(@Param('id') id: string) {
    return this.battlePassService.getSeasonForAdmin(id);
  }

  @Post('seasons')
  createSeason(@Body() dto: UpsertBattlePassSeasonDto) {
    return this.battlePassService.createSeason(dto);
  }

  @Patch('seasons/:id')
  updateSeason(@Param('id') id: string, @Body() dto: UpsertBattlePassSeasonDto) {
    return this.battlePassService.updateSeason(id, dto);
  }

  @Post('seasons/:seasonId/tiers')
  createTier(@Param('seasonId') seasonId: string, @Body() dto: UpsertBattlePassTierDto) {
    return this.battlePassService.createTier(seasonId, dto);
  }

  @Patch('tiers/:id')
  updateTier(@Param('id') id: string, @Body() dto: UpsertBattlePassTierDto) {
    return this.battlePassService.updateTier(id, dto);
  }

  @Delete('tiers/:id')
  deleteTier(@Param('id') id: string) {
    return this.battlePassService.deleteTier(id);
  }
}
