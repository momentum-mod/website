import * as assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  Gamemode,
  LeaderboardType,
  MapReviewSuggestion,
  MapSubmissionApproval,
  MapSubmissionSuggestion,
  MapTags,
  TrackType,
  TrackType as TT
} from '@momentum/constants';
import { ZonesStub } from './zones.stub';
import { SuggestionType, validateSuggestions } from './';

const messageIncludes = (message: string) => (error: Error) =>
  error.message.includes(message);

describe('validateSuggestions', () => {
  // Has a bonus
  const zones = ZonesStub;

  const ahopTags = MapTags.get(Gamemode.AHOP);
  const validSubmissionSuggestions: MapSubmissionSuggestion[] = [
    {
      trackType: TT.MAIN,
      trackNum: 1,
      gamemode: Gamemode.AHOP,
      tier: 1,
      comment: 'This track came to me in a dream',
      type: LeaderboardType.RANKED,
      tags: [ahopTags[0], ahopTags[1]]
    },
    {
      trackType: TT.BONUS,
      trackNum: 1,
      gamemode: Gamemode.AHOP,
      tier: 1,
      comment: 'This track sucks',
      type: LeaderboardType.RANKED
    }
  ];

  const validApprovals: MapSubmissionApproval[] = [
    {
      trackType: TT.MAIN,
      trackNum: 1,
      gamemode: Gamemode.AHOP,
      tier: 1,
      type: LeaderboardType.UNRANKED,
      tags: [ahopTags[0], ahopTags[1]]
    },
    {
      trackType: TT.BONUS,
      trackNum: 1,
      gamemode: Gamemode.AHOP,
      tier: 1,
      type: LeaderboardType.RANKED
    }
  ];

  const validReviewSuggestions: MapReviewSuggestion[] = [
    {
      trackType: TT.MAIN,
      trackNum: 1,
      gamemode: Gamemode.AHOP,
      tier: 1,
      gameplayRating: 1,
      tags: [ahopTags[0], ahopTags[1]]
    },
    {
      trackType: TT.BONUS,
      trackNum: 1,
      gamemode: Gamemode.AHOP,
      tier: 1,
      gameplayRating: 10
    }
  ];

  it('should not throw for valid suggestions', () => {
    assert.doesNotThrow(() =>
      validateSuggestions(
        validSubmissionSuggestions,
        zones,
        SuggestionType.SUBMISSION
      )
    );
    assert.doesNotThrow(() =>
      validateSuggestions(validReviewSuggestions, zones, SuggestionType.REVIEW)
    );
    assert.doesNotThrow(() =>
      validateSuggestions(validApprovals, zones, SuggestionType.APPROVAL)
    );
  });

  it('should throw for if missing a bonus track and given zones with a bonus', () => {
    assert.throws(
      () =>
        validateSuggestions(
          [validSubmissionSuggestions[0]],
          zones,
          SuggestionType.SUBMISSION
        ),
      messageIncludes('Bonus track 1 has no suggestions')
    );

    assert.throws(
      () =>
        validateSuggestions(
          [validApprovals[0]],
          zones,
          SuggestionType.APPROVAL
        ),
      messageIncludes('Bonus track 1 has no suggestions')
    );

    assert.doesNotThrow(() =>
      validateSuggestions(
        [validReviewSuggestions[0]],
        zones,
        SuggestionType.REVIEW
      )
    );
  });

  it('should throw for if a suggested bonus does not correspond to zone', () => {
    assert.throws(
      () =>
        validateSuggestions(
          [
            ...validSubmissionSuggestions,
            {
              trackType: TT.BONUS,
              trackNum: 2,
              gamemode: Gamemode.BHOP,
              tier: 1,
              comment: 'This track doesnt exist',
              type: LeaderboardType.RANKED
            }
          ],
          zones,
          SuggestionType.SUBMISSION
        ),
      messageIncludes(
        'Suggestion refers to bonus track (2) that does not exist'
      )
    );

    assert.throws(
      () =>
        validateSuggestions(
          [
            ...validApprovals,
            {
              trackType: TT.BONUS,
              trackNum: 2,
              gamemode: Gamemode.BHOP,
              tier: 1,
              type: LeaderboardType.RANKED
            }
          ],
          zones,
          SuggestionType.APPROVAL
        ),
      messageIncludes(
        'Suggestion refers to bonus track (2) that does not exist'
      )
    );

    assert.throws(
      () =>
        validateSuggestions(
          [
            ...validReviewSuggestions,
            {
              trackType: TT.BONUS,
              trackNum: 2,
              gamemode: Gamemode.BHOP,
              gameplayRating: 5
            }
          ],
          zones,
          SuggestionType.REVIEW
        ),
      messageIncludes(
        'Suggestion refers to bonus track (2) that does not exist'
      )
    );
  });

  it('should throw for duplicate suggestions', () => {
    assert.throws(
      () =>
        validateSuggestions(
          [
            ...validSubmissionSuggestions,
            { ...validSubmissionSuggestions[0], comment: 'elephants' }
          ],
          zones,
          SuggestionType.SUBMISSION
        ),
      messageIncludes('Duplicate suggestion for Ahop main')
    );

    assert.throws(
      () =>
        validateSuggestions(
          [...validApprovals, structuredClone(validApprovals[0])],
          zones,
          SuggestionType.APPROVAL
        ),
      messageIncludes('Duplicate suggestion for Ahop main')
    );

    assert.throws(
      () =>
        validateSuggestions(
          [
            ...validReviewSuggestions,
            { ...validReviewSuggestions[0], gameplayRating: 1 }
          ],
          zones,
          SuggestionType.REVIEW
        ),
      messageIncludes('Duplicate suggestion for Ahop main track')
    );
  });

  it('should throw for missing main track', () => {
    assert.throws(
      () =>
        validateSuggestions(
          [
            {
              trackType: TT.BONUS,
              trackNum: 1,
              gamemode: Gamemode.AHOP,
              tier: 1,
              comment: 'someComment',
              type: LeaderboardType.RANKED
            }
          ],
          zones,
          SuggestionType.SUBMISSION
        ),
      messageIncludes('Missing main track')
    );

    assert.throws(
      () =>
        validateSuggestions(
          [
            {
              trackType: TT.BONUS,
              trackNum: 1,
              gamemode: Gamemode.AHOP,
              tier: 1,
              type: LeaderboardType.RANKED
            }
          ],
          zones,
          SuggestionType.APPROVAL
        ),
      messageIncludes('Missing main track')
    );

    assert.doesNotThrow(() =>
      validateSuggestions(
        [
          {
            trackType: TT.BONUS,
            trackNum: 1,
            gamemode: Gamemode.AHOP,
            tier: 1,
            gameplayRating: 1
          }
        ],
        zones,
        SuggestionType.REVIEW
      )
    );
  });

  it('should throw for multiple main tracks', () => {
    assert.throws(
      () =>
        validateSuggestions(
          [
            ...validSubmissionSuggestions,
            {
              trackType: TT.MAIN,
              trackNum: 2,
              gamemode: Gamemode.AHOP,
              tier: 2,
              comment: 'someComment',
              type: LeaderboardType.RANKED
            }
          ],
          zones,
          SuggestionType.SUBMISSION
        ),
      messageIncludes('Only one main track allowed, must be track 1')
    );

    assert.throws(
      () =>
        validateSuggestions(
          [
            ...validApprovals,
            {
              trackType: TT.MAIN,
              trackNum: 2,
              gamemode: Gamemode.AHOP,
              tier: 2,
              type: LeaderboardType.RANKED
            }
          ],
          zones,
          SuggestionType.APPROVAL
        ),
      messageIncludes('Only one main track allowed, must be track 1')
    );

    assert.throws(
      () =>
        validateSuggestions(
          [
            ...validSubmissionSuggestions,
            {
              trackType: TT.MAIN,
              trackNum: 2,
              gamemode: Gamemode.AHOP,
              tier: 2
            }
          ],
          zones,
          SuggestionType.REVIEW
        ),
      messageIncludes('Only one main track allowed, must be track 1')
    );
  });

  it('should throw error for stages in suggestions', () => {
    assert.throws(
      () =>
        validateSuggestions(
          [
            ...validSubmissionSuggestions,
            {
              trackType: TT.STAGE,
              trackNum: 1,
              gamemode: Gamemode.AHOP,
              tier: 1,
              comment: 'someComment',
              type: LeaderboardType.RANKED
            }
          ],
          zones,
          SuggestionType.SUBMISSION
        ),
      messageIncludes('Suggestions should not include stage tracks')
    );

    assert.throws(
      () =>
        validateSuggestions(
          [
            ...validApprovals,
            {
              trackType: TT.STAGE,
              trackNum: 1,
              gamemode: Gamemode.AHOP,
              tier: 1,
              type: LeaderboardType.RANKED
            }
          ],
          zones,
          SuggestionType.APPROVAL
        ),
      messageIncludes('Suggestions should not include stage tracks')
    );

    assert.throws(
      () =>
        validateSuggestions(
          [
            ...validSubmissionSuggestions,
            {
              trackType: TT.STAGE,
              trackNum: 1,
              gamemode: Gamemode.AHOP,
              tier: 1,
              gameplayRating: 6
            }
          ],
          zones,
          SuggestionType.REVIEW
        ),
      messageIncludes('Suggestions should not include stage tracks')
    );
  });

  it('should not allow suggestions for disabled gamemodes', () => {
    assert.throws(
      () =>
        validateSuggestions(
          [
            ...validSubmissionSuggestions,
            {
              trackType: TT.MAIN,
              trackNum: 1,
              gamemode: Gamemode.CLIMB_MOM,
              tier: 1,
              comment: 'someComment',
              type: LeaderboardType.RANKED
            }
          ],
          zones,
          SuggestionType.SUBMISSION
        ),
      messageIncludes('Disabled gamemode Climb (Momentum) on main track')
    );

    assert.throws(
      () =>
        validateSuggestions(
          [
            ...validApprovals,
            {
              trackType: TT.MAIN,
              trackNum: 1,
              gamemode: Gamemode.CLIMB_MOM,
              tier: 1,
              type: LeaderboardType.RANKED
            }
          ],
          zones,
          SuggestionType.APPROVAL
        ),
      messageIncludes('Disabled gamemode Climb (Momentum) on main track')
    );

    assert.throws(
      () =>
        validateSuggestions(
          [
            ...validSubmissionSuggestions,
            {
              trackType: TT.MAIN,
              trackNum: 1,
              gamemode: Gamemode.CLIMB_MOM,
              tier: 1,
              gameplayRating: 6
            }
          ],
          zones,
          SuggestionType.REVIEW
        ),
      messageIncludes('Disabled gamemode Climb (Momentum) on main track')
    );
  });

  it('should throw for bad tiers, types or gameplayRating', () => {
    for (const data of [
      validSubmissionSuggestions,
      validApprovals,
      validReviewSuggestions
    ]) {
      const suggs = structuredClone(data);
      suggs[0].tier = 0;
      assert.throws(
        () => validateSuggestions(suggs, zones, SuggestionType.APPROVAL),
        messageIncludes('Invalid tier 0 for Ahop main')
      );
      suggs[0].tier = 11;
      assert.throws(
        () => validateSuggestions(suggs, zones, SuggestionType.APPROVAL),
        messageIncludes('Invalid tier 11 for Ahop main')
      );
    }

    {
      const suggs = structuredClone(validApprovals);
      suggs[0].type = LeaderboardType.IN_SUBMISSION as any;
      assert.throws(
        () => validateSuggestions(suggs, zones, SuggestionType.APPROVAL),
        messageIncludes('Invalid leaderboard type IN_SUBMISSION for Ahop main')
      );
    }

    {
      const suggs = structuredClone(validSubmissionSuggestions);
      suggs[0].type = LeaderboardType.HIDDEN as any;
      assert.throws(
        () => validateSuggestions(suggs, zones, SuggestionType.SUBMISSION),
        messageIncludes('Invalid leaderboard type HIDDEN for Ahop main')
      );
    }

    {
      const suggs = structuredClone(validReviewSuggestions);
      suggs[0].gameplayRating = 0;
      assert.throws(
        () => validateSuggestions(suggs, zones, SuggestionType.APPROVAL),
        messageIncludes('Invalid gameplay rating 0 for Ahop main')
      );
      suggs[0].gameplayRating = 11;
      assert.throws(
        () => validateSuggestions(suggs, zones, SuggestionType.APPROVAL),
        messageIncludes('Invalid gameplay rating 11 for Ahop main')
      );
    }
  });

  it('should not allow hidden approval leaderboards have tiers', () => {
    assert.throws(
      () =>
        validateSuggestions(
          [
            ...validApprovals,
            {
              gamemode: Gamemode.RJ,
              trackType: TrackType.MAIN,
              trackNum: 1,
              tier: 1,
              type: LeaderboardType.HIDDEN
            }
          ],
          zones,
          SuggestionType.APPROVAL
        ),
      messageIncludes('Hidden leaderboard Rocket Jump main track has a tier')
    );
  });

  it('should require each trackType, trackNum combo has a non-hidden leaderboard in at least one mode during approval', () => {
    const suggs = structuredClone(validApprovals);
    suggs[0].type = LeaderboardType.HIDDEN;
    delete suggs[0].tier;
    assert.throws(
      () => validateSuggestions(suggs, zones, SuggestionType.APPROVAL),
      messageIncludes('Missing non-hidden leaderboards for main track')
    );
  });

  it('should throw for trackNum of 0', () => {
    const suggs = structuredClone(validApprovals);

    suggs[0].trackNum = 0;
    assert.throws(
      () => validateSuggestions(suggs, zones, SuggestionType.APPROVAL),
      messageIncludes('Only one main track allowed, must be track 1')
    );

    suggs[0].trackNum = 1;
    suggs.push({ ...suggs[1], trackNum: 0 });
    assert.throws(
      () => validateSuggestions(suggs, zones, SuggestionType.APPROVAL),
      messageIncludes(
        'Suggestion refers to bonus track (0) that does not exist'
      )
    );
  });

  it('should throw for bad tags', () => {
    assert.throws(
      () =>
        validateSuggestions(
          [
            {
              ...validApprovals[0],
              // @ts-expect-error - deliberately wrong
              tags: [9999, -1]
            }
          ],
          zones,
          SuggestionType.APPROVAL
        ),
      messageIncludes('Invalid tag 9999 for Ahop main')
    );

    assert.throws(
      () =>
        validateSuggestions(
          [
            {
              ...validReviewSuggestions[0],
              // @ts-expect-error - deliberately wrong
              tags: [-1, 'Butter']
            }
          ],
          zones,
          SuggestionType.REVIEW
        ),
      messageIncludes('Invalid tag -1 for Ahop main')
    );

    assert.throws(
      () =>
        validateSuggestions(
          [
            {
              ...validSubmissionSuggestions[0],
              // @ts-expect-error - deliberately wrong
              tags: ['Daydreaming', 1337]
            }
          ],
          zones,
          SuggestionType.SUBMISSION
        ),
      messageIncludes('Invalid tag Daydreaming for Ahop main')
    );

    const nonAhopTag = MapTags.get(Gamemode.BHOP).find(
      (t) => !ahopTags.includes(t)
    );
    assert.throws(
      () =>
        validateSuggestions(
          [
            {
              ...validSubmissionSuggestions[0],
              tags: [
                MapTags.get(Gamemode.BHOP).find((t) => !ahopTags.includes(t))
              ]
            }
          ],
          zones,
          SuggestionType.SUBMISSION
        ),
      messageIncludes(`Invalid tag ${nonAhopTag} for Ahop main`)
    );
  });
});
