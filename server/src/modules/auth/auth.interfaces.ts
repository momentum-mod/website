import { JwtPayload } from 'jsonwebtoken';

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
    steamID: string;
    gameAuth: boolean;
}

export type UserJwtPayloadVerified = UserJwtPayload & JwtPayload;
export type UserJwtAccessPayloadVerified = UserJwtAccessPayload & JwtPayload;
