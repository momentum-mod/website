/* eslint unused-imports/no-unused-vars: 0 */
/* eslint @typescript-eslint/naming-convention: 0 */

/**
 * Tests that a model type is assignable to a Prisma type, with some optional
 * mapping expressing how the model type is derived from the Prisma type.
 *
 * The goal here is to keep a strong connection between
 * - Prisma types, which represent how data is stored in SQL, and are
 *   used in backend code, and
 * - model types, which are used in the rest of this monorepo, and in Panorama.
 *
 * Prisma types are hideously complex and requires Prisma as a dependency, which
 * we want to avoid in Panorama. This file allows us to ensure that our models
 * are accurately derived from types representing what's stored in SQL, and
 * cause changes to the Prisma schema to cause type errors here.
 *
 * If you change the Prisma schema and there's a type error in this file, you
 * *NEED* to fix it! If you add new tables to the schema, you *MUST* add a
 * correspondence here!
 *
 * @param ModelType - Model Type (used in backend)
 * @param PrismaType - Prisma Type (used everywhere else)
 * @param Correspondence - Schema by which to remap matching keys to the given
 *                         type
 * @example
 * // Assert that User derives from PrismaUser.
 * // - `steamID` was a bigint but becomes a string, since when we serialize
 * //    bigints larger than `Number.MAX_SAFE_INTEGER` we stringify them.
 * // - `avatar` is transformed to avatarURL during DTO serialization, so we
 * //    omit entirely.
 * assertTypeCorrespondence<User, PrismaUser, { steamID: string; avatar: OmitMe }>();
 */
declare const assertTypeCorrespondence: <
  _ModelType extends TransformPrismaType<PrismaType, Correspondence>,
  PrismaType extends object,
  Correspondence extends Partial<Record<keyof PrismaType, unknown>> = object
>() => void;

//#region User

import { MapReviewSuggestion, User } from './models';
import { User as PUser } from '@prisma/client';
assertTypeCorrespondence<User, PUser, { steamID: string; avatar: OmitMe }>();

import { Profile } from './models';
import { Profile as PProfile } from '@prisma/client';
assertTypeCorrespondence<Profile, PProfile, { userID: OmitMe }>();

import { UserStats } from './models';
import { UserStats as PUserStats } from '@prisma/client';
assertTypeCorrespondence<
  UserStats,
  PUserStats,
  {
    totalJumps: number;
    totalStrafes: number;
    cosXP: number;
    userID: OmitMe;
  }
>();

import { Activity } from './models';
import { Activity as PActivity } from '@prisma/client';
assertTypeCorrespondence<
  Activity,
  PActivity,
  { userID: OmitMe; data: number }
>();

import { Notification } from './models';
import { Notification as PNotification } from '@prisma/client';
assertTypeCorrespondence<Notification, PNotification>();

import { Follow } from './models';
import { Follow as PFollow } from '@prisma/client';
assertTypeCorrespondence<Follow, PFollow>();

//#endregion
//#region Maps

import { MMap, MapImage } from './models';
import { MMap as PMap } from '@prisma/client';
assertTypeCorrespondence<MMap, PMap, { hasVmf: OmitMe; images: MapImage[] }>();

import { MapInfo } from './models';
import { MapInfo as PMapInfo } from '@prisma/client';
assertTypeCorrespondence<MapInfo, PMapInfo, { mapID: OmitMe }>();

import { MapCredit } from './models';
import { MapCredit as PMapCredit } from '@prisma/client';
assertTypeCorrespondence<MapCredit, PMapCredit>();

import { MapFavorite } from './models';
import { MapFavorite as PMapFavorite } from '@prisma/client';
assertTypeCorrespondence<MapFavorite, PMapFavorite>();

import { MapNotify } from './models';
import { MapNotify as PMapNotify } from '@prisma/client';
assertTypeCorrespondence<MapNotify, PMapNotify>();

import { MapReview } from './models';
import { MapReview as PMapReview } from '@prisma/client';
assertTypeCorrespondence<
  MapReview,
  PMapReview,
  { imageIDs: OmitMe; suggestions: MapReviewSuggestion[] }
>();

import { MapReviewComment } from './models';
import { MapReviewComment as PMapReviewComment } from '@prisma/client';
assertTypeCorrespondence<MapReviewComment, PMapReviewComment>();

import { MapStats } from './models';
import { MapStats as PMapStats } from '@prisma/client';
assertTypeCorrespondence<
  MapStats,
  PMapStats,
  { mapID: OmitMe; timePlayed: number }
>();

import { MapSubmission } from './models';
import { MapSubmission as PMapSubmission } from '@prisma/client';
assertTypeCorrespondence<
  MapSubmission,
  PMapSubmission,
  { mapID: OmitMe; currentVersionID: OmitMe }
>();

import { MapVersion } from './models';
import { MapVersion as PMapVersion } from '@prisma/client';
assertTypeCorrespondence<
  MapVersion,
  PMapVersion,
  { hasVmf: OmitMe; mapID: OmitMe }
>();

//#endregion
//#region Leaderboards and Runs

import { Leaderboard } from './models';
import { Leaderboard as PLeaderboard } from '@prisma/client';
assertTypeCorrespondence<Leaderboard, PLeaderboard, { mapID: OmitMe }>();

import { LeaderboardRun } from './models';
import { LeaderboardRun as PLeaderboardRun } from '@prisma/client';
assertTypeCorrespondence<
  LeaderboardRun,
  PLeaderboardRun,
  { pastRunID: number; splits: MakeOptional }
>();

import { PastRun } from './models';
import { PastRun as PPastRun } from '@prisma/client';
assertTypeCorrespondence<PastRun, PPastRun, { id: number }>();

import { RunSession } from './models';
import { RunSession as PRunSession } from '@prisma/client';
assertTypeCorrespondence<RunSession, PRunSession, { id: number }>();

import { RunSessionTimestamp } from './models';
import { RunSessionTimestamp as PRunSessionTimestamp } from '@prisma/client';
assertTypeCorrespondence<
  RunSessionTimestamp,
  PRunSessionTimestamp,
  { id: number; sessionID: number }
>();

//#endregion
//#region Utils

import { DateString } from '../../';
import { Prisma } from '@prisma/client';
type OmitMe = 'OmitMe' & never;
type MakeOptional = 'MakeOptional' & never;

/**
 * Utility type to express how a Prisma type can be transformed into
 * one of our models.
 *
 * It automatically transforms Date to DateString (as our DTOs do when
 * serializing) then takes a schema that remaps specific keys to new value
 * types. Set a value to `OmitMe` to exclude completely.
 */
// prettier-ignore
type TransformPrismaType<Obj extends object, Schema extends Partial<Record<keyof Obj, unknown>>> = {
  [K in keyof Obj as Schema[K] extends OmitMe ? never : K]:
    Schema[K] extends MakeOptional ?
      Schema[K] | undefined
        : Schema[K] extends NonNullable<unknown>
          ? Schema[K]
          // Replace Dates with DateString - when serialized out it's a ISO8061
          // string.
          : Obj[K] extends Date
            ? DateString
            // Hack to remove JsonValue, since we can't currently make our models
            // extend JsonObject. https://github.com/momentum-mod/website/issues/855
            : Obj[K] extends Prisma.JsonValue
              ? any
              : Obj[K];
};

//#endregion
