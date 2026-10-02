import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { IsIn, IsString, IsUUID } from 'class-validator';
import { JwtAuthGuard } from '../identity/guards/jwt.guard';
import { OptionalJwtAuthGuard } from '../identity/guards/optional-jwt.guard';
import { RolesGuard } from '../identity/guards/roles.guard';
import { Roles } from '../identity/decorators/roles.decorator';
import type { AuthenticatedRequest } from '../../common/types/authenticated-request.type';
import { BOOST_PACKAGES } from './boost-packages';
import { CoinBoostsService } from './coin-boosts.service';

const PACKAGE_KEYS = BOOST_PACKAGES.map((pkg) => pkg.key);

export class PurchaseBoostDto {
  @IsIn(PACKAGE_KEYS)
  packageKey!: string;
}

export class GiftBoostDto {
  @IsUUID()
  userId!: string;

  @IsString()
  @IsIn(PACKAGE_KEYS)
  packageKey!: string;
}

@Controller('boosts')
export class BoostsController {
  constructor(private readonly boosts: CoinBoostsService) {}

  // Público (la barra de la web lo muestra a todos); con sesión además
  // trae el boost personal del usuario.
  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  async overview(@Req() req: Partial<AuthenticatedRequest>) {
    return { ...this.boosts.catalog(), ...(await this.boosts.status(req.user?.userId)) };
  }

  @Post('purchase')
  @UseGuards(JwtAuthGuard)
  purchase(@Req() req: AuthenticatedRequest, @Body() dto: PurchaseBoostDto) {
    return this.boosts.purchase(req.user.userId, dto.packageKey, req.user.email);
  }

  @Get('purchases/:id')
  @UseGuards(JwtAuthGuard)
  getPurchase(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.boosts.getUserBoost(id, req.user.userId);
  }
}

@Controller('admin/boosts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminBoostsController {
  constructor(private readonly boosts: CoinBoostsService) {}

  @Post('gift')
  gift(@Body() dto: GiftBoostDto) {
    return this.boosts.gift(dto.userId, dto.packageKey);
  }
}
