import {
  Ban,
  imgLargePath,
  imgMediumPath,
  imgSmallPath,
  imgXlPath,
  MapImageSchema,
  STEAM_MISSING_AVATAR,
  steamAvatarUrl,
  UserResponseSchema
} from '@momentum/constants';
import { InternalServerErrorException } from '@nestjs/common';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { Config } from '../config';
import { intersection } from '@momentum/util-fn';

const DateToString = z
  .union([z.date(), z.iso.datetime()])
  .transform((value) => (value instanceof Date ? value.toISOString() : value));

const SafeInteger = z.union([z.bigint(), z.number()]).transform((value) => {
  const result = Number(value);
  if (!Number.isSafeInteger(result)) {
    throw new InternalServerErrorException(
      'Tried to convert a BigInt to a number outside the safe integer range'
    );
  }
  return result;
});

const UserSourceSchema = z.object({
  id: z.number().int(),
  steamID: z.union([z.bigint(), z.string()]).nullable(),
  alias: z.string(),
  avatar: z.string().nullable(),
  country: z.string().nullable(),
  roles: z.number().int(),
  bans: z.number().int(),
  createdAt: DateToString,
  profile: z
    .object({
      userID: z.number().int(),
      bio: z.string(),
      socials: z.record(z.string(), z.unknown()).nullable()
    })
    .nullable()
    .optional(),
  userStats: z
    .object({
      cosXP: SafeInteger,
      level: z.number().int(),
      mapsCompleted: z.number().int(),
      runsSubmitted: z.number().int(),
      totalJumps: SafeInteger,
      totalStrafes: SafeInteger
    })
    .nullable()
    .optional(),
  chatBans: z
    .array(
      z.object({
        type: z.number().int(),
        expiresAt: DateToString.nullable(),
        reason: z.string().nullable()
      })
    )
    .optional()
});

export const UserSerializerSchema = UserSourceSchema.transform(
  ({ avatar, steamID, ...user }) =>
    UserResponseSchema.parse({
      ...user,
      steamID: steamID === null ? null : String(steamID),
      avatarURL: steamAvatarUrl(
        (user.bans & Ban.AVATAR) !== 0 || !avatar
          ? STEAM_MISSING_AVATAR
          : avatar
      )
    })
);

export const UserQuerySchema = z.strictObject({
  expand: z
    .string()
    .transform((value) =>
      intersection(value.split(','), ['profile', 'userStats'])
    )
    .optional()
});

export type UserQuery = z.output<typeof UserQuerySchema>;

export class UserResponseDto extends createZodDto(UserResponseSchema) {}
export class MapImageResponseDto extends createZodDto(MapImageSchema) {}

export const RunSessionSerializerSchema = z.object({
  id: z.number().int(),
  userID: z.number().int(),
  mapID: z.number().int(),
  gamemode: z.number().int(),
  trackType: z.number().int(),
  trackNum: z.number().int(),
  createdAt: DateToString,
  timestamps: z.array(
    z.object({
      majorNum: z.number().int(),
      minorNum: z.number().int(),
      time: z.number(),
      createdAt: DateToString
    })
  )
});

export function serializeWsResponse<S extends z.ZodType>(
  schema: S,
  event: string,
  data: z.input<S> | { error: string }
): { event: string; data: z.output<S> | { error: string } } {
  return {
    event,
    data:
      typeof data === 'object' &&
      data !== null &&
      'error' in data &&
      typeof data.error === 'string'
        ? { error: data.error }
        : schema.parse(data)
  };
}

export function serializeMapImage(image: string | { id: string }) {
  const id = typeof image === 'string' ? image : image.id;
  const cdn = Config.url.cdn;
  return MapImageSchema.parse({
    id,
    small: `${cdn}/${imgSmallPath(id)}`,
    medium: `${cdn}/${imgMediumPath(id)}`,
    large: `${cdn}/${imgLargePath(id)}`,
    xl: `${cdn}/${imgXlPath(id)}`
  });
}
