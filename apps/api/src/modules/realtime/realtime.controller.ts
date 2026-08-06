import {
  Controller,
  ForbiddenException,
  Post,
  Query,
  Sse,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RealtimeService } from './realtime.service';
import { JWT_SECRET } from '../../config/env';

@Controller('realtime')
export class RealtimeController {
  constructor(
    private readonly jwtService: JwtService,
    private readonly realtimeService: RealtimeService,
  ) {}

  private verifyToken(token: string): { sub?: string; userId?: string } {
    try {
      return this.jwtService.verify(token, { secret: JWT_SECRET });
    } catch {
      throw new ForbiddenException('Token inválido o expirado');
    }
  }

  @Sse('events')
  events(@Query('token') token?: string, @Query('sessionId') sessionId?: string) {
    if (!token) throw new ForbiddenException();

    const payload = this.verifyToken(token);
    const userId = payload.sub || payload.userId;
    if (!userId) throw new ForbiddenException();

    return this.realtimeService.connect(userId, sessionId || 'default');
  }

  @Post('offline')
  offline(@Query('token') token?: string, @Query('sessionId') sessionId?: string) {
    if (!token) throw new ForbiddenException();

    const payload = this.verifyToken(token);
    const userId = payload.sub || payload.userId;
    if (!userId) throw new ForbiddenException();

    this.realtimeService.forceOffline(userId, sessionId);
    return { ok: true };
  }
}
