import { User } from '@prisma/client';
import { JwtPayload } from 'jsonwebtoken';

declare module 'fastify' {
  interface FastifyRequest {
    user: AuthenticatedUser;
  }
}

export type AuthenticatedUser = Pick<User, 'id' | 'steamID'>;

/**
 * Simplest payload, used for refresh tokens
 */
export interface UserJwtPayload {
  id: number;
}

/**
 * Access tokens also stores SteamID and if it's an ingame auth
 */
export interface UserJwtAccessPayload extends UserJwtPayload {
  steamID: bigint;
  gameAuth: boolean;
}

export type UserJwtPayloadVerified = UserJwtPayload & JwtPayload;
export type UserJwtAccessPayloadVerified = UserJwtAccessPayload & JwtPayload;
