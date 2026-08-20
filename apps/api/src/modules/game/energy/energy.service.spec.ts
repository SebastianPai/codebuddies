import { Test, TestingModule } from '@nestjs/testing';
import { EnergyService } from './energy.service';
import { PrismaService } from '../../../prisma/prisma.service';

describe('EnergyService', () => {
  let service: EnergyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EnergyService, { provide: PrismaService, useValue: {} }],
    }).compile();

    service = module.get<EnergyService>(EnergyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
