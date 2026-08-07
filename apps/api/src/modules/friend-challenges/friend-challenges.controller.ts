import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../identity/guards/jwt.guard';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import type { AuthUser } from '../identity/decorators/current-user.decorator';
import { FriendChallengesService } from './friend-challenges.service';
import { CreateFriendChallengeDto } from './dto/create-friend-challenge.dto';

@Controller('friend-challenges')
@UseGuards(JwtAuthGuard)
export class FriendChallengesController {
  constructor(private readonly friendChallengesService: FriendChallengesService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateFriendChallengeDto) {
    return this.friendChallengesService.createChallenge(user.userId, dto);
  }

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.friendChallengesService.listForUser(user.userId);
  }

  @Get(':id')
  getOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.friendChallengesService.getById(id, user.userId);
  }

  @Patch(':id/accept')
  accept(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.friendChallengesService.respond(id, user.userId, true);
  }

  @Patch(':id/decline')
  decline(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.friendChallengesService.respond(id, user.userId, false);
  }

  @Patch(':id/cancel')
  cancel(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.friendChallengesService.cancel(id, user.userId);
  }
}
