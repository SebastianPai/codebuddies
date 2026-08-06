import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../identity/guards/jwt.guard';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import type { AuthUser } from '../identity/decorators/current-user.decorator';
import { MarketplaceService } from './marketplace.service';

@UseGuards(JwtAuthGuard)
@Controller('creator/marketplace')
export class CreatorMarketplaceController {
  constructor(private readonly marketplaceService: MarketplaceService) {}

  @Get('eligibility')
  eligibility(@CurrentUser() user: AuthUser) {
    return this.marketplaceService.getEligibility(user.userId);
  }

  @Post('apply')
  apply(@CurrentUser() user: AuthUser, @Body() body: { message?: string }) {
    return this.marketplaceService.applyToBecomeCreator(
      user.userId,
      body.message,
    );
  }

  @Get('dashboard')
  dashboard(@CurrentUser() user: AuthUser) {
    return this.marketplaceService.creatorDashboard(user.userId);
  }

  @Post('wallet/withdraw')
  withdraw(@CurrentUser() user: AuthUser) {
    return this.marketplaceService.withdrawCreatorWallet(user.userId);
  }

  @Get('contents')
  contents(@CurrentUser() user: AuthUser) {
    return this.marketplaceService.listCreatorContents(user.userId);
  }

  @Post('contents')
  createDraft(@CurrentUser() user: AuthUser, @Body() body: Record<string, any>) {
    return this.marketplaceService.createContentDraft(user.userId, body);
  }

  @Patch('contents/:id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: Record<string, any>,
  ) {
    return this.marketplaceService.updateContent(user.userId, id, body);
  }

  @Post('contents/:id/submit')
  submit(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.marketplaceService.submitContent(user.userId, id);
  }
}
