import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class LayoutsService {
  constructor(private prisma: PrismaService) {}

  async createLayout(data: any) {
    if (
      !data.name ||
      typeof data.name !== 'string' ||
      data.name.trim().length < 3
    ) {
      throw new BadRequestException(
        'El nombre debe tener al menos 3 caracteres',
      );
    }

    if (!data.layoutJson) {
      throw new BadRequestException('layoutJson es requerido');
    }

    // Aseguramos que layoutJson sea un objeto válido
    let layoutJson = data.layoutJson;
    if (typeof layoutJson === 'string') {
      try {
        layoutJson = JSON.parse(layoutJson);
      } catch (e) {
        throw new BadRequestException('layoutJson no es un JSON válido');
      }
    }

    return this.prisma.roomLayout.create({
      data: {
        name: data.name.trim(),
        description: data.description || '',
        previewImageUrl: data.previewImageUrl || null,
        layoutJson: layoutJson, // Prisma acepta objeto directamente
        width: Number(data.width) || 10,
        height: Number(data.height) || 10,
        tileSize: Number(data.tileSize) || 64,
        isPublic: data.isPublic ?? true,
      },
    });
  }

  async getLayouts() {
    return this.prisma.roomLayout.findMany({
      where: { isPublic: true },
      select: {
        id: true,
        name: true,
        previewImageUrl: true,
        layoutJson: true,
        width: true,
        height: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getLayoutById(id: string) {
    const layout = await this.prisma.roomLayout.findUnique({
      where: { id },
    });

    if (!layout)
      throw new NotFoundException(`Layout con id ${id} no encontrado`);

    return layout;
  }

  async updateLayout(id: string, data: any) {
    // Verificamos que exista
    await this.getLayoutById(id);

    let layoutJson = data.layoutJson;
    if (typeof layoutJson === 'string') {
      try {
        layoutJson = JSON.parse(layoutJson);
      } catch (e) {
        throw new BadRequestException('layoutJson no es un JSON válido');
      }
    }

    return this.prisma.roomLayout.update({
      where: { id },
      data: {
        name: data.name ? data.name.trim() : undefined,
        description:
          data.description !== undefined ? data.description : undefined,
        previewImageUrl:
          data.previewImageUrl !== undefined ? data.previewImageUrl : undefined,
        layoutJson: layoutJson !== undefined ? layoutJson : undefined,
        width: data.width !== undefined ? Number(data.width) : undefined,
        height: data.height !== undefined ? Number(data.height) : undefined,
        tileSize:
          data.tileSize !== undefined ? Number(data.tileSize) : undefined,
      },
    });
  }

  async deleteLayout(id: string) {
    await this.getLayoutById(id); // valida que existe
    return this.prisma.roomLayout.delete({ where: { id } });
  }
}
