import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Friendship, FriendshipStatus, NotificationType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RealtimeService } from '../realtime/realtime.service';

@Injectable()
export class FriendshipsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly realtimeService: RealtimeService,
  ) {}

  async sendRequest(requesterId: string, targetUserId: string) {
    if (requesterId === targetUserId) {
      throw new ConflictException('Cannot friend yourself');
    }

    const target = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true },
    });

    if (!target) {
      throw new NotFoundException('User not found');
    }

    const existing = await this.prisma.friendship.findFirst({
      where: {
        OR: [
          {
            requesterId,
            addresseeId: targetUserId,
          },
          {
            requesterId: targetUserId,
            addresseeId: requesterId,
          },
        ],
      },
    });

    if (existing) {
      if (existing.status === FriendshipStatus.REJECTED) {
        const updated = await this.prisma.friendship.update({
          where: { id: existing.id },
          data: {
            requesterId,
            addresseeId: targetUserId,
            status: FriendshipStatus.PENDING,
          },
          include: this.friendshipUsers(),
        });
        this.realtimeService.emitToUser(targetUserId, {
          type: 'friendship:request',
          payload: { friendship: updated },
        });
        return updated;
      }

      return this.withUsers(existing.id);
    }

    const friendship = await this.prisma.friendship.create({
      data: {
        requesterId,
        addresseeId: targetUserId,
        status: FriendshipStatus.PENDING,
      },
      include: this.friendshipUsers(),
    });

    const notification = await this.notificationsService.create({
      userId: targetUserId,
      type: NotificationType.FRIEND_REQUEST_RECEIVED,
      title: 'Friend request received',
      body: `${friendship.requester.username} te envió una solicitud de amistad.`,
      metadata: {
        friendshipId: friendship.id,
        requesterId,
        friend: friendship.requester,
      },
    });
    this.realtimeService.emitToUser(targetUserId, {
      type: 'friendship:request',
      payload: { friendship, notification },
    });

    return friendship;
  }

  async list(userId: string) {
    const friendships = await this.prisma.friendship.findMany({
      where: {
        status: FriendshipStatus.ACCEPTED,
        OR: [{ requesterId: userId }, { addresseeId: userId }],
      },
      include: this.friendshipUsers(),
      orderBy: { updatedAt: 'desc' },
    });

    return friendships.map((friendship) => ({
      ...friendship,
      friend:
        friendship.requesterId === userId
          ? friendship.addressee
          : friendship.requester,
      online: this.realtimeService.isOnline(
        friendship.requesterId === userId
          ? friendship.addresseeId
          : friendship.requesterId,
      ),
    }));
  }

  requests(userId: string) {
    return this.prisma.friendship.findMany({
      where: { addresseeId: userId, status: FriendshipStatus.PENDING },
      include: this.friendshipUsers(),
      orderBy: { createdAt: 'desc' },
    });
  }

  sent(userId: string) {
    return this.prisma.friendship.findMany({
      where: { requesterId: userId, status: FriendshipStatus.PENDING },
      include: this.friendshipUsers(),
      orderBy: { createdAt: 'desc' },
    });
  }

  async accept(userId: string, friendshipId: string) {
    const friendship = await this.getFriendship(friendshipId);
    if (friendship.addresseeId !== userId) throw new ForbiddenException();

    const updated = await this.prisma.friendship.update({
      where: { id: friendshipId },
      data: { status: FriendshipStatus.ACCEPTED },
      include: this.friendshipUsers(),
    });

    const notification = await this.notificationsService.create({
      userId: friendship.requesterId,
      type: NotificationType.FRIEND_REQUEST_ACCEPTED,
      title: 'Friend request accepted',
      body: `${updated.addressee.username} aceptó tu solicitud de amistad.`,
      metadata: { friendshipId, friend: updated.addressee },
    });
    this.realtimeService.emitToUsers(
      [friendship.requesterId, friendship.addresseeId],
      {
        type: 'friendship:accepted',
        payload: { friendship: updated, notification },
      },
    );

    return updated;
  }

  async reject(userId: string, friendshipId: string) {
    return this.transitionOwnedByAddressee(
      userId,
      friendshipId,
      FriendshipStatus.REJECTED,
    );
  }

  async block(userId: string, friendshipId: string) {
    const friendship = await this.getFriendship(friendshipId);
    if (
      friendship.requesterId !== userId &&
      friendship.addresseeId !== userId
    ) {
      throw new ForbiddenException();
    }
    return this.prisma.friendship.update({
      where: { id: friendshipId },
      data: { status: FriendshipStatus.BLOCKED },
    });
  }

  async blockUser(userId: string, targetUserId: string) {
    if (userId === targetUserId) {
      throw new ConflictException('Cannot block yourself');
    }

    const existing = await this.prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId: userId, addresseeId: targetUserId },
          { requesterId: targetUserId, addresseeId: userId },
        ],
      },
    });

    if (existing) {
      return this.prisma.friendship.update({
        where: { id: existing.id },
        data: {
          requesterId: userId,
          addresseeId: targetUserId,
          status: FriendshipStatus.BLOCKED,
        },
        include: this.friendshipUsers(),
      });
    }

    return this.prisma.friendship.create({
      data: {
        requesterId: userId,
        addresseeId: targetUserId,
        status: FriendshipStatus.BLOCKED,
      },
      include: this.friendshipUsers(),
    });
  }

  async remove(userId: string, friendshipId: string) {
    const friendship = await this.getFriendship(friendshipId);
    if (
      friendship.requesterId !== userId &&
      friendship.addresseeId !== userId
    ) {
      throw new ForbiddenException();
    }
    return this.prisma.friendship.delete({ where: { id: friendshipId } });
  }

  private async transitionOwnedByAddressee(
    userId: string,
    friendshipId: string,
    status: FriendshipStatus,
  ) {
    const friendship = await this.getFriendship(friendshipId);
    if (friendship.addresseeId !== userId) throw new ForbiddenException();
    return this.prisma.friendship.update({
      where: { id: friendshipId },
      data: { status },
    });
  }

  private async getFriendship(friendshipId: string) {
    const friendship = await this.prisma.friendship.findUnique({
      where: { id: friendshipId },
    });
    if (!friendship) throw new NotFoundException('Friendship not found');
    return friendship;
  }

  private async findUserByUsername(username: string) {
    const user = await this.prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  private friendshipUsers() {
    return {
      requester: { select: { id: true, username: true, avatarUrl: true } },
      addressee: { select: { id: true, username: true, avatarUrl: true } },
    };
  }

  async searchUsers(userId: string, query: string) {
    if (!query || query.trim().length < 2) {
      return [];
    }

    const users = await this.prisma.user.findMany({
      where: {
        username: {
          contains: query.trim(),
          mode: 'insensitive',
        },
        NOT: {
          id: userId,
        },
      },
      select: {
        id: true,
        username: true,
        avatarUrl: true,
        level: true,
        experience: true,
      },
      orderBy: {
        experience: 'desc',
      },
      take: 10,
    });

    const [friendIds, relationships] = await Promise.all([
      this.getAcceptedFriendIds(userId),
      users.length
        ? this.prisma.friendship.findMany({
            where: {
              OR: users.flatMap((user) => [
                { requesterId: userId, addresseeId: user.id },
                { requesterId: user.id, addresseeId: userId },
              ]),
            },
          })
        : Promise.resolve([] as Friendship[]),
    ]);

    const relationshipByUser = new Map(
      relationships.map((friendship) => [
        friendship.requesterId === userId
          ? friendship.addresseeId
          : friendship.requesterId,
        friendship,
      ]),
    );

    return Promise.all(
      users.map(async (user) => {
        const relationship = relationshipByUser.get(user.id);
        return {
          ...user,
          friendship: relationship
            ? {
                id: relationship.id,
                status: relationship.status,
                direction:
                  relationship.requesterId === userId ? 'OUTGOING' : 'INCOMING',
              }
            : { status: 'NONE' },
          mutualCount: await this.countMutuals(friendIds, user.id),
          online: this.realtimeService.isOnline(user.id),
        };
      }),
    );
  }

  async getFriendshipStatus(currentUserId: string, username: string) {
    const target = await this.prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });

    if (!target) {
      throw new NotFoundException('User not found');
    }

    const friendship = await this.prisma.friendship.findFirst({
      where: {
        OR: [
          {
            requesterId: currentUserId,
            addresseeId: target.id,
          },
          {
            requesterId: target.id,
            addresseeId: currentUserId,
          },
        ],
      },
    });

    if (!friendship) {
      return {
        status: 'NONE',
      };
    }

    const [followersCount, followingCount] = await Promise.all([
      this.prisma.follow.count({ where: { followingId: target.id } }),
      this.prisma.follow.count({ where: { followerId: target.id } }),
    ]);

    return {
      id: friendship.id,
      status: friendship.status,
      direction:
        friendship.requesterId === currentUserId ? 'OUTGOING' : 'INCOMING',
      followersCount,
      followingCount,
    };
  }

  async getMutualFriends(currentUserId: string, username: string) {
    const target = await this.prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });

    if (!target) {
      throw new NotFoundException('User not found');
    }

    const currentFriendIds = await this.getAcceptedFriendIds(currentUserId);

    const targetFriends = await this.prisma.friendship.findMany({
      where: {
        status: FriendshipStatus.ACCEPTED,
        OR: [{ requesterId: target.id }, { addresseeId: target.id }],
      },
    });

    const currentIds = new Set(currentFriendIds);

    const mutualIds = targetFriends
      .map((friendship) =>
        friendship.requesterId === target.id
          ? friendship.addresseeId
          : friendship.requesterId,
      )
      .filter((friendId) => currentIds.has(friendId));

    const preview = await this.prisma.user.findMany({
      where: { id: { in: mutualIds.slice(0, 3) } },
      select: { id: true, username: true, avatarUrl: true },
    });

    return {
      count: mutualIds.length,
      preview,
    };
  }

  async suggestions(userId: string) {
    const friendIds = await this.getAcceptedFriendIds(userId);
    const excludedIds = new Set([userId, ...friendIds]);
    const relationships = await this.prisma.friendship.findMany({
      where: { OR: [{ requesterId: userId }, { addresseeId: userId }] },
      select: { requesterId: true, addresseeId: true },
    });
    relationships.forEach((friendship) => {
      excludedIds.add(
        friendship.requesterId === userId
          ? friendship.addresseeId
          : friendship.requesterId,
      );
    });

    const friendOfFriendRows = friendIds.length
      ? await this.prisma.friendship.findMany({
          where: {
            status: FriendshipStatus.ACCEPTED,
            OR: [
              { requesterId: { in: friendIds } },
              { addresseeId: { in: friendIds } },
            ],
          },
          select: { requesterId: true, addresseeId: true },
          take: 200,
        })
      : [];

    const mutualScore = new Map<string, number>();
    friendOfFriendRows.forEach((friendship) => {
      const friendId =
        friendIds.includes(friendship.requesterId)
          ? friendship.addresseeId
          : friendship.requesterId;
      if (!excludedIds.has(friendId)) {
        mutualScore.set(friendId, (mutualScore.get(friendId) ?? 0) + 1);
      }
    });

    const activityUsers = await this.prisma.activity.groupBy({
      by: ['userId'],
      where: { userId: { notIn: [...excludedIds] } },
      _count: { userId: true },
      orderBy: { _count: { userId: 'desc' } },
      take: 20,
    });

    const candidateIds = [
      ...new Set([
        ...[...mutualScore.entries()]
          .sort((a, b) => b[1] - a[1])
          .map(([candidateId]) => candidateId),
        ...activityUsers.map((item) => item.userId),
      ]),
    ].slice(0, 10);

    const users = await this.prisma.user.findMany({
      where: { id: { in: candidateIds } },
      select: {
        id: true,
        username: true,
        avatarUrl: true,
        level: true,
        experience: true,
      },
    });

    return users
      .map((user) => ({
        ...user,
        // Siempre 'NONE': suggestions() ya excluyó arriba a cualquiera con
        // una relación existente (amigo, pendiente o bloqueado). Mismo
        // shape que search() para que el frontend use el mismo tipo/render.
        friendship: { status: 'NONE' as const },
        mutualCount: mutualScore.get(user.id) ?? 0,
        online: this.realtimeService.isOnline(user.id),
      }))
      .sort((a, b) => b.mutualCount - a.mutualCount || b.experience - a.experience);
  }

  private withUsers(friendshipId: string) {
    return this.prisma.friendship.findUnique({
      where: { id: friendshipId },
      include: this.friendshipUsers(),
    });
  }

  private async getAcceptedFriendIds(userId: string) {
    const friendships = await this.prisma.friendship.findMany({
      where: {
        status: FriendshipStatus.ACCEPTED,
        OR: [{ requesterId: userId }, { addresseeId: userId }],
      },
      select: { requesterId: true, addresseeId: true },
    });

    return friendships.map((friendship) =>
      friendship.requesterId === userId
        ? friendship.addresseeId
        : friendship.requesterId,
    );
  }

  private async countMutuals(currentFriendIds: string[], targetUserId: string) {
    if (!currentFriendIds.length) return 0;

    return this.prisma.friendship.count({
      where: {
        status: FriendshipStatus.ACCEPTED,
        OR: [
          { requesterId: targetUserId, addresseeId: { in: currentFriendIds } },
          { addresseeId: targetUserId, requesterId: { in: currentFriendIds } },
        ],
      },
    });
  }
}
