import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../identity/guards/jwt.guard';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import type { AuthUser } from '../identity/decorators/current-user.decorator';
import { CreateFriendRequestDto } from './dto/create-friend-request.dto';
import { FriendshipsService } from './friendships.service';

@Controller('friendships')
@UseGuards(JwtAuthGuard)
export class FriendshipsController {
  constructor(private readonly friendshipsService: FriendshipsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.friendshipsService.list(user.userId);
  }

  @Get('requests')
  requests(@CurrentUser() user: AuthUser) {
    return this.friendshipsService.requests(user.userId);
  }

  @Get('sent')
  sent(@CurrentUser() user: AuthUser) {
    return this.friendshipsService.sent(user.userId);
  }

  @Get('search')
  search(@CurrentUser() user: AuthUser, @Query('q') query: string) {
    return this.friendshipsService.searchUsers(user.userId, query);
  }

  @Get('suggestions')
  suggestions(@CurrentUser() user: AuthUser) {
    return this.friendshipsService.suggestions(user.userId);
  }

  @Get('status/:username')
  status(@CurrentUser() user: AuthUser, @Param('username') username: string) {
    return this.friendshipsService.getFriendshipStatus(
      user.userId,
      username,
    );
  }

  @Get('mutual/:username')
  mutual(@CurrentUser() user: AuthUser, @Param('username') username: string) {
    return this.friendshipsService.getMutualFriends(user.userId, username);
  }
  @Post('requests')
  send(@CurrentUser() user: AuthUser, @Body() dto: CreateFriendRequestDto) {
    return this.friendshipsService.sendRequest(user.userId, dto.userId);
  }

  @Patch(':id/accept')
  accept(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.friendshipsService.accept(user.userId, id);
  }

  @Patch(':id/reject')
  reject(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.friendshipsService.reject(user.userId, id);
  }

  @Patch(':id/block')
  block(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.friendshipsService.block(user.userId, id);
  }

  @Post('blocks')
  blockUser(@CurrentUser() user: AuthUser, @Body() dto: CreateFriendRequestDto) {
    return this.friendshipsService.blockUser(user.userId, dto.userId);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.friendshipsService.remove(user.userId, id);
  }
}
