import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../identity/guards/jwt.guard';
import { CurrentUser } from '../../identity/decorators/current-user.decorator';
import type { AuthUser } from '../../identity/decorators/current-user.decorator';
import { BattlePassService } from '../services/battle-pass.service';

@Controller('battle-pass')
@UseGuards(JwtAuthGuard)
export class BattlePassController {
  constructor(private readonly battlePassService: BattlePassService) {}

  @Get('me')
  getMyState(@CurrentUser() user: AuthUser) {
    return this.battlePassService.getMyState(user.userId);
  }

  // Hub de recompensas de la web: cuenta el día y resume lo reclamable del
  // pase y de la racha.
  @Get('hub')
  getHub(@CurrentUser() user: AuthUser) {
    return this.battlePassService.getHub(user.userId);
  }

  // El juego lo llama al abrir: cuenta el día en el pase diario.
  @Post('check-in')
  async checkIn(@CurrentUser() user: AuthUser) {
    await this.battlePassService.checkIn(user.userId);
    return { ok: true };
  }

  @Post('claim/:tierId')
  claim(@Param('tierId') tierId: string, @CurrentUser() user: AuthUser) {
    return this.battlePassService.claimTier(user.userId, tierId);
  }
}
