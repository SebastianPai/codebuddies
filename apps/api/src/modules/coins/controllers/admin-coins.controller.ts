import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../../identity/decorators/roles.decorator';
import { JwtAuthGuard } from '../../identity/guards/jwt.guard';
import { RolesGuard } from '../../identity/guards/roles.guard';
import { CoinPurchasesRepository } from '../repositories/coin-purchases.repository';
import { CoinLedgerService } from '../services/coin-ledger.service';
import { ListCoinPurchasesDto } from '../dto/list-coin-purchases.dto';
import { ListCoinLedgerDto } from '../dto/list-coin-ledger.dto';

@Controller('admin/coins')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminCoinsController {
  constructor(
    private readonly purchasesRepository: CoinPurchasesRepository,
    private readonly ledgerService: CoinLedgerService,
  ) {}

  @Get('purchases')
  listPurchases(@Query() query: ListCoinPurchasesDto) {
    return this.purchasesRepository.listForAdmin(query.page, query.limit, {
      status: query.status,
      userId: query.userId,
    });
  }

  @Get('purchases/:id')
  async getPurchase(@Param('id') id: string) {
    const purchase = await this.purchasesRepository.findById(id);
    if (!purchase) throw new NotFoundException('Coin purchase not found');
    return purchase;
  }

  @Get('ledger')
  listLedger(@Query() query: ListCoinLedgerDto) {
    return this.ledgerService.listForAdmin(query.page, query.limit, query.userId);
  }
}
