import { ForbiddenException } from '@nestjs/common';
import { MessagesService } from './messages.service';

// createDirect: abrir un chat 1:1 desde "Mensaje".
describe('MessagesService.createDirect', () => {
  const A = 'user-a';
  const B = 'user-b';

  function build({
    conversation = null as unknown,
    friendship = null as unknown,
    blocked = false,
  } = {}) {
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue({ id: B }) },
      conversation: {
        findUnique: jest.fn().mockResolvedValue(conversation),
        create: jest.fn().mockResolvedValue({ id: 'new-conv', participants: [] }),
      },
      friendship: {
        findFirst: jest.fn((args: { where: { status: string } }) =>
          Promise.resolve(
            args.where.status === 'BLOCKED' ? (blocked ? { id: 'block' } : null) : friendship,
          ),
        ),
      },
      messageRequest: { upsert: jest.fn().mockResolvedValue({ id: 'req' }) },
    };
    const service = new MessagesService(prisma as never, {} as never, { isOnline: () => false } as never);
    return { service, prisma };
  }

  it('abre la conversación existente aunque no sean amigos (solicitud ya aceptada)', async () => {
    const { service, prisma } = build({ conversation: { id: 'conv-1', participants: [] } });

    const result = await service.createDirect(A, B);

    expect(result).toMatchObject({ id: 'conv-1' });
    expect(prisma.messageRequest.upsert).not.toHaveBeenCalled();
  });

  it('sin conversación ni amistad crea una solicitud de mensaje', async () => {
    const { service, prisma } = build();

    const result = await service.createDirect(A, B);

    expect(result).toMatchObject({ requiresApproval: true });
    expect(prisma.messageRequest.upsert).toHaveBeenCalled();
  });

  it('entre amigos crea la conversación', async () => {
    const { service, prisma } = build({ friendship: { id: 'f' } });

    await service.createDirect(A, B);

    expect(prisma.conversation.create).toHaveBeenCalled();
  });

  it('no abre chats con un usuario bloqueado', async () => {
    const { service } = build({ conversation: { id: 'conv-1' }, blocked: true });

    await expect(service.createDirect(A, B)).rejects.toBeInstanceOf(ForbiddenException);
  });
});
