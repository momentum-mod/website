import {
  Gamemode,
  GamemodeName,
  IncompatibleGamemodes,
  LeaderboardType,
  MapReviewSuggestion,
  MapSubmissionApproval,
  MapSubmissionSuggestion,
  MapZones,
  TrackType as TT,
  TrackType,
  TrackTypeName as TTName
} from '@momentum/constants';
import { arrayFrom } from '@momentum/util-fn';

export enum SuggestionType {
  SUBMISSION,
  APPROVAL,
  REVIEW
}

export class SuggestionValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SuggestionValidationError';
  }
}

function leaderboardName(
  trackType: TrackType,
  trackNum: number,
  gamemode?: Gamemode
) {
  let str = gamemode != null ? `${GamemodeName.get(gamemode)} ` : '';
  str += TTName.get(trackType).toLowerCase();
  str += trackType === TrackType.MAIN ? ' track' : ` ${trackNum + 1}`;
  return str;
}

/**
 * Validates either
 *  - the map submitter's suggestions
 *  - a map review's suggestions
 *  - an approvers final leaderboards
 *
 *  We run this on both the front and backend so contains some manual validation
 *  that we'd usually do with a validator library on the backend.
 */
export function validateSuggestions(
  suggestions:
    | MapSubmissionSuggestion[]
    | MapSubmissionApproval[]
    | MapReviewSuggestion[],
  zoneData: MapZones,
  type: SuggestionType
) {
  let hasMainTrack = false;
  for (const sugg of suggestions) {
    const { trackType: tt, trackNum: tn, gamemode: gm, tier } = sugg;
    for (const sugg2 of suggestions) {
      const { trackType: tt2, trackNum: tn2, gamemode: gm2 } = sugg2;
      if (tt === tt2 && tn === tn2) {
        if (gm === gm2) {
          // Don't allow anything with same TT, TN and GM.

          // This is an Object, we're doing a rare
          // object reference == object reference check.
          if (sugg === sugg2) {
            continue;
          } else {
            throw new SuggestionValidationError(
              `Duplicate suggestion for ${leaderboardName(tt, tn, gm)}`
            );
          }
        }

        // Throw for any tracks that are *mutually incompatible* e.g. surf and
        // bhop. This *won't* throw for something only incomp. one way - without
        // a "primary mode" or similar would can't distinguish between say, a
        // surf map playable in defrag (which is compat) vs a defrag map
        // playable in surf (incomp since may as well play in bhop instead).
        // So this check is quite weak, but not the end of the world as a
        // reviewer can just ignore/reject stupid suggestions.
        if (
          IncompatibleGamemodes.get(gm).includes(gm2) &&
          IncompatibleGamemodes.get(gm2).includes(gm)
        ) {
          throw new SuggestionValidationError(
            'Incompatible gamemodes ' +
              `${GamemodeName.get(gm)} and ${GamemodeName.get(gm2)} on ` +
              leaderboardName(tt, tn)
          );
        }
      }
    }

    // Must have one and only one main track (in at least one gamemode)
    if (tt === TT.MAIN) {
      if (tn === 0) {
        hasMainTrack = true;
      } else {
        throw new SuggestionValidationError('Multiple main tracks');
      }
    }

    // Stages have no important user-submitted data and tedious for them to
    // create in frontend, so we may as well automatically generate them.
    if (tt === TT.STAGE) {
      throw new SuggestionValidationError(
        'Suggestions should not include stage tracks'
      );
    }

    // class-validator on backend will handle some annoying stuff like
    // IsInt, as well as missing properties.
    if ('tier' in sugg) {
      if (
        type === SuggestionType.APPROVAL &&
        (sugg as MapSubmissionApproval).type === LeaderboardType.HIDDEN
      ) {
        if (tier != null) {
          throw new SuggestionValidationError(
            `Hidden leaderboard ${leaderboardName(tt, tn, gm)} has a tier`
          );
        }
      } else if (!tier || tier <= 0 || tier > 10) {
        throw new SuggestionValidationError(
          `Invalid tier ${tier} for ${leaderboardName(tt, tn, gm)}`
        );
      }
    }

    if (
      'gameplayRating' in sugg &&
      // Buggy rule, destructuring above isn't type-safe.
      /* eslint-disable  unicorn/consistent-destructuring */
      sugg.gameplayRating != null &&
      (sugg.gameplayRating <= 0 || sugg.gameplayRating > 10)
    ) {
      throw new SuggestionValidationError(
        `Invalid gameplay rating ${sugg.gameplayRating} for ${leaderboardName(
          tt,
          tn,
          gm
        )}`
      );
    }

    if ('type' in sugg) {
      const validLeaderboardTypes = [
        LeaderboardType.UNRANKED,
        LeaderboardType.RANKED
      ];
      if (type === SuggestionType.APPROVAL)
        validLeaderboardTypes.push(LeaderboardType.HIDDEN);

      if (!validLeaderboardTypes.includes(sugg.type))
        throw new SuggestionValidationError(
          `Invalid leaderboard type ${
            LeaderboardType[sugg.type]
          } for ${leaderboardName(tt, tn, gm)} ${sugg.type}`
        );
    }
  }

  if (type === SuggestionType.SUBMISSION || type === SuggestionType.APPROVAL) {
    if (!hasMainTrack)
      throw new SuggestionValidationError('Missing main track');

    // Zone and suggestions must have main tracks per their respective validators,
    // and we don't do suggestions for stages, so all that's left is to check that
    // all bonus tracks have suggestions:
    for (let i = 0; i < zoneData.tracks.bonuses.length; i++) {
      if (
        !suggestions.some(
          ({ trackType, trackNum }) => trackType === TT.BONUS && trackNum === i
        )
      ) {
        throw new SuggestionValidationError(
          `Bonus track ${i + 1} has no suggestions`
        );
      }
    }
  }

  if (type === SuggestionType.APPROVAL) {
    [
      [TrackType.MAIN, 0],
      ...arrayFrom(zoneData.tracks.bonuses.length, (i) => [TrackType.BONUS, i])
    ].forEach(([trackType, trackNum]) => {
      if (
        !suggestions.some(
          (sugg: MapSubmissionApproval) =>
            sugg.trackType === trackType &&
            sugg.trackNum === trackNum &&
            (sugg.type === LeaderboardType.UNRANKED ||
              sugg.type === LeaderboardType.RANKED)
        )
      )
        throw new SuggestionValidationError(
          `Missing non-hidden leaderboards for ${leaderboardName(
            trackType,
            trackNum
          )}`
        );
    });
  }

  suggestions
    .filter(({ trackType }) => trackType === TrackType.BONUS)
    .forEach(({ trackNum }) => {
      if (!zoneData.tracks.bonuses[trackNum]) {
        throw new SuggestionValidationError(
          `Suggestion refers to bonus track (${
            trackNum + 1
          }) that does not exist`
        );
      }
    });
}
