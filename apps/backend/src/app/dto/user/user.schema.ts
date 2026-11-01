import { type } from 'arktype';
import {
  Ban,
  STEAM_MISSING_AVATAR,
  steamAvatarUrl,
  UserResponseSchema
} from '@momentum/constants';
import { InternalServerErrorException } from '@nestjs/common';

const DateToString = type('Date | string.date.iso').pipe((value) =>
  value instanceof Date ? value.toISOString() : value
);

const SafeInteger = type('bigint | number.integer').pipe((value) => {
  const result = Number(value);
  if (!Number.isSafeInteger(result)) {
    throw new InternalServerErrorException(
      'Tried to convert a BigInt to a number outside the safe integer range'
    );
  }
  return result;
});

const UserSourceSchema = type({
  id: 'number.integer',
  steamID: 'bigint | string | null',
  alias: 'string',
  avatar: 'string | null',
  country: 'string | null',
  roles: 'number.integer',
  bans: 'number.integer',
  createdAt: DateToString,
  'profile?': type({
    userID: 'number.integer',
    bio: 'string',
    socials: 'object | null',
    '+': 'delete'
  }).or('null'),
  'userStats?': type({
    cosXP: SafeInteger,
    level: 'number.integer',
    mapsCompleted: 'number.integer',
    runsSubmitted: 'number.integer',
    totalJumps: SafeInteger,
    totalStrafes: SafeInteger,
    '+': 'delete'
  }).or('null'),
  'chatBans?': type({
    type: 'number.integer',
    expiresAt: DateToString.or('null'),
    reason: 'string | null',
    '+': 'delete'
  }).array(),
  '+': 'delete'
});

export const UserSerializerSchema = UserSourceSchema.pipe(
  ({ avatar, steamID, ...user }) => ({
    ...user,
    steamID: steamID === null ? null : String(steamID),
    avatarURL: steamAvatarUrl(
      (user.bans & Ban.AVATAR) !== 0 || !avatar ? STEAM_MISSING_AVATAR : avatar
    )
  }),
  UserResponseSchema
);

export const UserQuerySchema = type({
  'expand?': type('string').pipe((value) =>
    value.split(',').filter((item) => ['profile', 'userStats'].includes(item))
  ),
  '+': 'reject'
});

export type UserQuery = typeof UserQuerySchema.infer;
