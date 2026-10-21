import { ConflictException } from '@nestjs/common';
import { FriendshipStatus } from '@prisma/client';
import { FriendshipsService } from './friendships.service';

describe('FriendshipsService', () => {
  const A = 'user-a';
  const B = 'user-b';
  const users = { requester: { username: 'a' }, addressee: { username: 'b' } };

  function build(existing: unknown) {
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue({ id: B }) },
      friendship: {
        findFirst: jest.fn().mockResolvedValue(existing),
        findUnique: jest.fn().mockResolvedValue(existing),
        update: jest.fn((args: { data: object }) => Promise.resolve({ ...(existing as object), ...args.data, ...users })),
        create: jest.fn().mockResolvedValue({ id: 'new', ...users }),
      },
    };
    const notifications = { create: jest.fn().mockResolvedValue({ id: 'n' }) };
    const realtime = { emitToUser: jest.fn(), emitToUsers: jest.fn(), isOnline: () => false };
    const service = new FriendshipsService(prisma as never, notifications as never, realtime as never);
    return { service, prisma };
  }

  it('si el otro ya me había mandado solicitud, mandarle una la acepta', async () => {
    const pendingFromB = { id: 'f1', requesterId: B, addresseeId: A, status: FriendshipStatus.PENDING };
    const { service, prisma } = build(pendingFromB);

    const result = await service.sendRequest(A, B);

    expect(prisma.friendship.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: FriendshipStatus.ACCEPTED } }),
    );
    expect(result).toMatchObject({ status: FriendshipStatus.ACCEPTED });
  });

  it('no deja "aceptar" un bloqueo', async () => {
    const blockByB = { id: 'f2', requesterId: B, addresseeId: A, status: FriendshipStatus.BLOCKED };
    const { service, prisma } = build(blockByB);

    await expect(service.accept(A, 'f2')).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.friendship.update).not.toHaveBeenCalled();
  });

  it('acepta una solicitud pendiente dirigida a mí', async () => {
    const pending = { id: 'f3', requesterId: B, addresseeId: A, status: FriendshipStatus.PENDING };
    const { service } = build(pending);

    await expect(service.accept(A, 'f3')).resolves.toMatchObject({ status: FriendshipStatus.ACCEPTED });
  });
});
