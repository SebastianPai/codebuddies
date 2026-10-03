import { AvatarService } from './avatar.service';

// Avatar al conectarse: la carrera de creación (dos handlers a la vez) y
// los items default para cuentas nuevas y viejas.
describe('AvatarService: avatar por defecto al conectarse', () => {
  const build = () => {
    const prisma = {
      avatar: { findUnique: jest.fn(), create: jest.fn() },
      item: { findMany: jest.fn().mockResolvedValue([]) },
      userItem: { upsert: jest.fn(), createMany: jest.fn() },
      avatarSlot: { upsert: jest.fn(), count: jest.fn(), createMany: jest.fn() },
    };
    const service = new AvatarService(prisma as never);
    jest.spyOn(service, 'getUserAvatar').mockResolvedValue({ id: 'av1', slots: [] } as never);
    return { prisma, service };
  };

  it('si otro handler ya creó el avatar (P2002), usa ese en vez de fallar', async () => {
    const { prisma, service } = build();
    prisma.avatar.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'av1', userId: 'u1' });
    prisma.avatar.create.mockRejectedValue(Object.assign(new Error('Unique'), { code: 'P2002' }));
    await expect(service.getOrCreateAvatarWithDefaults('u1')).resolves.toEqual({ id: 'av1', slots: [] });
  });

  it('una cuenta vieja recibe los items default y, si su avatar está vacío, se los pone', async () => {
    const { prisma, service } = build();
    prisma.avatar.findUnique.mockResolvedValue({ id: 'av1', userId: 'u1' });
    prisma.item.findMany.mockResolvedValue([{ id: 'body', isDefaultForSlot: 'BODY' }]);
    prisma.avatarSlot.count.mockResolvedValue(0);
    await service.getOrCreateAvatarWithDefaults('u1');
    expect(prisma.userItem.createMany).toHaveBeenCalledWith(expect.objectContaining({ skipDuplicates: true }));
    expect(prisma.avatarSlot.createMany).toHaveBeenCalledWith({ data: [{ avatarId: 'av1', slot: 'BODY', itemId: 'body' }], skipDuplicates: true });
  });

  it('no re-equipa nada si el avatar ya tiene partes puestas', async () => {
    const { prisma, service } = build();
    prisma.avatar.findUnique.mockResolvedValue({ id: 'av1', userId: 'u1' });
    prisma.item.findMany.mockResolvedValue([{ id: 'hair', isDefaultForSlot: 'HAIR' }]);
    prisma.avatarSlot.count.mockResolvedValue(3);
    await service.getOrCreateAvatarWithDefaults('u1');
    expect(prisma.avatarSlot.createMany).not.toHaveBeenCalled();
  });
});
