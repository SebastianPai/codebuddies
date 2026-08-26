import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import type { AuthUser } from '../identity/decorators/current-user.decorator';
import { Roles } from '../identity/decorators/roles.decorator';
import { JwtAuthGuard } from '../identity/guards/jwt.guard';
import { RolesGuard } from '../identity/guards/roles.guard';
import { CreatePromoCodeDto } from './dto/create-promo-code.dto';
import { RedeemPromoCodeDto } from './dto/redeem-promo-code.dto';
import { PromoCodesService } from './promo-codes.service';

@Controller()
@UseGuards(JwtAuthGuard)
export class PromoCodesController {
  constructor(private readonly promoCodesService: PromoCodesService) {}

  @Post('promo-codes/redeem')
  redeem(@CurrentUser() user: AuthUser, @Body() dto: RedeemPromoCodeDto) {
    return this.promoCodesService.redeem(dto.code, user.userId);
  }

  @Get('admin/promo-codes')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  list() {
    return this.promoCodesService.list();
  }

  @Post('admin/promo-codes')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreatePromoCodeDto) {
    return this.promoCodesService.create(user.userId, dto);
  }

  @Patch('admin/promo-codes/:id/deactivate')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  deactivate(@Param('id') id: string) {
    return this.promoCodesService.deactivate(id);
  }
}
