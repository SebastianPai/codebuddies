import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface AuthUser {
  userId: string;
  email?: string;
  role?: string;
  username?: string;
}

// Reemplaza el `type AuthRequest = { user: {...} }` + `@Req() req: AuthRequest`
// que se repetía en cada controller: @CurrentUser() entrega directamente
// req.user tipado, poblado por JwtStrategy.validate().
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    return ctx.switchToHttp().getRequest().user;
  },
);
