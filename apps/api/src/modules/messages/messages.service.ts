import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  FriendshipStatus,
  MessageRequestStatus,
  NotificationType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RealtimeService } from '../realtime/realtime.service';

@Injectable()
export class MessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly realtimeService: RealtimeService,
  ) {}

  async request(userId: string, username: string, body: string) {
    const receiver = await this.findUserByUsername(username);
    return this.createRequest(userId, receiver.id, body);
  }

  async createDirect(userId: string, targetUserId: string) {
    if (receiverIsSelf(userId, targetUserId)) {
      throw new ConflictException('Cannot message yourself');
    }

    const target = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true },
    });
    if (!target) throw new NotFoundException('User not found');

    const areFriends = await this.areFriends(userId, targetUserId);
    if (!areFriends) {
      const messageRequest = await this.createRequest(userId, targetUserId);
      return { messageRequest, requiresApproval: true };
    }

    return this.findOrCreateDirectConversation(userId, targetUserId);
  }

  private async createRequest(userId: string, receiverId: string, body?: string) {
    if (receiverIsSelf(userId, receiverId)) {
      throw new ConflictException('Cannot message yourself');
    }

    const request = await this.prisma.messageRequest.upsert({
      where: {
        senderId_receiverId: { senderId: userId, receiverId },
      },
      create: { senderId: userId, receiverId },
      update: { status: MessageRequestStatus.PENDING },
    });

    return request;
  }

  async inbox(userId: string) {
    const conversations = await this.prisma.conversation.findMany({
      where: { participants: { some: { userId } } },
      include: {
        participants: {
          include: {
            user: { select: { id: true, username: true, avatarUrl: true, nameEffectId: true } },
          },
        },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return Promise.all(conversations.map(async (conversation) => {
      const me = conversation.participants.find((item) => item.userId === userId);
      const partner = conversation.participants.find(
        (item) => item.userId !== userId,
      )?.user;
      const lastMessage = conversation.messages[0] ?? null;
      const unreadCount = await this.prisma.message.count({
        where: {
          conversationId: conversation.id,
          senderId: { not: userId },
          ...(me?.lastReadAt ? { createdAt: { gt: me.lastReadAt } } : {}),
        },
      });

      return {
        ...conversation,
        lastMessage,
        unreadCount,
        partner: partner
          ? { ...partner, online: this.realtimeService.isOnline(partner.id) }
          : null,
      };
    }));
  }

  requests(userId: string) {
    return this.prisma.messageRequest.findMany({
      where: { receiverId: userId, status: MessageRequestStatus.PENDING },
      include: {
        sender: { select: { id: true, username: true, avatarUrl: true, nameEffectId: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async accept(userId: string, requestId: string) {
    const request = await this.getRequest(requestId);
    if (request.receiverId !== userId) throw new ForbiddenException();

    const conversation = await this.prisma.$transaction(async (tx) => {
      await tx.messageRequest.update({
        where: { id: requestId },
        data: { status: MessageRequestStatus.ACCEPTED },
      });
      return this.findOrCreateDirectConversation(
        request.senderId,
        request.receiverId,
        tx,
      );
    });

    return conversation;
  }

  async reject(userId: string, requestId: string) {
    const request = await this.getRequest(requestId);
    if (request.receiverId !== userId) throw new ForbiddenException();
    return this.prisma.messageRequest.update({
      where: { id: requestId },
      data: { status: MessageRequestStatus.REJECTED },
    });
  }

  async listMessages(userId: string, conversationId: string) {
    await this.assertParticipant(userId, conversationId);
    await this.markDelivered(userId, conversationId);
    return this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take: 100,
      include: {
        sender: { select: { id: true, username: true, avatarUrl: true, nameEffectId: true } },
      },
    });
  }

  async send(userId: string, conversationId: string, body: string) {
    const conversation = await this.assertParticipant(userId, conversationId);
    const recipients = conversation.participants.filter(
      (participant) => participant.userId !== userId,
    );
    const deliveredAt = recipients.every((recipient) =>
      this.realtimeService.isOnline(recipient.userId),
    )
      ? new Date()
      : null;

    const message = await this.prisma.message.create({
      data: { conversationId, senderId: userId, body, deliveredAt },
      include: {
        sender: { select: { id: true, username: true, avatarUrl: true, nameEffectId: true } },
      },
    });
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    this.realtimeService.emitToUsers(
      conversation.participants.map((participant) => participant.userId),
      {
        type: 'message:new',
        payload: { conversationId, message },
      },
    );

    return message;
  }

  async markRead(userId: string, conversationId: string) {
    const conversation = await this.assertParticipant(userId, conversationId);
    const now = new Date();

    const [participant, update] = await this.prisma.$transaction([
      this.prisma.conversationParticipant.update({
        where: { conversationId_userId: { conversationId, userId } },
        data: { lastReadAt: now },
      }),
      this.prisma.message.updateMany({
        where: { conversationId, senderId: { not: userId }, seenAt: null },
        data: { seenAt: now, deliveredAt: now },
      }),
    ]);

    if (update.count > 0) {
      this.realtimeService.emitToUsers(
        conversation.participants
          .filter((item) => item.userId !== userId)
          .map((item) => item.userId),
        {
          type: 'message:seen',
          payload: { conversationId, userId, seenAt: now },
        },
      );
    }

    return participant;
  }

  async typing(userId: string, conversationId: string, isTyping: boolean) {
    const conversation = await this.assertParticipant(userId, conversationId);
    this.realtimeService.emitToUsers(
      conversation.participants
        .filter((participant) => participant.userId !== userId)
        .map((participant) => participant.userId),
      {
        type: 'message:typing',
        payload: { conversationId, userId, isTyping },
      },
    );
    return { ok: true };
  }

  async react(
    userId: string,
    conversationId: string,
    messageId: string,
    emoji: string,
  ) {
    const conversation = await this.assertParticipant(userId, conversationId);
    const message = await this.prisma.message.findFirst({
      where: { id: messageId, conversationId },
      select: { id: true },
    });
    if (!message) throw new NotFoundException('Message not found');

    this.realtimeService.emitToUsers(
      conversation.participants.map((participant) => participant.userId),
      {
        type: 'message:reaction',
        payload: { conversationId, messageId, userId, emoji },
      },
    );
    return { ok: true };
  }

  async deleteConversation(userId: string, conversationId: string) {
    await this.assertParticipant(userId, conversationId);
    this.realtimeService.emitToUser(userId, {
      type: 'conversation:deleted',
      payload: { conversationId },
    });
    return { ok: true };
  }

  private async assertParticipant(userId: string, conversationId: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, participants: { some: { userId } } },
      include: { participants: true },
    });
    if (!conversation) throw new ForbiddenException();
    return conversation;
  }

  private async markDelivered(userId: string, conversationId: string) {
    const update = await this.prisma.message.updateMany({
      where: { conversationId, senderId: { not: userId }, deliveredAt: null },
      data: { deliveredAt: new Date() },
    });

    if (update.count > 0) {
      const conversation = await this.assertParticipant(userId, conversationId);
      this.realtimeService.emitToUsers(
        conversation.participants
          .filter((participant) => participant.userId !== userId)
          .map((participant) => participant.userId),
        {
          type: 'message:delivered',
          payload: { conversationId, userId },
        },
      );
    }
  }

  private async areFriends(userAId: string, userBId: string) {
    const friendship = await this.prisma.friendship.findFirst({
      where: {
        status: FriendshipStatus.ACCEPTED,
        OR: [
          { requesterId: userAId, addresseeId: userBId },
          { requesterId: userBId, addresseeId: userAId },
        ],
      },
      select: { id: true },
    });

    return !!friendship;
  }

  private async findOrCreateDirectConversation(
    userAId: string,
    userBId: string,
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    const directKey = this.directKey(userAId, userBId);
    const existing = await tx.conversation.findUnique({
      where: { directKey },
      include: { participants: true },
    });
    if (existing) return existing;

    return tx.conversation.create({
      data: {
        directKey,
        participants: {
          create: [{ userId: userAId }, { userId: userBId }],
        },
      },
      include: { participants: true },
    });
  }

  private directKey(userAId: string, userBId: string) {
    return [userAId, userBId].sort().join(':');
  }

  private async getRequest(requestId: string) {
    const request = await this.prisma.messageRequest.findUnique({
      where: { id: requestId },
    });
    if (!request) throw new NotFoundException('Message request not found');
    return request;
  }

  private async findUserByUsername(username: string) {
    const user = await this.prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }
}

function receiverIsSelf(userId: string, receiverId: string) {
  return userId === receiverId;
}
