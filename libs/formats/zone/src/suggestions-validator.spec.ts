import {
  Gamemode,
  IncompatibleGamemodes,
  MapReviewSuggestion,
  MapSubmissionSuggestion,
  TrackType as TT
} from '@momentum/constants';
import { ZonesStub } from './zones.stub';
import { SuggestionType, validateSuggestions } from './';

describe('validateSuggestions', () => {
  // Has a bonus
  const zones = ZonesStub;

  jest.spyOn(IncompatibleGamemodes, 'get').mockImplementation((key) =>
    // Ahop and Bhop mutually imcompatible, Ahop also incompatible with Surf,
    // nothing else is incompatible
    {
      if (key === Gamemode.AHOP) return [Gamemode.BHOP, Gamemode.SURF];
      else if (key === Gamemode.BHOP) return [Gamemode.AHOP];
      else return [];
    }
  );

  const validSubmissionSuggestions: MapSubmissionSuggestion[] = [
    {
      trackType: TT.MAIN,
      trackNum: 0,
      gamemode: Gamemode.AHOP,
      tier: 1,
      comment: 'This track came to me in a dream',
      ranked: true
    },
    {
      trackType: TT.BONUS,
      trackNum: 0,
      gamemode: Gamemode.AHOP,
      tier: 1,
      comment: 'This track sucks',
      ranked: true
    }
  ];

  const validReviewSuggestions: MapReviewSuggestion[] = [
    {
      trackType: TT.MAIN,
      trackNum: 0,
      gamemode: Gamemode.AHOP,
      tier: 1,
      gameplayRating: 0
    },
    {
      trackType: TT.BONUS,
      trackNum: 0,
      gamemode: Gamemode.AHOP,
      tier: 1,
      gameplayRating: 10
    }
  ];

  it('should not throw for valid suggestions', () => {
    expect(() =>
      validateSuggestions(
        validSubmissionSuggestions,
        zones,
        SuggestionType.SUBMISSION
      )
    ).not.toThrow();
    expect(() =>
      validateSuggestions(validReviewSuggestions, zones, SuggestionType.REVIEW)
    ).not.toThrow();
  });

  it('should throw for if missing a bonus track and given zones with a bonus', () => {
    expect(() =>
      validateSuggestions(
        [validSubmissionSuggestions[0]],
        zones,
        SuggestionType.SUBMISSION
      )
    ).toThrow('Bonus track 1 has no suggestions');

    expect(() =>
      validateSuggestions(
        [validReviewSuggestions[0]],
        zones,
        SuggestionType.REVIEW
      )
    ).not.toThrow();
  });

  it('should throw for if a suggested bonus does not correspond to zone', () => {
    expect(() =>
      validateSuggestions(
        [
          ...validSubmissionSuggestions,
          {
            trackType: TT.BONUS,
            trackNum: 1,
            gamemode: Gamemode.BHOP,
            tier: 1,
            comment: 'This track doesnt exist',
            ranked: true
          }
        ],
        zones,
        SuggestionType.SUBMISSION
      )
    ).toThrow('Suggestion refers to bonus track (1) that does not exist');

    expect(() =>
      validateSuggestions(
        [
          ...validReviewSuggestions,
          {
            trackType: TT.BONUS,
            trackNum: 1,
            gamemode: Gamemode.BHOP,
            gameplayRating: 5
          }
        ],
        zones,
        SuggestionType.REVIEW
      )
    ).toThrow('Suggestion refers to bonus track (1) that does not exist');
  });

  it('should throw for duplicate suggestions', () => {
    expect(() =>
      validateSuggestions(
        [
          ...validSubmissionSuggestions,
          { ...validSubmissionSuggestions[0], comment: 'elephants' }
        ],
        zones,
        SuggestionType.SUBMISSION
      )
    ).toThrow(
      'Duplicate suggestion for gamemode Ahop, trackType Main, trackNum 0'
    );

    expect(() =>
      validateSuggestions(
        [
          ...validReviewSuggestions,
          { ...validReviewSuggestions[0], gameplayRating: 1 }
        ],
        zones,
        SuggestionType.REVIEW
      )
    ).toThrow(
      'Duplicate suggestion for gamemode Ahop, trackType Main, trackNum 0'
    );
  });

  it('should throw for missing main track', () => {
    expect(() =>
      validateSuggestions(
        [
          {
            trackType: TT.BONUS,
            trackNum: 0,
            gamemode: Gamemode.AHOP,
            tier: 1,
            comment: 'someComment',
            ranked: true
          }
        ],
        zones,
        SuggestionType.SUBMISSION
      )
    ).toThrow('Missing main track');

    expect(() =>
      validateSuggestions(
        [
          {
            trackType: TT.BONUS,
            trackNum: 0,
            gamemode: Gamemode.AHOP,
            tier: 1,
            gameplayRating: 0
          }
        ],
        zones,
        SuggestionType.REVIEW
      )
    ).not.toThrow();
  });

  it('should throw for multiple main tracks', () => {
    expect(() =>
      validateSuggestions(
        [
          ...validSubmissionSuggestions,
          {
            trackType: TT.MAIN,
            trackNum: 1,
            gamemode: Gamemode.AHOP,
            tier: 2,
            comment: 'someComment',
            ranked: true
          }
        ],
        zones,
        SuggestionType.SUBMISSION
      )
    ).toThrow('Multiple main tracks');

    expect(() =>
      validateSuggestions(
        [
          ...validSubmissionSuggestions,
          {
            trackType: TT.MAIN,
            trackNum: 1,
            gamemode: Gamemode.AHOP,
            tier: 2
          }
        ],
        zones,
        SuggestionType.REVIEW
      )
    ).toThrow('Multiple main tracks');
  });

  it('should throw error for stages in suggestions', () => {
    expect(() =>
      validateSuggestions(
        [
          ...validSubmissionSuggestions,
          {
            trackType: TT.STAGE,
            trackNum: 0,
            gamemode: Gamemode.AHOP,
            tier: 1,
            comment: 'someComment',
            ranked: true
          }
        ],
        zones,
        SuggestionType.SUBMISSION
      )
    ).toThrow('Suggestions should not include track stages');

    expect(() =>
      validateSuggestions(
        [
          ...validSubmissionSuggestions,
          {
            trackType: TT.STAGE,
            trackNum: 0,
            gamemode: Gamemode.AHOP,
            tier: 1,
            gameplayRating: 6
          }
        ],
        zones,
        SuggestionType.REVIEW
      )
    ).toThrow('Suggestions should not include track stages');
  });

  it('should throw if given incompatible gamemode suggestions', () => {
    expect(() =>
      validateSuggestions(
        [
          ...validSubmissionSuggestions,
          {
            trackType: TT.MAIN,
            trackNum: 0,
            // validSuggestions has ahop, we mocked IncompatibleGamemodes.get to be incomp with bhop
            gamemode: Gamemode.BHOP,
            tier: 1,
            comment: 'someComment',
            ranked: true
          }
        ],
        zones,
        SuggestionType.SUBMISSION
      )
    ).toThrow(
      'Incompatible gamemodes Ahop and Bhop on trackType: Main, trackNum: 0'
    );

    expect(() =>
      validateSuggestions(
        [
          ...validSubmissionSuggestions,
          {
            trackType: TT.MAIN,
            trackNum: 0,
            // validSuggestions has ahop, we mocked IncompatibleGamemodes.get to be incomp with bhop
            gamemode: Gamemode.BHOP,
            tier: 1,
            gameplayRating: 4
          }
        ],
        zones,
        SuggestionType.REVIEW
      )
    ).toThrow(
      'Incompatible gamemodes Ahop and Bhop on trackType: Main, trackNum: 0'
    );
  });

  it('should not if given compatible gamemode suggestions', () => {
    expect(() =>
      validateSuggestions(
        [
          ...validSubmissionSuggestions,
          {
            trackType: TT.MAIN,
            trackNum: 0,
            gamemode: Gamemode.SURF,
            tier: 1,
            comment: 'someComment',
            ranked: true
          }
        ],
        zones,
        SuggestionType.SUBMISSION
      )
    ).not.toThrow();

    expect(() =>
      validateSuggestions(
        [
          ...validSubmissionSuggestions,
          {
            trackType: TT.MAIN,
            trackNum: 0,
            gamemode: Gamemode.SURF,
            tier: 1,
            gameplayRating: 7
          }
        ],
        zones,
        SuggestionType.REVIEW
      )
    ).not.toThrow();
  });
});
