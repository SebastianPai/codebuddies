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

  @Post('claim/:tierId')
  claim(@Param('tierId') tierId: string, @CurrentUser() user: AuthUser) {
    return this.battlePassService.claimTier(user.userId, tierId);
  }
}
