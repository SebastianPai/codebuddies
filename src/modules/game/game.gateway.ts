import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Logger } from '@nestjs/common';

import { PlayerHandler } from './ws/handlers/player.handler';
import { AvatarHandler } from './ws/handlers/avatar.handler';
import { RoomHandler } from './ws/handlers/room.handler';
import { InventoryHandler } from './ws/handlers/inventory.handler';
import { ShopHandler } from './ws/handlers/shop.handler';
import { AppHandler } from './ws/handlers/app.handler';
import { RoomItemsHandler } from './ws/handlers/room-items.handler';

import { ParsedAvatar } from './ws/dto/avatar.dto'; // ← Recomiendo mover las interfaces aquí

@WebSocketGateway({
  cors: {
    origin: (
      process.env.CORS_ORIGINS ?? 'http://localhost:3000,http://localhost:3002'
    ).split(','),
    credentials: true,
  },
  pingInterval: 25000,
  pingTimeout: 60000,
})
export class GameGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit
{
  private readonly logger = new Logger(GameGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwtService: JwtService,

    // Handlers
    private readonly playerHandler: PlayerHandler,
    private readonly avatarHandler: AvatarHandler,
    private readonly roomHandler: RoomHandler,
    private readonly inventoryHandler: InventoryHandler,
    private readonly shopHandler: ShopHandler,
    private readonly appHandler: AppHandler,
    private readonly roomItemsHandler: RoomItemsHandler,
  ) {}

  afterInit() {
    this.logger.log('🔥 GameGateway iniciado correctamente');
    this.appHandler.startAppsSync(this.server);
  }

  // ====================== CONEXIÓN ======================
  async handleConnection(socket: Socket) {
    await this.playerHandler.handleConnection(socket);
  }

  handleDisconnect(socket: Socket) {
    this.playerHandler.handleDisconnect(socket);
  }

  // ====================== HANDLERS ======================

  @SubscribeMessage('playerChat')
  handleChat(
    @MessageBody() data: { message: string },
    @ConnectedSocket() socket: Socket,
  ) {
    this.playerHandler.handleChat(this.server, socket, data);
  }

  @SubscribeMessage('playerMove')
  handlePlayerMove(
    @MessageBody() data: any,
    @ConnectedSocket() socket: Socket,
  ) {
    this.playerHandler.handlePlayerMove(this.server, socket, data);
  }

  @SubscribeMessage('playerAnimation:change')
  handleChangeAnimation(
    @MessageBody() data: { animationName: string },
    @ConnectedSocket() socket: Socket,
  ) {
    this.playerHandler.handleChangeAnimation(this.server, socket, data);
  }

  @SubscribeMessage('playerReaction')
  handleReaction(
    @MessageBody() data: { reaction: string },
    @ConnectedSocket() socket: Socket,
  ) {
    this.playerHandler.handleReaction(this.server, socket, data);
  }

  // ==================== AVATAR ====================
  @SubscribeMessage('avatar:equip')
  handleEquipItem(@MessageBody() data: any, @ConnectedSocket() socket: Socket) {
    this.avatarHandler.handleEquipItem(this.server, socket, data);
  }

  @SubscribeMessage('avatar:get')
  handleGetCurrentAvatar(@ConnectedSocket() socket: Socket) {
    this.avatarHandler.handleGetCurrentAvatar(socket);
  }

  @SubscribeMessage('updateAvatar')
  handleUpdateAvatar(
    @MessageBody() avatarData: any,
    @ConnectedSocket() socket: Socket,
  ) {
    this.avatarHandler.handleUpdateAvatar(this.server, socket, avatarData);
  }

  // ==================== SHOP ====================
  @SubscribeMessage('shop:items:request')
  handleShopItemsRequest(
    @MessageBody() data: any,
    @ConnectedSocket() socket: Socket,
  ) {
    this.shopHandler.handleShopItemsRequest(socket, data);
  }

  @SubscribeMessage('shop:item:buy')
  handleBuyItem(
    @MessageBody() data: { itemId: string },
    @ConnectedSocket() socket: Socket,
  ) {
    this.shopHandler.handleBuyItem(socket, data);
  }

  @SubscribeMessage('shop:background:buy')
  handleBuyBackground(
    @MessageBody() data: { backgroundId: string },
    @ConnectedSocket() socket: Socket,
  ) {
    this.shopHandler.handleBuyBackground(socket, data);
  }

  // ==================== INVENTORY ====================
  @SubscribeMessage('inventory:get')
  handleGetInventory(@ConnectedSocket() socket: Socket) {
    this.inventoryHandler.handleGetInventory(socket);
  }

  // ==================== PLAYER STATS ====================
  @SubscribeMessage('player:stats:get')
  handleGetStats(@ConnectedSocket() socket: Socket) {
    this.playerHandler.handleGetStats(socket);
  }

  // ==================== ITEM SPRITES ====================
  @SubscribeMessage('itemSprites:get')
  handleGetItemSprites(
    @MessageBody() data: { itemId: string; animationId?: string },
    @ConnectedSocket() socket: Socket,
  ) {
    this.playerHandler.handleGetItemSprites(socket, data); // o crea un ItemHandler si prefieres
  }

  // ==================== ROOMS ====================
  @SubscribeMessage('createRoom')
  handleCreateRoom(
    @MessageBody() data: any,
    @ConnectedSocket() socket: Socket,
  ) {
    this.roomHandler.handleCreateRoom(socket, data);
  }

  @SubscribeMessage('getPublicRooms')
  handleGetPublicRooms(@ConnectedSocket() socket: Socket) {
    this.roomHandler.handleGetPublicRooms(socket);
  }

  @SubscribeMessage('getMyRooms')
  handleGetMyRooms(@ConnectedSocket() socket: Socket) {
    this.roomHandler.handleGetMyRooms(socket);
  }

  @SubscribeMessage('joinRoom')
  handleJoinRoom(
    @MessageBody() data: { roomId: string },
    @ConnectedSocket() socket: Socket,
  ) {
    this.roomHandler.handleJoinRoom(this.server, socket, data);
  }

  @SubscribeMessage('leaveRoom')
  handleLeaveRoom(@ConnectedSocket() socket: Socket) {
    this.roomHandler.handleLeaveRoom(this.server, socket);
  }

  @SubscribeMessage('room:requestJoin')
  handleRequestJoin(
    @MessageBody() data: { roomId: string },
    @ConnectedSocket() socket: Socket,
  ) {
    this.roomHandler.handleRequestJoin(socket, data);
  }

  @SubscribeMessage('room:invite')
  handleInvite(
    @MessageBody() data: { roomId: string; toUserId: string },
    @ConnectedSocket() socket: Socket,
  ) {
    this.roomHandler.handleInvite(socket, data);
  }

  @SubscribeMessage('room:joinRequests:list')
  handleGetJoinRequests(
    @MessageBody() data: { roomId: string },
    @ConnectedSocket() socket: Socket,
  ) {
    this.roomHandler.handleGetJoinRequests(socket, data);
  }

  @SubscribeMessage('room:joinRequest:approve')
  handleApproveJoinRequest(
    @MessageBody() data: { requestId: string },
    @ConnectedSocket() socket: Socket,
  ) {
    this.roomHandler.handleApproveJoinRequest(socket, data);
  }

  @SubscribeMessage('room:joinRequest:reject')
  handleRejectJoinRequest(
    @MessageBody() data: { requestId: string },
    @ConnectedSocket() socket: Socket,
  ) {
    this.roomHandler.handleRejectJoinRequest(socket, data);
  }

  @SubscribeMessage('room:givePermission')
  handleGivePermission(
    @MessageBody() data: any,
    @ConnectedSocket() socket: Socket,
  ) {
    this.roomHandler.handleGivePermission(socket, data);
  }

  @SubscribeMessage('room:changeBackground')
  handleChangeBackground(
    @MessageBody() data: any,
    @ConnectedSocket() socket: Socket,
  ) {
    this.roomHandler.handleChangeBackground(this.server, socket, data);
  }

  @SubscribeMessage('room:thumbnail:update')
  handleUpdateThumbnail(
    @MessageBody() data: { roomId: string; thumbnailUrl: string },
    @ConnectedSocket() socket: Socket,
  ) {
    this.roomHandler.handleUpdateThumbnail(this.server, socket, data);
  }

  @SubscribeMessage('room:rate')
  handleRateRoom(@MessageBody() data: any, @ConnectedSocket() socket: Socket) {
    this.roomHandler.handleRateRoom(this.server, socket, data);
  }

  @SubscribeMessage('getRoomDetails')
  handleGetRoomDetails(
    @MessageBody() data: { roomId: string },
    @ConnectedSocket() socket: Socket,
  ) {
    this.roomHandler.handleGetRoomDetails(socket, data);
  }

  @SubscribeMessage('getBackgrounds')
  handleGetBackgrounds(@ConnectedSocket() socket: Socket) {
    this.roomHandler.handleGetBackgrounds(socket);
  }

  @SubscribeMessage('getLayouts')
  handleGetLayouts(@ConnectedSocket() socket: Socket) {
    this.roomHandler.handleGetLayouts(socket);
  }

  // ==================== ROOM ITEMS ====================
  @SubscribeMessage('room:item:place')
  handlePlaceRoomItem(
    @MessageBody() data: any,
    @ConnectedSocket() socket: Socket,
  ) {
    this.roomItemsHandler.placeItem(
      this.server,
      socket,
      socket.data.user?.userId,
      data,
    );
  }

  @SubscribeMessage('room:item:move')
  handleMoveRoomItem(
    @MessageBody() data: any,
    @ConnectedSocket() socket: Socket,
  ) {
    this.roomItemsHandler.moveItem(
      this.server,
      socket,
      socket.data.user?.userId,
      data,
    );
  }

  @SubscribeMessage('room:item:rotate')
  handleRotateRoomItem(
    @MessageBody() data: any,
    @ConnectedSocket() socket: Socket,
  ) {
    this.roomItemsHandler.rotateItem(
      this.server,
      socket,
      socket.data.user?.userId,
      data,
    );
  }

  @SubscribeMessage('room:item:remove')
  handleRemoveRoomItem(
    @MessageBody() data: any,
    @ConnectedSocket() socket: Socket,
  ) {
    this.roomItemsHandler.removeItem(
      this.server,
      socket,
      socket.data.user?.userId,
      data,
    );
  }

  @SubscribeMessage('room:surface:paint')
  handlePaintRoomSurface(
    @MessageBody() data: any,
    @ConnectedSocket() socket: Socket,
  ) {
    this.roomItemsHandler.paintSurface(
      this.server,
      socket,
      socket.data.user?.userId,
      data,
    );
  }

  @SubscribeMessage('room:items:clear')
  handleClearRoomItems(
    @MessageBody() data: any,
    @ConnectedSocket() socket: Socket,
  ) {
    this.roomItemsHandler.clearRoom(
      this.server,
      socket,
      socket.data.user?.userId,
      data,
    );
  }

  @SubscribeMessage('room:surface:paint-all')
  paintAllSurface(@ConnectedSocket() socket: Socket, @MessageBody() data: any) {
    this.roomItemsHandler.paintAllSurface(
      this.server,
      socket,
      socket.data.user?.userId,
      data,
    );
  }
}
