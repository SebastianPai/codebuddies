import {
  Query,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../identity/guards/jwt.guard';
import { CurrentUser } from '../../identity/decorators/current-user.decorator';
import type { AuthUser } from '../../identity/decorators/current-user.decorator';
import { ButlerService } from './butler.service';

@Controller('butlers')
@UseGuards(JwtAuthGuard)
export class ButlerController {
  constructor(private readonly butlerService: ButlerService) {}

  // ?roomId= : el mayordomo de esa sala (uno por sala).
  @Get('me')
  getMine(@CurrentUser() user: AuthUser, @Query('roomId') roomId?: string) {
    return this.butlerService.getMine(user.userId, roomId ?? null);
  }

  @Get('mine')
  listMine(@CurrentUser() user: AuthUser) {
    return this.butlerService.listMine(user.userId);
  }

  @Get('room/:roomId')
  inRoom(@Param('roomId') roomId: string) {
    return this.butlerService.listInRoom(roomId);
  }

  @Post('me/name')
  rename(@CurrentUser() user: AuthUser, @Body() body: { name?: string; roomId?: string }) {
    return this.butlerService.rename(user.userId, body?.roomId, body?.name ?? '');
  }

  // Sacar/guardar el mayordomo de esta sala.
  @Post('me/visible')
  setVisible(@CurrentUser() user: AuthUser, @Body() body: { roomId?: string; visible?: boolean }) {
    return this.butlerService.setVisible(user.userId, body?.roomId, Boolean(body?.visible));
  }

  @Delete('me')
  release(@CurrentUser() user: AuthUser, @Query('roomId') roomId?: string) {
    return this.butlerService.release(user.userId, roomId);
  }
}
