import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { GameService } from './game.service';
import { EnergyService } from './energy/energy.service';
import { RewardService } from './reward/reward.service';
import { GameController } from './game.controller';
import { GameGateway } from './game.gateway';
import { JwtModule } from '@nestjs/jwt';
import { AvatarService } from './avatar/avatar.service';
import { ItemsController } from './items/items.controller';
import { ItemsService } from './items/items.service';
import { ItemSpritesService } from './item-sprites/item-sprites.service';
import { RoomsModule } from './rooms/rooms.module';
import { LayoutsModule } from './layouts/layouts.module';
import { PlayerModule } from './player/player.module';
import { RoomItemsModule } from './room-items/room-items.module';
import { RoomItemsHandler } from './ws/handlers/room-items.handler';
import { RoomHandler } from './ws/handlers/room.handler';
import { ShopHandler } from './ws/handlers/shop.handler';
import { InventoryHandler } from './ws/handlers/inventory.handler';
import { AvatarHandler } from './ws/handlers/avatar.handler';
import { PlayerHandler } from './ws/handlers/player.handler';
import { BackgroundsModule } from './backgrounds/backgrounds.module';
import { JWT_SECRET } from '../../config/env';

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      secret: JWT_SECRET,
      signOptions: { expiresIn: '1d' },
    }),
    RoomsModule,
    LayoutsModule,
    PlayerModule,
    RoomItemsModule,
    BackgroundsModule,
  ],
  providers: [
    GameService,
    EnergyService,
    RewardService,
    GameGateway,
    AvatarService,
    ItemsService,
    ItemSpritesService,
    RoomItemsHandler,
    AvatarHandler,
    RoomHandler,
    InventoryHandler,
    ShopHandler,
    PlayerHandler,
  ],
  controllers: [GameController, ItemsController],
})
export class GameModule {}
