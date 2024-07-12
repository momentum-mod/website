import {
  Gamemode,
  IncompatibleGamemodes,
  LeaderboardType,
  MapReviewSuggestion,
  MapSubmissionApproval,
  MapSubmissionSuggestion,
  TrackType,
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
      if (key === Gamemode.AHOP) return new Set([Gamemode.BHOP, Gamemode.SURF]);
      else if (key === Gamemode.BHOP) return new Set([Gamemode.AHOP]);
      else return new Set();
    }
  );

  const validSubmissionSuggestions: MapSubmissionSuggestion[] = [
    {
      trackType: TT.MAIN,
      trackNum: 0,
      gamemode: Gamemode.AHOP,
      tier: 1,
      comment: 'This track came to me in a dream',
      type: LeaderboardType.RANKED
    },
    {
      trackType: TT.BONUS,
      trackNum: 0,
      gamemode: Gamemode.AHOP,
      tier: 1,
      comment: 'This track sucks',
      type: LeaderboardType.RANKED
    }
  ];

  const validApprovals: MapSubmissionApproval[] = [
    {
      trackType: TT.MAIN,
      trackNum: 0,
      gamemode: Gamemode.AHOP,
      tier: 1,
      type: LeaderboardType.UNRANKED
    },
    {
      trackType: TT.BONUS,
      trackNum: 0,
      gamemode: Gamemode.AHOP,
      tier: 1,
      type: LeaderboardType.RANKED
    }
  ];

  const validReviewSuggestions: MapReviewSuggestion[] = [
    {
      trackType: TT.MAIN,
      trackNum: 0,
      gamemode: Gamemode.AHOP,
      tier: 1,
      gameplayRating: 1
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
    expect(() =>
      validateSuggestions(validApprovals, zones, SuggestionType.APPROVAL)
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
      validateSuggestions([validApprovals[0]], zones, SuggestionType.APPROVAL)
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
            type: LeaderboardType.RANKED
          }
        ],
        zones,
        SuggestionType.SUBMISSION
      )
    ).toThrow('Suggestion refers to bonus track (2) that does not exist');

    expect(() =>
      validateSuggestions(
        [
          ...validApprovals,
          {
            trackType: TT.BONUS,
            trackNum: 1,
            gamemode: Gamemode.BHOP,
            tier: 1,
            type: LeaderboardType.RANKED
          }
        ],
        zones,
        SuggestionType.APPROVAL
      )
    ).toThrow('Suggestion refers to bonus track (2) that does not exist');

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
    ).toThrow('Suggestion refers to bonus track (2) that does not exist');
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
    ).toThrow('Duplicate suggestion for Ahop main');

    expect(() =>
      validateSuggestions(
        [...validApprovals, structuredClone(validApprovals[0])],
        zones,
        SuggestionType.APPROVAL
      )
    ).toThrow('Duplicate suggestion for Ahop main');

    expect(() =>
      validateSuggestions(
        [
          ...validReviewSuggestions,
          { ...validReviewSuggestions[0], gameplayRating: 1 }
        ],
        zones,
        SuggestionType.REVIEW
      )
    ).toThrow('Duplicate suggestion for Ahop main track');
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
            type: LeaderboardType.RANKED
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
            type: LeaderboardType.RANKED
          }
        ],
        zones,
        SuggestionType.APPROVAL
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
            gameplayRating: 1
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
            type: LeaderboardType.RANKED
          }
        ],
        zones,
        SuggestionType.SUBMISSION
      )
    ).toThrow('Multiple main tracks');

    expect(() =>
      validateSuggestions(
        [
          ...validApprovals,
          {
            trackType: TT.MAIN,
            trackNum: 1,
            gamemode: Gamemode.AHOP,
            tier: 2,
            type: LeaderboardType.RANKED
          }
        ],
        zones,
        SuggestionType.APPROVAL
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
            type: LeaderboardType.RANKED
          }
        ],
        zones,
        SuggestionType.SUBMISSION
      )
    ).toThrow('Suggestions should not include stage tracks');

    expect(() =>
      validateSuggestions(
        [
          ...validApprovals,
          {
            trackType: TT.STAGE,
            trackNum: 0,
            gamemode: Gamemode.AHOP,
            tier: 1,
            type: LeaderboardType.RANKED
          }
        ],
        zones,
        SuggestionType.APPROVAL
      )
    ).toThrow('Suggestions should not include stage tracks');

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
    ).toThrow('Suggestions should not include stage tracks');
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
            type: LeaderboardType.RANKED
          }
        ],
        zones,
        SuggestionType.SUBMISSION
      )
    ).toThrow('Incompatible gamemodes Ahop and Bhop on main track');

    expect(() =>
      validateSuggestions(
        [
          ...validApprovals,
          {
            trackType: TT.MAIN,
            trackNum: 0,
            gamemode: Gamemode.BHOP,
            tier: 1,
            type: LeaderboardType.RANKED
          }
        ],
        zones,
        SuggestionType.APPROVAL
      )
    ).toThrow('Incompatible gamemodes Ahop and Bhop on main track');

    expect(() =>
      validateSuggestions(
        [
          ...validSubmissionSuggestions,
          {
            trackType: TT.MAIN,
            trackNum: 0,
            gamemode: Gamemode.BHOP,
            tier: 1,
            gameplayRating: 4
          }
        ],
        zones,
        SuggestionType.REVIEW
      )
    ).toThrow('Incompatible gamemodes Ahop and Bhop on main track');
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
            type: LeaderboardType.RANKED
          }
        ],
        zones,
        SuggestionType.SUBMISSION
      )
    ).not.toThrow();

    expect(() =>
      validateSuggestions(
        [
          ...validApprovals,
          {
            trackType: TT.MAIN,
            trackNum: 0,
            gamemode: Gamemode.SURF,
            tier: 1,
            type: LeaderboardType.RANKED
          }
        ],
        zones,
        SuggestionType.APPROVAL
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

  it('should throw for bad tiers, types or gameplayRating', () => {
    for (const data of [
      validSubmissionSuggestions,
      validApprovals,
      validReviewSuggestions
    ]) {
      const suggs = structuredClone(data);
      suggs[0].tier = 0;
      expect(() =>
        validateSuggestions(suggs, zones, SuggestionType.APPROVAL)
      ).toThrow('Invalid tier 0 for Ahop main');
      suggs[0].tier = 11;
      expect(() =>
        validateSuggestions(suggs, zones, SuggestionType.APPROVAL)
      ).toThrow('Invalid tier 11 for Ahop main');
    }

    {
      const suggs = structuredClone(validApprovals);
      suggs[0].type = LeaderboardType.IN_SUBMISSION as any;
      expect(() =>
        validateSuggestions(suggs, zones, SuggestionType.APPROVAL)
      ).toThrow('Invalid leaderboard type IN_SUBMISSION for Ahop main');
    }

    {
      const suggs = structuredClone(validSubmissionSuggestions);
      suggs[0].type = LeaderboardType.HIDDEN as any;
      expect(() =>
        validateSuggestions(suggs, zones, SuggestionType.SUBMISSION)
      ).toThrow('Invalid leaderboard type HIDDEN for Ahop main');
    }

    {
      const suggs = structuredClone(validReviewSuggestions);
      suggs[0].gameplayRating = 0;
      expect(() =>
        validateSuggestions(suggs, zones, SuggestionType.APPROVAL)
      ).toThrow('Invalid gameplay rating 0 for Ahop main');
      suggs[0].gameplayRating = 11;
      expect(() =>
        validateSuggestions(suggs, zones, SuggestionType.APPROVAL)
      ).toThrow('Invalid gameplay rating 11 for Ahop main');
    }
  });

  it('should not allow hidden approval leaderboards have tiers', () => {
    expect(() =>
      validateSuggestions(
        [
          ...validApprovals,
          {
            gamemode: Gamemode.RJ,
            trackType: TrackType.MAIN,
            trackNum: 0,
            tier: 1,
            type: LeaderboardType.HIDDEN
          }
        ],
        zones,
        SuggestionType.APPROVAL
      )
    ).toThrow('Hidden leaderboard Rocket Jump main track has a tier');
  });

  it('should require each trackType, trackNum combo has a non-hidden leaderboard in at least one mode during approval', () => {
    const suggs = structuredClone(validApprovals);
    suggs[0].type = LeaderboardType.HIDDEN;
    delete suggs[0].tier;
    expect(() =>
      validateSuggestions(suggs, zones, SuggestionType.APPROVAL)
    ).toThrow('Missing non-hidden leaderboards for main track');
  });
});
