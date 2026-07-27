import { Controller, Get, Patch, Body, Req, Param, Res } from '@nestjs/common';
import { AvatarService } from './avatar.service';
import { AvatarSlotType } from '@prisma/client';

import type { Response } from 'express';

@Controller('avatar')
export class AvatarController {
  constructor(private avatarService: AvatarService) {}

  // ────────────── Endpoint proxy para imágenes ──────────────
  @Get('image/:fileName')
  async getImage(@Param('fileName') fileName: string, @Res() res: Response) {
    try {
      const url = `https://codebuddies-assets.sfo3.cdn.digitaloceanspaces.com/items/${fileName}`;
      const response = await fetch(url);
      if (!response.ok) {
        res.status(response.status).send('No se pudo cargar la imagen');
        return;
      }

      const buffer = await response.arrayBuffer();
      res.setHeader('Content-Type', 'image/png');
      res.send(Buffer.from(buffer));
    } catch (err) {
      console.error('Error proxy imagen:', err);
      res.status(500).send('Error interno al cargar la imagen');
    }
  }

  /*
  ─────────────────────────────
  Obtener avatar
  ─────────────────────────────
  */
  @Get()
  async getAvatar(@Req() req) {
    return this.avatarService.getUserAvatar(req.user.id);
  }

  /*
  ─────────────────────────────
  Equipar item
  ─────────────────────────────
  */
  @Patch('equip')
  async equipItem(
    @Req() req,
    @Body() body: { slot: AvatarSlotType; avatarItemId: string }, // 🔥 ahora avatarItemId
  ) {
    return this.avatarService.equipItem(
      req.user.id,
      body.slot,
      body.avatarItemId,
    );
  }

  /*
  ─────────────────────────────
  Desequipar
  ─────────────────────────────
  */
  @Patch('unequip')
  async unequipItem(@Req() req, @Body() body: { slot: AvatarSlotType }) {
    return this.avatarService.unequipItem(req.user.id, body.slot);
  }

  /*
  ─────────────────────────────
  Cambiar skin
  ─────────────────────────────
  */
  @Patch('skin')
  async updateSkinColor(@Req() req, @Body() body: { skinColor: number }) {
    return this.avatarService.updateSkinColor(req.user.id, body.skinColor);
  }
}
