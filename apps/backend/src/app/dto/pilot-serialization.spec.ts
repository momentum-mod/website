import { instanceToPlain } from 'class-transformer';
import { Ban, STEAM_MISSING_AVATAR, steamAvatarUrl } from '@momentum/constants';
import { DtoFactory } from './functions';
import { MapDto } from './map/map.dto';
import {
  RunSessionSerializerSchema,
  serializeMapImage,
  serializeWsResponse,
  UserQuerySchema,
  UserSerializerSchema
} from './pilot-serialization';
import { UserDto } from './user/user.dto';

describe('Zod serialization pilot', () => {
  const date = new Date('2024-01-02T03:04:05.000Z');
  const user = {
    id: 1,
    steamID: 76561198000000000n,
    alias: 'A user',
    avatar: 'avatar-hash',
    country: null,
    roles: 0,
    bans: 0,
    createdAt: date,
    privateField: 'must not escape'
  };

  it('matches the legacy user response and strips source-only fields', () => {
    const result = UserSerializerSchema.parse(user);
    const { privateField: _privateField, ...source } = user;
    const legacy = JSON.parse(
      JSON.stringify(
        instanceToPlain(DtoFactory(UserDto, source)),
        (_, value) => (typeof value === 'bigint' ? value.toString() : value)
      )
    );

    expect(result).toEqual(legacy);
    expect(result).not.toHaveProperty('avatar');
    expect(result).not.toHaveProperty('privateField');
    expect(result.steamID).toBe('76561198000000000');
    expect(result.createdAt).toBe(date.toISOString());
  });

  it('uses the missing avatar for banned and placeholder users', () => {
    expect(
      UserSerializerSchema.parse({ ...user, bans: Ban.AVATAR }).avatarURL
    ).toBe(steamAvatarUrl(STEAM_MISSING_AVATAR));
    const placeholder = UserSerializerSchema.parse({
      ...user,
      avatar: null,
      steamID: null
    });
    expect(placeholder.avatarURL).toBe(steamAvatarUrl(STEAM_MISSING_AVATAR));
    expect(placeholder.steamID).toBeNull();
  });

  it('serializes expanded stats and rejects unsafe bigints', () => {
    const userStats = {
      userID: 1,
      cosXP: 42n,
      level: 2,
      mapsCompleted: 3,
      runsSubmitted: 4,
      totalJumps: 5n,
      totalStrafes: 6n
    };
    expect(
      UserSerializerSchema.parse({ ...user, userStats }).userStats
    ).toEqual({
      cosXP: 42,
      level: 2,
      mapsCompleted: 3,
      runsSubmitted: 4,
      totalJumps: 5,
      totalStrafes: 6
    });
    expect(() =>
      UserSerializerSchema.parse({
        ...user,
        userStats: { ...userStats, totalJumps: 9007199254740992n }
      })
    ).toThrow('safe integer');
  });

  it('validates user query expansions and rejects unexpected query keys', () => {
    expect(
      UserQuerySchema.parse({ expand: 'profile,userStats,unknown' })
    ).toEqual({
      expand: ['profile', 'userStats']
    });
    expect(() => UserQuerySchema.parse({ extra: 'unexpected' })).toThrow();
  });

  it('serializes nested map images and users without a second image transform', () => {
    const id = '0b2e14d4-c18b-4ac9-af72-6581936be64b';
    const map = DtoFactory(MapDto, { images: [id], submitter: user });
    const response = instanceToPlain(map);

    expect(response.images).toEqual([serializeMapImage(id)]);
    expect(response.thumbnail).toEqual(serializeMapImage(id));
    expect(response.submitter).toEqual(UserSerializerSchema.parse(user));
  });

  it('serializes WebSocket dates and preserves error envelopes', () => {
    const session = {
      id: 1,
      userID: 2,
      mapID: 3,
      gamemode: 1,
      trackType: 0,
      trackNum: 1,
      createdAt: date,
      timestamps: [{ majorNum: 1, minorNum: 1, time: 0, createdAt: date }]
    };
    expect(
      serializeWsResponse(
        RunSessionSerializerSchema,
        'runsession.create',
        session
      )
    ).toEqual({
      event: 'runsession.create',
      data: {
        ...session,
        createdAt: date.toISOString(),
        timestamps: [
          { majorNum: 1, minorNum: 1, time: 0, createdAt: date.toISOString() }
        ]
      }
    });
    expect(
      serializeWsResponse(RunSessionSerializerSchema, 'runsession.create', {
        error: 'Unavailable'
      })
    ).toEqual({ event: 'runsession.create', data: { error: 'Unavailable' } });
  });
});
