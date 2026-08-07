import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../identity/guards/jwt.guard';
import { CurrentUser } from '../../identity/decorators/current-user.decorator';
import type { AuthUser } from '../../identity/decorators/current-user.decorator';
import { ReferralsService } from '../services/referrals.service';

@Controller('referrals')
export class ReferralsController {
  constructor(private readonly referralsService: ReferralsService) {}

  // NF43: público (sin guard) porque lo consume la página de curso, que
  // también es pública — un visitante no logueado debería poder ver el
  // banner de "invitá amigos" antes de registrarse.
  @Get('program-status')
  getProgramStatus(@Query('courseId') courseId?: string) {
    return this.referralsService.getProgramStatus(courseId);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMyReferralOverview(@CurrentUser() user: AuthUser) {
    return this.referralsService.getUserOverview(user.userId);
  }

  @Get('me/history')
  @UseGuards(JwtAuthGuard)
  getMyReferralHistory(@CurrentUser() user: AuthUser) {
    return this.referralsService.getUserHistory(user.userId);
  }
}
