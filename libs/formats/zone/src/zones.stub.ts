import { Gamemode as GM, MapZones, TrackType } from '@momentum/constants';
import * as Enum from '@momentum/enum';

/**
 * An example MapZones object for use in testing.
 *
 * It contains
 * - a main track with
 *   - 2 major checkpoints, each with a
 *    - start zone and
 *    - 1 minor checkpoint
 *   - end zone
 *   - "stagesEndAtStageStarts" set to true
 * - 2 stage tracks, for both major checkpoints on main track
 * - 1 bonus, with just a start and end zone
 */
// Warning: multiple tests rely on this, do NOT change. If you need a change,
// go make another one!
export const ZonesStub: MapZones = {
  formatVersion: 1,
  dataTimestamp: 1697451975363,
  tracks: {
    main: {
      stagesEndAtStageStarts: true,
      zones: {
        segments: [
          {
            limitStartGroundSpeed: true,
            checkpointsRequired: true,
            checkpointsOrdered: true,
            checkpoints: [
              {
                regions: [
                  {
                    bottom: 0,
                    height: 512,
                    teleDestYaw: 0,
                    teleDestPos: [256, 256, 0],
                    points: [
                      [0, 0],
                      [0, 512],
                      [512, 512],
                      [512, 0]
                    ]
                  }
                ]
              },
              {
                regions: [
                  {
                    bottom: 0,
                    height: 512,
                    points: [
                      [1024, 0],
                      [1024, 512],
                      [1536, 512],
                      [1536, 0]
                    ]
                  }
                ]
              }
            ],
            cancel: []
          },
          {
            limitStartGroundSpeed: true,
            checkpointsRequired: true,
            checkpointsOrdered: true,
            checkpoints: [
              {
                regions: [
                  {
                    bottom: 0,
                    height: 512,
                    teleDestYaw: 0,
                    teleDestPos: [2304, 256, 0],
                    points: [
                      [2048, 0],
                      [2048, 512],
                      [2560, 512],
                      [2560, 0]
                    ]
                  }
                ]
              },
              {
                regions: [
                  {
                    bottom: 0,
                    height: 512,
                    points: [
                      [3072, 0],
                      [3072, 512],
                      [3584, 512],
                      [3584, 0]
                    ]
                  }
                ]
              }
            ],
            cancel: []
          }
        ],
        end: {
          regions: [
            {
              bottom: 0,
              height: 512,
              points: [
                [4096, 0],
                [4096, 512],
                [4608, 512],
                [4608, 0]
              ]
            }
          ]
        }
      }
    },
    bonuses: [
      {
        zones: {
          segments: [
            {
              name: 'Bonus 1',
              limitStartGroundSpeed: true,
              checkpointsRequired: true,
              checkpointsOrdered: true,
              checkpoints: [
                {
                  regions: [
                    {
                      bottom: 0,
                      height: 512,
                      teleDestYaw: 0,
                      teleDestPos: [256, 1028, 0],
                      points: [
                        [0, 1024],
                        [0, 1536],
                        [512, 1536],
                        [512, 1024]
                      ]
                    }
                  ]
                }
              ],
              cancel: []
            }
          ],
          end: {
            regions: [
              {
                bottom: 0,
                height: 512,
                points: [
                  [1024, 2048],
                  [1024, 2560],
                  [1536, 2560],
                  [1536, 2048]
                ]
              }
            ]
          }
        }
      }
    ]
  }
};

export const ZonesStubString = JSON.stringify(ZonesStub);

/**
 * Defining properties of all the leaderboards that *should* be generated from
 * ZonesStub, for a main track on Surf and bonus on Ahop.
 * This'll break every time we add more submodes, but is very useful
 * for tests where we want to be precise about leaderboard generation.
 */
// prettier-ignore
export const ZoneStubCompatGamemodes =
  [ GM.SURF, GM.RJ, GM.SJ, GM.CONC, GM.DEFRAG_CPM, GM.DEFRAG_VQ3, GM.DEFRAG_VTG, 
    GM.AHOP, GM.CLIMB_16 ];

// prettier-ignore
export const ZonesStubLeaderboards = [
  ...ZoneStubCompatGamemodes
    .flatMap((gamemode) => [
      { gamemode, trackType: TrackType.MAIN,  trackNum: 1, linear: false },
      { gamemode, trackType: TrackType.STAGE, trackNum: 1, linear: null  },
      { gamemode, trackType: TrackType.STAGE, trackNum: 2, linear: null  }
  ]),
  ...Enum.values(GM)
    .filter((gamemode => gamemode !== GM.CLIMB_KZT && gamemode !== GM.CLIMB_MOM ))
    .map((gamemode) => (
      { gamemode, trackType: TrackType.BONUS, trackNum: 1, linear: null }))
].sort();

/**
 * Simpler zones stub that's just a single linear track with no major
 * checkpoints
 */
export const BabyZonesStub: MapZones = {
  formatVersion: 1,
  dataTimestamp: 1697451975363,
  tracks: {
    main: {
      stagesEndAtStageStarts: true,
      zones: {
        segments: [
          {
            limitStartGroundSpeed: true,
            checkpointsRequired: true,
            checkpointsOrdered: true,
            checkpoints: [
              {
                regions: [
                  {
                    bottom: 0,
                    height: 512,
                    teleDestYaw: 0,
                    teleDestPos: [256, 256, 0],
                    points: [
                      [0, 0],
                      [0, 512],
                      [512, 512],
                      [512, 0]
                    ]
                  }
                ]
              },
              {
                regions: [
                  {
                    bottom: 0,
                    height: 512,
                    points: [
                      [1024, 0],
                      [1024, 512],
                      [1536, 512],
                      [1536, 0]
                    ]
                  }
                ]
              }
            ],
            cancel: []
          }
        ],
        end: {
          regions: [
            {
              bottom: 0,
              height: 512,
              points: [
                [1024, 0],
                [1024, 512],
                [1536, 512],
                [1536, 0]
              ]
            }
          ]
        }
      }
    },
    bonuses: []
  }
};

export const BabyZonesStubString = JSON.stringify(BabyZonesStub);
