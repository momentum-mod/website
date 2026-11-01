import { type } from 'arktype';

export const UserResponseSchema = type({
  id: 'number.integer',
  steamID: 'string | null',
  alias: 'string',
  avatarURL: 'string',
  country: 'string | null',
  roles: 'number.integer',
  bans: 'number.integer',
  createdAt: 'string.date.iso',
  'profile?': type({
    userID: 'number.integer',
    bio: 'string',
    socials: 'object | null',
    '+': 'delete'
  }).or('null'),
  'userStats?': type({
    cosXP: 'number.integer',
    level: 'number.integer',
    mapsCompleted: 'number.integer',
    runsSubmitted: 'number.integer',
    totalJumps: 'number.integer',
    totalStrafes: 'number.integer',
    '+': 'delete'
  }).or('null'),
  'chatBans?': type({
    type: 'number.integer',
    expiresAt: 'string.date.iso | null',
    reason: 'string | null',
    '+': 'delete'
  }).array(),
  '+': 'delete'
});

export type UserResponse = typeof UserResponseSchema.infer;
