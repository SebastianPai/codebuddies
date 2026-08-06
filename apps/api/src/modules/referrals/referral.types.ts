import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

export type PrismaExecutor = PrismaService | Prisma.TransactionClient;

export type RewardDispatchContext = {
  userId: string;
  referralId?: string | null;
  reason?: string;
};
