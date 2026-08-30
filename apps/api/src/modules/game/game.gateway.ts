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
import { RoomItemsHandler } from './ws/handlers/room-items.handler';

import { EquipItemDto, UpdateAvatarDto } from './ws/dto/avatar.dto';
import {
  ChatMessageDto,
  PlayerAnimationChangeDto,
  PlayerMoveDto,
  PlayerReactionDto,
} from './ws/dto/player.dto';
import {
  BuyBackgroundDto,
  BuyItemDto,
  GiftItemDto,
  ShopItemsRequestDto,
} from './ws/dto/shop.dto';
import { GetItemSpritesDto } from './ws/dto/item-sprites.dto';
import { BuildFavoriteDto } from './ws/dto/inventory.dto';
import {
  AcceptInviteDto,
  ApproveJoinRequestDto,
  AssignCustomRoleDto,
  ChangeBackgroundDto,
  CreateCustomRoleDto,
  CreateRoomDto,
  DeclineInviteDto,
  DeleteCustomRoleDto,
  GetLightingStatusDto,
  GetRoomDetailsDto,
  GivePermissionDto,
  InviteDto,
  InviteFriendsSearchDto,
  JoinRequestsListDto,
  JoinRoomDto,
  KickGuestDto,
  ListCustomRolesDto,
  ListGuestsDto,
  ListRoomInvitesDto,
  RateRoomDto,
  RejectJoinRequestDto,
  RequestJoinDto,
  RevokeInviteDto,
  RevokePermissionDto,
  SetAmbientLightDto,
  UpdateCustomRoleDto,
  UpdateRoomDto,
  UpdateThumbnailDto,
} from './ws/dto/room.dto';
import {
  ClearRoomDto,
  InteractItemDto,
  MoveItemDto,
  PaintAllSurfaceDto,
  PaintSurfaceDto,
  PlaceItemDto,
  RemoveItemDto,
  RotateItemDto,
} from './ws/dto/room-items.dto';

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
    private readonly roomItemsHandler: RoomItemsHandler,
  ) {}

  afterInit() {
    this.logger.log('🔥 GameGateway iniciado correctamente');
  }

  // ====================== CONEXIÓN ======================
  async handleConnection(socket: Socket) {
    await this.playerHandler.handleConnection(socket);
  }

  handleDisconnect(socket: Socket) {
    this.playerHandler.handleDisconnect(socket);
  }

  // Único punto de entrada para que código FUERA del gateway (hoy:
  // IdentityService#updateProfile, una request HTTP) empuje una
  // actualización realtime a la room de un jugador. No hay @SubscribeMessage
  // acá porque nadie la dispara desde un socket -- ver
  // PlayerHandler#broadcastNameEffectUpdate para la lógica real (resolver
  // userId -> socket -> room y emitir). Devuelve false si el usuario no
  // tiene una conexión de juego activa ahora mismo (no hay nada que
  // sincronizar; el próximo join ya trae el valor nuevo desde la DB).
  broadcastNameEffectUpdate(
    userId: string,
    nameEffectId: string | null,
  ): boolean {
    return this.playerHandler.broadcastNameEffectUpdate(
      this.server,
      userId,
      nameEffectId,
    );
  }

  // ====================== HANDLERS ======================

  @SubscribeMessage('playerChat')
  handleChat(
    @MessageBody() data: ChatMessageDto,
    @ConnectedSocket() socket: Socket,
  ) {
    this.playerHandler.handleChat(this.server, socket, data);
  }

  @SubscribeMessage('playerMove')
  handlePlayerMove(
    @MessageBody() data: PlayerMoveDto,
    @ConnectedSocket() socket: Socket,
  ) {
    this.playerHandler.handlePlayerMove(this.server, socket, data);
  }

  @SubscribeMessage('playerAnimation:change')
  handleChangeAnimation(
    @MessageBody() data: PlayerAnimationChangeDto,
    @ConnectedSocket() socket: Socket,
  ) {
    this.playerHandler.handleChangeAnimation(this.server, socket, data);
  }

  @SubscribeMessage('playerReaction')
  handleReaction(
    @MessageBody() data: PlayerReactionDto,
    @ConnectedSocket() socket: Socket,
  ) {
    this.playerHandler.handleReaction(this.server, socket, data);
  }

  // ==================== AVATAR ====================
  @SubscribeMessage('avatar:equip')
  handleEquipItem(
    @MessageBody() data: EquipItemDto,
    @ConnectedSocket() socket: Socket,
  ) {
    this.avatarHandler.handleEquipItem(this.server, socket, data);
  }

  @SubscribeMessage('avatar:get')
  handleGetCurrentAvatar(@ConnectedSocket() socket: Socket) {
    this.avatarHandler.handleGetCurrentAvatar(socket);
  }

  @SubscribeMessage('updateAvatar')
  handleUpdateAvatar(
    @MessageBody() avatarData: UpdateAvatarDto,
    @ConnectedSocket() socket: Socket,
  ) {
    this.avatarHandler.handleUpdateAvatar(this.server, socket, avatarData);
  }

  // ==================== SHOP ====================
  @SubscribeMessage('shop:items:request')
  handleShopItemsRequest(
    @MessageBody() data: ShopItemsRequestDto,
    @ConnectedSocket() socket: Socket,
  ) {
    this.shopHandler.handleShopItemsRequest(socket, data);
  }

  @SubscribeMessage('shop:item:buy')
  handleBuyItem(
    @MessageBody() data: BuyItemDto,
    @ConnectedSocket() socket: Socket,
  ) {
    this.shopHandler.handleBuyItem(socket, data);
  }

  @SubscribeMessage('shop:background:buy')
  handleBuyBackground(
    @MessageBody() data: BuyBackgroundDto,
    @ConnectedSocket() socket: Socket,
  ) {
    this.shopHandler.handleBuyBackground(socket, data);
  }

  @SubscribeMessage('shop:item:gift')
  handleGiftItem(
    @MessageBody() data: GiftItemDto,
    @ConnectedSocket() socket: Socket,
  ) {
    this.shopHandler.handleGiftItem(socket, data);
  }

  // ==================== INVENTORY ====================
  @SubscribeMessage('inventory:get')
  handleGetInventory(@ConnectedSocket() socket: Socket) {
    this.inventoryHandler.handleGetInventory(socket);
  }

  @SubscribeMessage('build:favorites:list')
  handleListBuildFavorites(@ConnectedSocket() socket: Socket) {
    this.inventoryHandler.handleListBuildFavorites(socket);
  }

  @SubscribeMessage('build:favorite:add')
  handleAddBuildFavorite(
    @MessageBody() data: BuildFavoriteDto,
    @ConnectedSocket() socket: Socket,
  ) {
    this.inventoryHandler.handleAddBuildFavorite(socket, data);
  }

  @SubscribeMessage('build:favorite:remove')
  handleRemoveBuildFavorite(
    @MessageBody() data: BuildFavoriteDto,
    @ConnectedSocket() socket: Socket,
  ) {
    this.inventoryHandler.handleRemoveBuildFavorite(socket, data);
  }

  // ==================== PLAYER STATS ====================
  @SubscribeMessage('player:stats:get')
  handleGetStats(@ConnectedSocket() socket: Socket) {
    this.playerHandler.handleGetStats(socket);
  }

  // ==================== ITEM SPRITES ====================
  @SubscribeMessage('itemSprites:get')
  handleGetItemSprites(
    @MessageBody() data: GetItemSpritesDto,
    @ConnectedSocket() socket: Socket,
  ) {
    this.playerHandler.handleGetItemSprites(socket, data); // o crea un ItemHandler si prefieres
  }

  // ==================== ROOMS ====================
  @SubscribeMessage('createRoom')
  handleCreateRoom(
    @MessageBody() data: CreateRoomDto,
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
    @MessageBody() data: JoinRoomDto,
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
    @MessageBody() data: RequestJoinDto,
    @ConnectedSocket() socket: Socket,
  ) {
    this.roomHandler.handleRequestJoin(socket, data);
  }

  @SubscribeMessage('room:invite')
  handleInvite(
    @MessageBody() data: InviteDto,
    @ConnectedSocket() socket: Socket,
  ) {
    this.roomHandler.handleInvite(socket, data);
  }

  @SubscribeMessage('room:invite:friends-search')
  handleFriendsSearch(
    @MessageBody() data: InviteFriendsSearchDto,
    @ConnectedSocket() socket: Socket,
  ) {
    this.roomHandler.handleFriendsSearch(socket, data);
  }

  @SubscribeMessage('room:guests:list')
  handleListGuests(
    @MessageBody() data: ListGuestsDto,
    @ConnectedSocket() socket: Socket,
  ) {
    this.roomHandler.handleListGuests(socket, data);
  }

  @SubscribeMessage('room:invites:list')
  handleListInvites(
    @MessageBody() data: ListRoomInvitesDto,
    @ConnectedSocket() socket: Socket,
  ) {
    this.roomHandler.handleListInvites(socket, data);
  }

  @SubscribeMessage('room:invite:revoke')
  handleRevokeInvite(
    @MessageBody() data: RevokeInviteDto,
    @ConnectedSocket() socket: Socket,
  ) {
    this.roomHandler.handleRevokeInvite(socket, data);
  }

  @SubscribeMessage('room:invite:accept')
  handleAcceptInvite(
    @MessageBody() data: AcceptInviteDto,
    @ConnectedSocket() socket: Socket,
  ) {
    this.roomHandler.handleAcceptInvite(socket, data);
  }

  @SubscribeMessage('room:invite:decline')
  handleDeclineInvite(
    @MessageBody() data: DeclineInviteDto,
    @ConnectedSocket() socket: Socket,
  ) {
    this.roomHandler.handleDeclineInvite(socket, data);
  }

  @SubscribeMessage('room:permission:revoke')
  handleRevokePermission(
    @MessageBody() data: RevokePermissionDto,
    @ConnectedSocket() socket: Socket,
  ) {
    this.roomHandler.handleRevokePermission(socket, data);
  }

  @SubscribeMessage('room:guest:kick')
  handleKickGuest(
    @MessageBody() data: KickGuestDto,
    @ConnectedSocket() socket: Socket,
  ) {
    this.roomHandler.handleKickGuest(this.server, socket, data);
  }

  @SubscribeMessage('room:joinRequests:list')
  handleGetJoinRequests(
    @MessageBody() data: JoinRequestsListDto,
    @ConnectedSocket() socket: Socket,
  ) {
    this.roomHandler.handleGetJoinRequests(socket, data);
  }

  @SubscribeMessage('room:joinRequest:approve')
  handleApproveJoinRequest(
    @MessageBody() data: ApproveJoinRequestDto,
    @ConnectedSocket() socket: Socket,
  ) {
    this.roomHandler.handleApproveJoinRequest(socket, data);
  }

  @SubscribeMessage('room:joinRequest:reject')
  handleRejectJoinRequest(
    @MessageBody() data: RejectJoinRequestDto,
    @ConnectedSocket() socket: Socket,
  ) {
    this.roomHandler.handleRejectJoinRequest(socket, data);
  }

  @SubscribeMessage('room:givePermission')
  handleGivePermission(
    @MessageBody() data: GivePermissionDto,
    @ConnectedSocket() socket: Socket,
  ) {
    this.roomHandler.handleGivePermission(socket, data);
  }

  @SubscribeMessage('room:role:list')
  handleListCustomRoles(
    @MessageBody() data: ListCustomRolesDto,
    @ConnectedSocket() socket: Socket,
  ) {
    this.roomHandler.handleListCustomRoles(socket, data);
  }

  @SubscribeMessage('room:role:create')
  handleCreateCustomRole(
    @MessageBody() data: CreateCustomRoleDto,
    @ConnectedSocket() socket: Socket,
  ) {
    this.roomHandler.handleCreateCustomRole(socket, data);
  }

  @SubscribeMessage('room:role:update')
  handleUpdateCustomRole(
    @MessageBody() data: UpdateCustomRoleDto,
    @ConnectedSocket() socket: Socket,
  ) {
    this.roomHandler.handleUpdateCustomRole(socket, data);
  }

  @SubscribeMessage('room:role:delete')
  handleDeleteCustomRole(
    @MessageBody() data: DeleteCustomRoleDto,
    @ConnectedSocket() socket: Socket,
  ) {
    this.roomHandler.handleDeleteCustomRole(socket, data);
  }

  @SubscribeMessage('room:role:assign')
  handleAssignCustomRole(
    @MessageBody() data: AssignCustomRoleDto,
    @ConnectedSocket() socket: Socket,
  ) {
    this.roomHandler.handleAssignCustomRole(socket, data);
  }

  @SubscribeMessage('room:changeBackground')
  handleChangeBackground(
    @MessageBody() data: ChangeBackgroundDto,
    @ConnectedSocket() socket: Socket,
  ) {
    this.roomHandler.handleChangeBackground(this.server, socket, data);
  }

  @SubscribeMessage('room:thumbnail:update')
  handleUpdateThumbnail(
    @MessageBody() data: UpdateThumbnailDto,
    @ConnectedSocket() socket: Socket,
  ) {
    this.roomHandler.handleUpdateThumbnail(this.server, socket, data);
  }

  @SubscribeMessage('room:update')
  handleUpdateRoom(
    @MessageBody() data: UpdateRoomDto,
    @ConnectedSocket() socket: Socket,
  ) {
    this.roomHandler.handleUpdateRoom(this.server, socket, data);
  }

  @SubscribeMessage('room:lighting:get')
  handleGetLightingStatus(
    @MessageBody() data: GetLightingStatusDto,
    @ConnectedSocket() socket: Socket,
  ) {
    this.roomHandler.handleGetLightingStatus(socket, data);
  }

  @SubscribeMessage('room:lighting:set')
  handleSetAmbientLight(
    @MessageBody() data: SetAmbientLightDto,
    @ConnectedSocket() socket: Socket,
  ) {
    this.roomHandler.handleSetAmbientLight(this.server, socket, data);
  }

  @SubscribeMessage('room:rate')
  handleRateRoom(
    @MessageBody() data: RateRoomDto,
    @ConnectedSocket() socket: Socket,
  ) {
    this.roomHandler.handleRateRoom(this.server, socket, data);
  }

  @SubscribeMessage('getRoomDetails')
  handleGetRoomDetails(
    @MessageBody() data: GetRoomDetailsDto,
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
    @MessageBody() data: PlaceItemDto,
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
    @MessageBody() data: MoveItemDto,
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
    @MessageBody() data: RotateItemDto,
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
    @MessageBody() data: RemoveItemDto,
    @ConnectedSocket() socket: Socket,
  ) {
    this.roomItemsHandler.removeItem(
      this.server,
      socket,
      socket.data.user?.userId,
      data,
    );
  }

  @SubscribeMessage('room:item:interact')
  handleInteractRoomItem(
    @MessageBody() data: InteractItemDto,
    @ConnectedSocket() socket: Socket,
  ) {
    this.roomItemsHandler.interactItem(
      this.server,
      socket,
      socket.data.user?.userId,
      data,
    );
  }

  @SubscribeMessage('room:surface:paint')
  handlePaintRoomSurface(
    @MessageBody() data: PaintSurfaceDto,
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
    @MessageBody() data: ClearRoomDto,
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
  paintAllSurface(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: PaintAllSurfaceDto,
  ) {
    this.roomItemsHandler.paintAllSurface(
      this.server,
      socket,
      socket.data.user?.userId,
      data,
    );
  }
}
