import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../identity/guards/jwt.guard';
import { CoinPurchasesService } from '../services/coin-purchases.service';
import { PurchaseCoinsDto } from '../dto/purchase-coins.dto';
import type { AuthenticatedRequest } from '../../../common/types/authenticated-request.type';

@Controller('coins/purchases')
export class CoinPurchasesController {
  constructor(private readonly coinPurchasesService: CoinPurchasesService) {}

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  getPurchase(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.coinPurchasesService.getUserPurchase(id, req.user.userId);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  purchaseCoins(
    @Req() req: AuthenticatedRequest,
    @Body() dto: PurchaseCoinsDto,
  ) {
    return this.coinPurchasesService.purchaseCoins(
      req.user.userId,
      dto,
      req.user.email,
    );
  }
}
