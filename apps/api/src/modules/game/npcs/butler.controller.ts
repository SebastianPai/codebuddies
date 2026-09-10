import {
  Body,
  Controller,
  Delete,
  Get,
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

  @Get('me')
  getMine(@CurrentUser() user: AuthUser) {
    return this.butlerService.getMine(user.userId);
  }

  @Post('me/name')
  rename(@CurrentUser() user: AuthUser, @Body() body: { name?: string }) {
    return this.butlerService.rename(user.userId, body?.name ?? '');
  }

  @Post('me/room')
  setRoom(
    @CurrentUser() user: AuthUser,
    @Body() body: { roomId?: string | null },
  ) {
    return this.butlerService.setActiveRoom(user.userId, body?.roomId ?? null);
  }

  @Delete('me')
  release(@CurrentUser() user: AuthUser) {
    return this.butlerService.release(user.userId);
  }
}
