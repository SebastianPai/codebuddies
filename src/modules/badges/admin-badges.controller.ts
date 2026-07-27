import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { BadgeType } from '@prisma/client';
import { JwtAuthGuard } from '../identity/guards/jwt.guard';
import { RolesGuard } from '../identity/guards/roles.guard';
import { Roles } from '../identity/decorators/roles.decorator';
import { BadgesService } from './badges.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/badges')
export class AdminBadgesController {
  constructor(private readonly badgesService: BadgesService) {}

  @Get('config')
  getConfig() {
    return this.badgesService.getConfig();
  }

  @Patch('config/:type')
  setConfig(@Param('type') type: BadgeType, @Body() body: { iconUrl: string | null }) {
    return this.badgesService.setConfig(type, body.iconUrl ?? null);
  }

  @Get('creators')
  listCreators() {
    return this.badgesService.adminListCreators();
  }

  @Patch('creators/:userId/verified')
  setVerified(@Param('userId') userId: string, @Body() body: { verified: boolean }) {
    return this.badgesService.adminSetVerified(userId, !!body.verified);
  }
}
