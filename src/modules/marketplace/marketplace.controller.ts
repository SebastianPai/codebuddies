import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { MarketplaceReportReason } from '@prisma/client';
import { JwtAuthGuard } from '../identity/guards/jwt.guard';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import type { AuthUser } from '../identity/decorators/current-user.decorator';
import { MarketplaceService } from './marketplace.service';

@Controller('marketplace')
export class MarketplaceController {
  constructor(private readonly marketplaceService: MarketplaceService) {}

  @Get()
  list(@Query() query: Record<string, string | undefined>) {
    return this.marketplaceService.listMarketplace(query);
  }

  @Get('creators')
  creators() {
    return this.marketplaceService.listCreators();
  }

  @Get('creators/:idOrUsername')
  creator(@Param('idOrUsername') idOrUsername: string) {
    return this.marketplaceService.getCreatorProfile(idOrUsername);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/favorites')
  favorites(@CurrentUser() user: AuthUser) {
    return this.marketplaceService.listFavorites(user.userId);
  }

  @Get(':id')
  details(@Param('id') id: string) {
    return this.marketplaceService.getMarketplaceContent(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/buy')
  buy(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.marketplaceService.buyContent(user.userId, id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/favorite')
  favorite(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.marketplaceService.toggleFavorite(user.userId, id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/rate')
  rate(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { rating: number; comment?: string },
  ) {
    return this.marketplaceService.rateContent(
      user.userId,
      id,
      Number(body.rating),
      body.comment,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/report')
  report(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { reason: MarketplaceReportReason; message?: string },
  ) {
    return this.marketplaceService.reportContent(
      user.userId,
      id,
      body.reason,
      body.message,
    );
  }
}
