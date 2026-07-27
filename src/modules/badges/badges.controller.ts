import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { BadgesService } from './badges.service';

@Controller('badges')
export class BadgesController {
  constructor(private readonly badgesService: BadgesService) {}

  @Get('config')
  getConfig() {
    return this.badgesService.getConfig();
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
