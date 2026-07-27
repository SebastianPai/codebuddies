import {
  Controller,
  Get,
  Param,
  Post,
  Delete,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../identity/guards/jwt.guard';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import type { AuthUser } from '../identity/decorators/current-user.decorator';
import { ProfilesService } from './profiles.service';
import { RoomsService } from '../game/rooms/rooms.service';
import { OptionalJwtAuthGuard } from '../identity/guards/optional-jwt.guard';

@Controller('profiles')
export class ProfilesController {
  constructor(
    private readonly profilesService: ProfilesService,
    private readonly roomsService: RoomsService,
  ) {}

  @Get(':username')
  @UseGuards(OptionalJwtAuthGuard)
  getPublicProfile(
    @Param('username') username: string,
    // Auth opcional: a diferencia de @CurrentUser(), req.user puede no existir.
    @Req() req: { user?: { userId: string } },
  ) {
    return this.profilesService.getPublicProfile(username, req.user?.userId);
  }

  @Get(':username/rooms')
  @UseGuards(OptionalJwtAuthGuard)
  getRooms(
    @Param('username') username: string,
    @Req() req: { user?: { userId: string } },
  ) {
    return this.roomsService.getRoomsForProfile(username, req.user?.userId);
  }

  @Post(':username/follow')
  @UseGuards(JwtAuthGuard)
  follow(@Param('username') username: string, @CurrentUser() user: AuthUser) {
    return this.profilesService.follow(user.userId, username);
  }

  @Delete(':username/follow')
  @UseGuards(JwtAuthGuard)
  unfollow(@Param('username') username: string, @CurrentUser() user: AuthUser) {
    return this.profilesService.unfollow(user.userId, username);
  }
}
