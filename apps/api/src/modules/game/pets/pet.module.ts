import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { PetController } from './pet.controller';
import { PetService } from './pet.service';
import { PetSpeciesService } from './pet-species.service';
import {
  PetSpeciesAdminController,
  PetSpeciesPublicController,
} from './pet-species.controller';

@Module({
  imports: [PrismaModule],
  controllers: [
    PetController,
    PetSpeciesPublicController,
    PetSpeciesAdminController,
  ],
  providers: [PetService, PetSpeciesService],
  exports: [PetService, PetSpeciesService],
})
export class PetModule {}
