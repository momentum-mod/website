import {
  IncompatibleGamemodes,
  MapSubmissionSuggestion,
  GamemodeName,
  MapZones,
  TrackType as TT,
  TrackType,
  TrackTypeName as TTName
} from '@momentum/constants';

export class SuggestionValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SuggestionValidationError';
  }
}

export function validateSuggestions(
  suggestions: MapSubmissionSuggestion[],
  zoneData: MapZones
) {
  let hasMainTrack = false;
  for (const {
    trackType: tt,
    trackNum: tn,
    gamemode: gm,
    tier,
    comment,
    ranked
  } of suggestions) {
    for (const {
      trackType: tt2,
      trackNum: tn2,
      gamemode: gm2,
      tier: tier2,
      comment: comment2,
      ranked: ranked2
    } of suggestions) {
      if (tt === tt2 && tn === tn2) {
        if (gm === gm2) {
          // Don't allow anything with same TT, TN and GM
          if (tier === tier2 && comment === comment2 && ranked === ranked2) {
            continue;
          } else {
            throw new SuggestionValidationError(
              `Duplicate suggestion for gamemode ${GamemodeName.get(gm)}, ` +
                `trackType ${TTName.get(tt)}, ` +
                `trackNum ${tn}`
            );
          }
        }

        if (IncompatibleGamemodes.get(gm).includes(gm2)) {
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

  if (!hasMainTrack) throw new SuggestionValidationError('Missing main track');

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
