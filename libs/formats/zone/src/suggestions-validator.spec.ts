import {
  Gamemode,
  IncompatibleGamemodes,
  MapSubmissionSuggestion,
  TrackType as TT
} from '@momentum/constants';
import { ZonesStub } from './zones.stub';
import { validateSuggestions } from './';

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

  const validSuggestions: MapSubmissionSuggestion[] = [
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

  it('should not throw for valid suggestions', () => {
    expect(() => validateSuggestions(validSuggestions, zones)).not.toThrow();
  });

  it('should throw for if missing a bonus track and given zones with a bonus', () => {
    expect(() => validateSuggestions([validSuggestions[0]], zones)).toThrow(
      'Bonus track 1 has no suggestions'
    );
  });

  it('should throw for if a suggested bonus does not correspond to zone', () => {
    expect(() =>
      validateSuggestions(
        [
          ...validSuggestions,
          {
            trackType: TT.BONUS,
            trackNum: 1,
            gamemode: Gamemode.BHOP,
            tier: 1,
            comment: 'This track doesnt exist',
            ranked: true
          }
        ],
        zones
      )
    ).toThrow('Suggestion refers to bonus track (1) that does not exist');
  });

  it('should throw for duplicate suggestions', () => {
    expect(() =>
      validateSuggestions(
        [...validSuggestions, { ...validSuggestions[0], comment: 'elephants' }],
        zones
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
        zones
      )
    ).toThrow('Missing main track');
  });

  it('should throw for multiple main tracks', () => {
    expect(() =>
      validateSuggestions(
        [
          ...validSuggestions,
          {
            trackType: TT.MAIN,
            trackNum: 1,
            gamemode: Gamemode.AHOP,
            tier: 2,
            comment: 'someComment',
            ranked: true
          }
        ],
        zones
      )
    ).toThrow('Multiple main tracks');
  });

  it('should throw error for stages in suggestions', () => {
    expect(() =>
      validateSuggestions(
        [
          ...validSuggestions,
          {
            trackType: TT.STAGE,
            trackNum: 0,
            gamemode: Gamemode.AHOP,
            tier: 1,
            comment: 'someComment',
            ranked: true
          }
        ],
        zones
      )
    ).toThrow('Suggestions should not include track stages');
  });

  it('should throw if given incompatible gamemode suggestions', () => {
    expect(() =>
      validateSuggestions(
        [
          ...validSuggestions,
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
        zones
      )
    ).toThrow(
      'Incompatible gamemodes Ahop and Bhop on trackType: Main, trackNum: 0'
    );
  });

  it('should not if given compatible gamemode suggestions', () => {
    expect(() =>
      validateSuggestions(
        [
          ...validSuggestions,
          {
            trackType: TT.MAIN,
            trackNum: 0,
            gamemode: Gamemode.SURF,
            tier: 1,
            comment: 'someComment',
            ranked: true
          }
        ],
        zones
      )
    ).not.toThrow();
  });
});
