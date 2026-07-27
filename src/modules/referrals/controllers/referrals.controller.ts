import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../identity/guards/jwt.guard';
import { CurrentUser } from '../../identity/decorators/current-user.decorator';
import type { AuthUser } from '../../identity/decorators/current-user.decorator';
import { ReferralsService } from '../services/referrals.service';

@Controller('referrals')
@UseGuards(JwtAuthGuard)
export class ReferralsController {
  constructor(private readonly referralsService: ReferralsService) {}

  @Get('me')
  getMyReferralOverview(@CurrentUser() user: AuthUser) {
    return this.referralsService.getUserOverview(user.userId);
  }

  @Get('me/history')
  getMyReferralHistory(@CurrentUser() user: AuthUser) {
    return this.referralsService.getUserHistory(user.userId);
  }
}
