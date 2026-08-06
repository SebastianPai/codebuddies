import { Test, TestingModule } from '@nestjs/testing';
import { IdentityController } from './identity.controller';
import { IdentityService } from './identity.service';

describe('IdentityController', () => {
  let controller: IdentityController;
  const identityService = {
    login: jest.fn(),
    getProfile: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IdentityController],
      providers: [{ provide: IdentityService, useValue: identityService }],
    }).compile();

    controller = module.get<IdentityController>(IdentityController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('login sets the access_token cookie and returns the service response', async () => {
    identityService.login.mockResolvedValue({
      access_token: 'jwt-token',
      user: { userId: 'user-1' },
    });
    const res = { cookie: jest.fn() } as any;

    const result = await controller.login(
      { email: 'a@b.com', password: 'pw' } as any,
      res,
    );

    expect(res.cookie).toHaveBeenCalledWith(
      'access_token',
      'jwt-token',
      expect.objectContaining({ httpOnly: true }),
    );
    expect(result).toEqual({
      access_token: 'jwt-token',
      user: { userId: 'user-1' },
    });
  });

  it('getProfile delegates to IdentityService with the authenticated userId', () => {
    identityService.getProfile.mockReturnValue({ userId: 'user-1' });

    const result = controller.getProfile({ user: { userId: 'user-1' } });

    expect(identityService.getProfile).toHaveBeenCalledWith('user-1');
    expect(result).toEqual({ userId: 'user-1' });
  });
});
