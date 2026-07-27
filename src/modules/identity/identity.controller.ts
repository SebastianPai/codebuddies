import {
  Controller,
  Post,
  Patch,
  Body,
  Req,
  Get,
  UseGuards,
  Res,
} from '@nestjs/common';
import { IdentityService } from './identity.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from './guards/jwt.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import type express from 'express'; // sólo se usa como tipo; 'express' no es una dependencia instalada

@Controller('identity')
export class IdentityController {
  constructor(private readonly identityService: IdentityService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.identityService.register(dto);
  }

  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: express.Response,
  ) {
    const authResponse = await this.identityService.login(dto);

    res.cookie('access_token', authResponse.access_token, {
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      path: '/',
      maxAge: 1000 * 60 * 60 * 24, // 1 día
    });

    // El JWT también viaja en el body de la respuesta (authResponse.access_token) para que
    // el frontend lo guarde en localStorage cuando lo necesite fuera de este origen —
    // no se expone una segunda cookie legible por JS sólo para ese propósito.
    return authResponse;
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getProfile(@Req() req: { user: { userId: string } }) {
    return this.identityService.getProfile(req.user.userId);
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  updateProfile(
    @Req() req: { user: { userId: string } },
    @Body() dto: UpdateProfileDto,
  ) {
    return this.identityService.updateProfile(req.user.userId, dto);
  }

  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  getAdminStuff() {
    return { secret: 'solo admins' };
  }
}
