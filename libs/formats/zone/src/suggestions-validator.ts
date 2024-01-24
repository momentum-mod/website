import {
  GamemodeName,
  IncompatibleGamemodes,
  MapReviewSuggestion,
  MapSubmissionSuggestion,
  MapZones,
  TrackType as TT,
  TrackType,
  TrackTypeName as TTName
} from '@momentum/constants';
import { deepEquals } from '@momentum/util-fn';

export enum SuggestionType {
  SUBMISSION,
  REVIEW
}

export class SuggestionValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SuggestionValidationError';
  }
}

export function validateSuggestions(
  suggestions: MapSubmissionSuggestion[] | MapReviewSuggestion[],
  zoneData: MapZones,
  type: SuggestionType
) {
  let hasMainTrack = false;
  for (const sugg of suggestions) {
    const { trackType: tt, trackNum: tn, gamemode: gm } = sugg;
    for (const sugg2 of suggestions) {
      const { trackType: tt2, trackNum: tn2, gamemode: gm2 } = sugg2;
      if (tt === tt2 && tn === tn2) {
        if (gm === gm2) {
          // Don't allow anything with same TT, TN and GM
          if (deepEquals(sugg, sugg2)) {
            continue;
          } else {
            throw new SuggestionValidationError(
              `Duplicate suggestion for gamemode ${GamemodeName.get(gm)}, ` +
                `trackType ${TTName.get(tt)}, ` +
                `trackNum ${tn}`
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
              `trackType: ${TTName.get(tt)}, ` +
              `trackNum: ${tn}`
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
        'Suggestions should not include track stages'
      );
    }
  }

  if (type === SuggestionType.SUBMISSION) {
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

  suggestions
    .filter(({ trackType }) => trackType === TrackType.BONUS)
    .forEach(({ trackNum }, i) => {
      if (!zoneData.tracks.bonuses[trackNum]) {
        throw new SuggestionValidationError(
          `Suggestion refers to bonus track (${trackNum}) that does not exist`
        );
      }
    });
}
