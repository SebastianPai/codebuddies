import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FriendChallengeStatus, FriendshipStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateFriendChallengeDto } from './dto/create-friend-challenge.dto';

@Injectable()
export class FriendChallengesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async createChallenge(challengerId: string, dto: CreateFriendChallengeDto) {
    const opponent = await this.prisma.user.findUnique({
      where: { username: dto.opponentUsername },
      select: { id: true, username: true },
    });
    if (!opponent) throw new NotFoundException('Usuario no encontrado');
    if (opponent.id === challengerId) {
      throw new BadRequestException('No podés retarte a vos mismo');
    }

    const friendship = await this.prisma.friendship.findFirst({
      where: {
        status: FriendshipStatus.ACCEPTED,
        OR: [
          { requesterId: challengerId, addresseeId: opponent.id },
          { requesterId: opponent.id, addresseeId: challengerId },
        ],
      },
    });
    if (!friendship) {
      throw new ForbiddenException('Solo podés retar a amigos aceptados');
    }

    const course = await this.prisma.course.findUnique({
      where: { id: dto.courseId },
      select: { id: true, status: true },
    });
    if (!course || course.status !== 'PUBLISHED') {
      throw new NotFoundException('Curso no encontrado');
    }

    const challenger = await this.prisma.user.findUnique({
      where: { id: challengerId },
      select: { username: true },
    });

    const challenge = await this.prisma.friendChallenge.create({
      data: {
        challengerId,
        opponentId: opponent.id,
        courseId: dto.courseId,
        status: FriendChallengeStatus.PENDING,
      },
    });

    await this.notificationsService.create({
      userId: opponent.id,
      type: 'FRIEND_CHALLENGE_INVITE',
      title: `${challenger?.username ?? 'Alguien'} te retó a un curso`,
      body: 'Aceptá el reto para empezar a competir.',
      metadata: { challengeId: challenge.id },
    });

    return challenge;
  }

  async listForUser(userId: string) {
    const challenges = await this.prisma.friendChallenge.findMany({
      where: { OR: [{ challengerId: userId }, { opponentId: userId }] },
      orderBy: { createdAt: 'desc' },
      include: {
        challenger: { select: { id: true, username: true } },
        opponent: { select: { id: true, username: true } },
        course: {
          select: {
            id: true,
            imageUrl: true,
            translations: { select: { title: true, language: { select: { code: true } } } },
          },
        },
      },
    });

    const resolved = await Promise.all(
      challenges.map((challenge) => this.resolveIfDue(challenge)),
    );

    return resolved.map((challenge) => this.serialize(challenge, userId));
  }

  async getById(id: string, userId: string) {
    const challenge = await this.prisma.friendChallenge.findUnique({
      where: { id },
      include: {
        challenger: { select: { id: true, username: true } },
        opponent: { select: { id: true, username: true } },
        course: {
          select: {
            id: true,
            imageUrl: true,
            translations: { select: { title: true, language: { select: { code: true } } } },
          },
        },
      },
    });
    if (!challenge) throw new NotFoundException('Reto no encontrado');
    if (challenge.challengerId !== userId && challenge.opponentId !== userId) {
      throw new ForbiddenException('Este reto no te pertenece');
    }

    const resolvedChallenge = await this.resolveIfDue(challenge);
    return this.serialize(resolvedChallenge, userId);
  }

  async respond(id: string, userId: string, accept: boolean) {
    const challenge = await this.prisma.friendChallenge.findUnique({ where: { id } });
    if (!challenge) throw new NotFoundException('Reto no encontrado');
    if (challenge.opponentId !== userId) {
      throw new ForbiddenException('Solo el retado puede responder');
    }
    if (challenge.status !== FriendChallengeStatus.PENDING) {
      throw new BadRequestException('Este reto ya no está pendiente');
    }

    const updated = await this.prisma.friendChallenge.update({
      where: { id },
      data: { status: accept ? FriendChallengeStatus.ACCEPTED : FriendChallengeStatus.DECLINED },
    });

    return updated;
  }

  async cancel(id: string, userId: string) {
    const challenge = await this.prisma.friendChallenge.findUnique({ where: { id } });
    if (!challenge) throw new NotFoundException('Reto no encontrado');
    if (challenge.challengerId !== userId) {
      throw new ForbiddenException('Solo quien retó puede cancelar');
    }
    if (challenge.status !== FriendChallengeStatus.PENDING) {
      throw new BadRequestException('Este reto ya no se puede cancelar');
    }

    return this.prisma.friendChallenge.update({
      where: { id },
      data: { status: FriendChallengeStatus.CANCELLED },
    });
  }

  // Sin un job/evento dedicado que dispare cuando alguien termina un curso,
  // se resuelve "on read": cada vez que se lista/consulta un reto ACCEPTED
  // se chequea si alguno de los dos ya completó el curso. Barato porque solo
  // corre sobre retos activos, no sobre todos.
  private async resolveIfDue<
    T extends {
      id: string;
      status: FriendChallengeStatus;
      challengerId: string;
      opponentId: string;
      courseId: string;
      winnerId: string | null;
      completedAt: Date | null;
    },
  >(challenge: T): Promise<T & { challengerProgress: number; opponentProgress: number }> {
    if (challenge.status !== FriendChallengeStatus.ACCEPTED) {
      return { ...challenge, challengerProgress: 0, opponentProgress: 0 };
    }

    const [challengerInfo, opponentInfo] = await Promise.all([
      this.getCourseFinishInfo(challenge.challengerId, challenge.courseId),
      this.getCourseFinishInfo(challenge.opponentId, challenge.courseId),
    ]);

    if (!challengerInfo.completed && !opponentInfo.completed) {
      return {
        ...challenge,
        challengerProgress: challengerInfo.progressPercent,
        opponentProgress: opponentInfo.progressPercent,
      };
    }

    let winnerId: string;
    let completedAt: Date;
    if (challengerInfo.completed && opponentInfo.completed) {
      const challengerFirst = challengerInfo.finishedAt! <= opponentInfo.finishedAt!;
      winnerId = challengerFirst ? challenge.challengerId : challenge.opponentId;
      completedAt = challengerFirst ? challengerInfo.finishedAt! : opponentInfo.finishedAt!;
    } else if (challengerInfo.completed) {
      winnerId = challenge.challengerId;
      completedAt = challengerInfo.finishedAt!;
    } else {
      winnerId = challenge.opponentId;
      completedAt = opponentInfo.finishedAt!;
    }

    const updated = await this.prisma.friendChallenge.update({
      where: { id: challenge.id },
      data: { status: FriendChallengeStatus.COMPLETED, winnerId, completedAt },
    });

    const winner = await this.prisma.user.findUnique({ where: { id: winnerId }, select: { username: true } });
    await Promise.all(
      [challenge.challengerId, challenge.opponentId].map((participantId) =>
        this.notificationsService.create({
          userId: participantId,
          type: 'FRIEND_CHALLENGE_RESOLVED',
          title:
            participantId === winnerId
              ? '¡Ganaste el reto!'
              : `${winner?.username ?? 'Tu rival'} completó el reto primero`,
          body: undefined,
          metadata: { challengeId: challenge.id },
        }),
      ),
    );

    return {
      ...challenge,
      ...updated,
      challengerProgress: challengerInfo.progressPercent,
      opponentProgress: opponentInfo.progressPercent,
    };
  }

  private async getCourseFinishInfo(userId: string, courseId: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { lessons: { select: { exercises: { select: { id: true } } } } },
    });
    const exerciseIds = course?.lessons.flatMap((lesson) => lesson.exercises.map((e) => e.id)) ?? [];

    if (exerciseIds.length === 0) {
      return { completed: false, progressPercent: 0, finishedAt: null as Date | null };
    }

    const completions = await this.prisma.completion.findMany({
      where: { userId, exerciseId: { in: exerciseIds } },
      select: { createdAt: true },
    });

    const completed = completions.length >= exerciseIds.length;
    const finishedAt = completed
      ? completions.reduce((max, c) => (c.createdAt > max ? c.createdAt : max), completions[0].createdAt)
      : null;

    return {
      completed,
      progressPercent: Math.round((completions.length / exerciseIds.length) * 100),
      finishedAt,
    };
  }

  private serialize(
    challenge: {
      id: string;
      status: FriendChallengeStatus;
      winnerId: string | null;
      completedAt: Date | null;
      createdAt: Date;
      challengerId: string;
      opponentId: string;
      challengerProgress: number;
      opponentProgress: number;
      challenger: { id: string; username: string };
      opponent: { id: string; username: string };
      course: {
        id: string;
        imageUrl: string | null;
        translations: Array<{ title: string; language: { code: string } }>;
      };
    },
    viewerId: string,
  ) {
    const translation =
      challenge.course.translations.find((t) => t.language.code === 'es') ??
      challenge.course.translations[0];

    return {
      id: challenge.id,
      status: challenge.status,
      winnerId: challenge.winnerId,
      isWinner: challenge.winnerId ? challenge.winnerId === viewerId : null,
      completedAt: challenge.completedAt,
      createdAt: challenge.createdAt,
      role: challenge.challengerId === viewerId ? ('CHALLENGER' as const) : ('OPPONENT' as const),
      challenger: challenge.challenger,
      opponent: challenge.opponent,
      course: {
        id: challenge.course.id,
        title: translation?.title ?? null,
        imageUrl: challenge.course.imageUrl,
      },
      challengerProgress: challenge.challengerProgress,
      opponentProgress: challenge.opponentProgress,
    };
  }
}
