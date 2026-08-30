import {
  BadRequestException,
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
import { PET_ACTIONS, PetAction } from './pet.constants';
import { PetService } from './pet.service';

const PET_ACTION_NAMES = Object.keys(PET_ACTIONS) as PetAction[];

@Controller('pets')
@UseGuards(JwtAuthGuard)
export class PetController {
  constructor(private readonly petService: PetService) {}

  @Get('me')
  getMine(@CurrentUser() user: AuthUser) {
    return this.petService.getMyPet(user.userId);
  }

  @Post()
  adopt(
    @CurrentUser() user: AuthUser,
    @Body() body: { species?: string; name?: string; itemId?: string },
  ) {
    return this.petService.adopt(user.userId, body ?? {});
  }

  @Post('me/name')
  rename(@CurrentUser() user: AuthUser, @Body() body: { name?: string }) {
    return this.petService.rename(user.userId, body?.name ?? '');
  }

  @Post('me/actions/:action')
  action(@CurrentUser() user: AuthUser, @Param('action') action: string) {
    if (!PET_ACTION_NAMES.includes(action as PetAction)) {
      throw new BadRequestException(
        `Acción inválida. Válidas: ${PET_ACTION_NAMES.join(', ')}`,
      );
    }
    return this.petService.doAction(user.userId, action as PetAction);
  }

  @Post('me/cure')
  cure(@CurrentUser() user: AuthUser) {
    return this.petService.cure(user.userId);
  }

  @Post('me/room')
  setRoom(
    @CurrentUser() user: AuthUser,
    @Body() body: { roomId?: string | null },
  ) {
    return this.petService.setActiveRoom(user.userId, body?.roomId ?? null);
  }

  @Delete('me')
  release(@CurrentUser() user: AuthUser) {
    return this.petService.release(user.userId);
  }
}
