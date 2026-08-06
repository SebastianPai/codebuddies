export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. Set it in apps/api/.env`,
    );
  }
  return value;
}

export const JWT_SECRET = requireEnv('JWT_SECRET');
