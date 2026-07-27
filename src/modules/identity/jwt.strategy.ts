import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { JWT_SECRET } from '../../config/env';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (req) => req?.cookies?.access_token,
      ]),
      secretOrKey: JWT_SECRET,
    });
  }

  async validate(payload: any) {
    return {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
      username: payload.username,
    };
  }
}
