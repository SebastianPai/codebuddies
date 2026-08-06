import { Role } from '@prisma/client';

// Forma de req.user tal como la deja JwtStrategy#validate — usarla en los
// `@Req()` de rutas protegidas evita que `req` quede tipado `any` (y con
// eso, los `no-unsafe-member-access` de ESLint en cada `req.user.algo`).
export interface AuthenticatedRequest {
  user: {
    userId: string;
    email: string;
    role: Role;
    username: string;
  };
}

// Para rutas con OptionalJwtAuthGuard, donde `user` puede ser null/undefined.
export interface OptionallyAuthenticatedRequest {
  user?: AuthenticatedRequest['user'];
}
