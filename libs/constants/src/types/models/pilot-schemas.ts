import { z } from 'zod';

/**
 * Public JSON shapes used by the serialization pilot. These schemas describe
 * the wire format, not Prisma's Date, bigint, or relation types.
 */
export const MapImageSchema = z.object({
  id: z.string().describe('Image ID'),
  small: z.string().describe('URL to the 480x360 JPEG image'),
  medium: z.string().describe('URL to the 1280x720 JPEG image'),
  large: z.string().describe('URL to the 1920x1080 JPEG image'),
  xl: z.string().describe('URL to the 2560x1440 JPEG image')
});

export type MapImage = z.infer<typeof MapImageSchema>;

export const UserResponseSchema = z.object({
  id: z.number().int().describe('The unique numeric ID of the user'),
  steamID: z
    .string()
    .nullable()
    .describe('Steam community ID, or null for a placeholder'),
  alias: z.string().describe("The user's current alias"),
  avatarURL: z.string().describe("The user's Steam avatar URL"),
  country: z.string().nullable().describe('Two-letter ISO country code'),
  roles: z.number().int().describe("Flags of the user's roles"),
  bans: z.number().int().describe("Flags of the user's bans"),
  createdAt: z.iso.datetime().describe('When the user was created'),
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
      cosXP: z.number().int(),
      level: z.number().int(),
      mapsCompleted: z.number().int(),
      runsSubmitted: z.number().int(),
      totalJumps: z.number().int(),
      totalStrafes: z.number().int()
    })
    .nullable()
    .optional(),
  chatBans: z
    .array(
      z.object({
        type: z.number().int(),
        expiresAt: z.iso.datetime().nullable(),
        reason: z.string().nullable()
      })
    )
    .optional()
});

export type UserResponse = z.infer<typeof UserResponseSchema>;
