import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateLayoutDto } from './dto/create-layout.dto';
import { UpdateLayoutDto } from './dto/update-layout.dto';

// name/description en RoomLayout son el "canónico" (sincronizado desde la
// traducción es, o la primera disponible si no hay es) -- lo siguen leyendo
// RoomsService/RoomItemsService directo vía Prisma, sin pasar por esta API,
// así que no pueden desaparecer solo porque ahora hay traducciones reales.
function pickCanonicalTranslation(
  translations: CreateLayoutDto['translations'],
) {
  return (
    translations.find((t) => t.languageCode === 'es') ?? translations[0]
  );
}

@Injectable()
export class LayoutsService {
  constructor(private prisma: PrismaService) {}

  private parseLayoutJson(layoutJson: unknown): object {
    if (typeof layoutJson === 'string') {
      try {
        return JSON.parse(layoutJson);
      } catch {
        throw new BadRequestException('layoutJson no es un JSON válido');
      }
    }
    if (!layoutJson || typeof layoutJson !== 'object') {
      throw new BadRequestException('layoutJson es requerido');
    }
    return layoutJson;
  }

  async createLayout(dto: CreateLayoutDto) {
    if (!dto.translations?.length) {
      throw new BadRequestException(
        'Se requiere al menos una traducción para crear un layout',
      );
    }

    for (const t of dto.translations) {
      if (!t.name || t.name.trim().length < 3) {
        throw new BadRequestException(
          'El nombre debe tener al menos 3 caracteres',
        );
      }
    }

    const layoutJson = this.parseLayoutJson(dto.layoutJson);
    const canonical = pickCanonicalTranslation(dto.translations);

    return this.prisma.roomLayout.create({
      data: {
        name: canonical.name.trim(),
        description: canonical.description ?? '',
        previewImageUrl: dto.previewImageUrl ?? null,
        layoutJson,
        width: dto.width ?? 10,
        height: dto.height ?? 10,
        tileSize: dto.tileSize ?? 64,
        isPublic: dto.isPublic ?? true,
        translations: {
          create: dto.translations.map((t) => ({
            language: { connect: { code: t.languageCode } },
            name: t.name.trim(),
            description: t.description ?? null,
          })),
        },
      },
      include: { translations: { include: { language: true } } },
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
        translations: { include: { language: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getLayoutById(id: string) {
    const layout = await this.prisma.roomLayout.findUnique({
      where: { id },
      include: { translations: { include: { language: true } } },
    });

    if (!layout)
      throw new NotFoundException(`Layout con id ${id} no encontrado`);

    return layout;
  }

  async updateLayout(id: string, dto: UpdateLayoutDto) {
    const layout = await this.getLayoutById(id);

    if (dto.translations?.length) {
      for (const t of dto.translations) {
        if (!t.name || t.name.trim().length < 3) {
          throw new BadRequestException(
            'El nombre debe tener al menos 3 caracteres',
          );
        }

        const language = await this.prisma.language.findUnique({
          where: { code: t.languageCode },
        });
        if (!language) continue;

        const existing = layout.translations.find(
          (tr) => tr.languageId === language.id,
        );

        if (existing) {
          await this.prisma.roomLayoutTranslation.update({
            where: { id: existing.id },
            data: { name: t.name.trim(), description: t.description ?? null },
          });
        } else {
          await this.prisma.roomLayoutTranslation.create({
            data: {
              roomLayoutId: id,
              languageId: language.id,
              name: t.name.trim(),
              description: t.description ?? null,
            },
          });
        }
      }
    }

    const layoutJson =
      dto.layoutJson !== undefined
        ? this.parseLayoutJson(dto.layoutJson)
        : undefined;

    // A diferencia de createLayout, acá NO se cae a translations[0] si falta
    // "es": un PATCH parcial que solo trae, por ejemplo, la traducción en
    // inglés no debe pisar el name/description canónico con el inglés. Sin
    // "es" en este PATCH puntual, el canónico existente queda como estaba.
    const canonical = dto.translations?.find((t) => t.languageCode === 'es');

    return this.prisma.roomLayout.update({
      where: { id },
      data: {
        name: canonical ? canonical.name.trim() : undefined,
        description:
          canonical !== undefined ? canonical.description ?? '' : undefined,
        previewImageUrl:
          dto.previewImageUrl !== undefined ? dto.previewImageUrl : undefined,
        layoutJson,
        width: dto.width !== undefined ? Number(dto.width) : undefined,
        height: dto.height !== undefined ? Number(dto.height) : undefined,
        tileSize:
          dto.tileSize !== undefined ? Number(dto.tileSize) : undefined,
        isPublic: dto.isPublic,
      },
      include: { translations: { include: { language: true } } },
    });
  }

  async deleteLayout(id: string) {
    await this.getLayoutById(id); // valida que existe
    return this.prisma.roomLayout.delete({ where: { id } });
  }
}
