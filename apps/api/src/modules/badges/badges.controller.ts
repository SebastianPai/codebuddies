import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { BadgeType } from '@prisma/client';
import { JwtAuthGuard } from '../identity/guards/jwt.guard';
import { BadgesService } from './badges.service';

@Controller('badges')
export class BadgesController {
  constructor(private readonly badgesService: BadgesService) {}

  @Get('config')
  getConfig() {
    return this.badgesService.getConfig();
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMySettings(@Req() req: { user: { userId: string } }) {
    return this.badgesService.getMyBadgeSettings(req.user.userId);
  }

  @Patch('me/selection')
  @UseGuards(JwtAuthGuard)
  setMySelection(
    @Req() req: { user: { userId: string } },
    @Body() body: { types: BadgeType[] },
  ) {
    return this.badgesService.setSelectedBadges(req.user.userId, body.types ?? []);
  }

  @Get('user/:username')
  getUserBadges(@Param('username') username: string) {
    return this.badgesService.getUserBadgesByUsername(username);
  }

  // Para listas (amigos, sala, chat): resuelve varios usernames de una.
  @Post('users')
  getUsersBadges(@Body() body: { usernames: string[] }) {
    return this.badgesService.getUserBadgesForUsernames(body.usernames ?? []);
  }
}
