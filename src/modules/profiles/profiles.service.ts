import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { BadgesService } from '../badges/badges.service';

@Injectable()
export class ProfilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly badgesService: BadgesService,
  ) {}

  async getPublicProfile(username: string, viewerId?: string) {
    const user = await this.prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        avatarUrl: true,
        avatarBorder: true,
        experience: true,
        coins: true,
        level: true,
        streak: true,
        bestStreak: true,
        createdAt: true,
        _count: {
          select: {
            followers: true,
            following: true,
            certificates: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Profile not found');
    }

    const [coursesCompleted, rank, badges] = await Promise.all([
      this.prisma.completion.count({
        where: {
          userId: user.id,
          courseId: {
            not: null,
          },
        },
      }),
      this.prisma.user.count({
        where: {
          experience: {
            gt: user.experience,
          },
        },
      }),
      this.badgesService.getUserBadges(user.id),
    ]);

    let isFollowing = false;

    let friendshipId: string | null = null;

    let friendshipStatus: string | null = null;

    let friendshipDirection: 'OUTGOING' | 'INCOMING' | null = null;

    let mutualFriends = 0;

    if (viewerId && viewerId !== user.id) {
      const [follow, friendship] = await Promise.all([
        this.prisma.follow.findUnique({
          where: {
            followerId_followingId: {
              followerId: viewerId,
              followingId: user.id,
            },
          },
        }),

        this.prisma.friendship.findFirst({
          where: {
            OR: [
              {
                requesterId: viewerId,
                addresseeId: user.id,
              },
              {
                requesterId: user.id,
                addresseeId: viewerId,
              },
            ],
          },
        }),
      ]);

      isFollowing = !!follow;

      const [viewerFriends, profileFriends] = await Promise.all([
        this.prisma.friendship.findMany({
          where: {
            status: 'ACCEPTED',
            OR: [{ requesterId: viewerId }, { addresseeId: viewerId }],
          },
          select: {
            requesterId: true,
            addresseeId: true,
          },
        }),

        this.prisma.friendship.findMany({
          where: {
            status: 'ACCEPTED',
            OR: [{ requesterId: user.id }, { addresseeId: user.id }],
          },
          select: {
            requesterId: true,
            addresseeId: true,
          },
        }),
      ]);

      const viewerFriendIds = new Set(
        viewerFriends.map((friendship) =>
          friendship.requesterId === viewerId
            ? friendship.addresseeId
            : friendship.requesterId,
        ),
      );

      mutualFriends = profileFriends.filter((friendship) => {
        const friendId =
          friendship.requesterId === user.id
            ? friendship.addresseeId
            : friendship.requesterId;

        return viewerFriendIds.has(friendId);
      }).length;

      if (friendship) {
        friendshipId = friendship.id;
        friendshipStatus = friendship.status;

        friendshipDirection =
          friendship.requesterId === viewerId ? 'OUTGOING' : 'INCOMING';
      }
    }

    return {
      id: user.id,
      username: user.username,
      avatarUrl: user.avatarUrl,
      avatarBorder: user.avatarBorder,

      level: user.level,
      xp: user.experience,
      coins: user.coins,

      verified: badges.verified,
      isCreator: badges.isCreator,

      currentStreak: user.streak,
      bestStreak: user.bestStreak,

      coursesCompleted,

      certificatesEarned: user._count.certificates,

      followers: user._count.followers,

      following: user._count.following,

      joinDate: user.createdAt,

      xpRank: rank + 1,

      isFollowing,

      friendshipId,
      friendshipStatus,
      friendshipDirection,

      mutualFriends,
    };
  }

  async follow(viewerId: string, username: string) {
    const target = await this.findUserByUsername(username);

    if (target.id === viewerId) {
      throw new ConflictException('Users cannot follow themselves');
    }

    const follow = await this.prisma.follow.upsert({
      where: {
        followerId_followingId: {
          followerId: viewerId,
          followingId: target.id,
        },
      },
      create: {
        followerId: viewerId,
        followingId: target.id,
      },
      update: {},
    });

    await this.notificationsService.create({
      userId: target.id,
      type: NotificationType.NEW_FOLLOWER,
      title: 'New follower',
      body: 'Someone started following your CodeBuddies profile.',
      metadata: {
        followerId: viewerId,
      },
    });

    return follow;
  }

  async unfollow(viewerId: string, username: string) {
    const target = await this.findUserByUsername(username);

    return this.prisma.follow.deleteMany({
      where: {
        followerId: viewerId,
        followingId: target.id,
      },
    });
  }

  private async findUserByUsername(username: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        username,
      },
      select: {
        id: true,
        username: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Profile not found');
    }

    return user;
  }
}
