import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import {
  CreatorApplicationStatus,
  MarketplaceContentStatus,
} from '@prisma/client';
import { JwtAuthGuard } from '../identity/guards/jwt.guard';
import { RolesGuard } from '../identity/guards/roles.guard';
import { Roles } from '../identity/decorators/roles.decorator';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import type { AuthUser } from '../identity/decorators/current-user.decorator';
import { MarketplaceService } from './marketplace.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/marketplace')
export class AdminMarketplaceController {
  constructor(private readonly marketplaceService: MarketplaceService) {}

  @Get('settings')
  settings() {
    return this.marketplaceService.getSettings();
  }

  @Patch('settings')
  updateSettings(@Body() body: Record<string, unknown>) {
    return this.marketplaceService.updateSettings(body);
  }

  @Get('dashboard')
  dashboard() {
    return this.marketplaceService.adminDashboard();
  }

  @Get('applications')
  applications(@Query('status') status?: CreatorApplicationStatus) {
    return this.marketplaceService.listApplications(status);
  }

  @Patch('applications/:id/review')
  reviewApplication(
    @Param('id') id: string,
    @Body()
    body: {
      action: 'APPROVE' | 'REJECT' | 'REQUEST_INFO';
      adminMessage?: string;
    },
  ) {
    return this.marketplaceService.reviewApplication(
      id,
      body.action,
      body.adminMessage,
    );
  }

  @Get('contents')
  contents(@Query('status') status?: MarketplaceContentStatus) {
    return this.marketplaceService.adminListContents(status);
  }

  @Patch('contents/:id/review')
  reviewContent(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body()
    body: {
      action: 'APPROVE' | 'REJECT' | 'REQUEST_CHANGES' | 'PUBLISH' | 'RETIRE';
      comment?: string;
    },
  ) {
    return this.marketplaceService.reviewContent(
      user,
      id,
      body.action,
      body.comment,
    );
  }
}
