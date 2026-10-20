import { after, afterEach, before, beforeEach, describe, it } from 'node:test';
import {
  anything,
  arrayContaining,
  createSha1Hash,
  E2ETestMMap,
  FILES_PATH,
  matchesPartial,
  NULL_ID,
  objectContaining
} from '@momentum/test-utils';
import * as assert from 'node:assert/strict';
import { MapDto } from '../../backend/src/app/dto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  ActivityType,
  AdminActivityType,
  FlatMapList,
  Gamemode,
  LeaderboardType,
  MapCreditType,
  MapStatus,
  MapSubmissionType,
  MapTestInviteState,
  NotificationType,
  Role,
  runPath,
  TrackType,
  MapTag,
  bspPath,
  imgLargePath,
  imgMediumPath,
  imgSmallPath,
  imgXlPath,
  vmfsPath,
  Style
} from '@momentum/constants';
import * as Enum from '@momentum/enum';
import { Prisma, User } from '@momentum/db';
import Zip from 'adm-zip';
import {
  BabyZonesStub,
  BabyZonesStubString,
  ZonesStub,
  ZonesStubLeaderboards,
  ZonesStubString
} from '@momentum/formats/zone';
import { randomUUID } from 'node:crypto';
import { Config } from 'apps/backend/src/app/config';
import {
  prisma,
  req,
  db,
  fileStore,
  checkScheduledMapListUpdates,
  registerE2ETestFile
} from './support/e2e-environment';

describe('Admin', () => {
  registerE2ETestFile();

  async function uploadBspToPreSignedUrl(bspBuffer: Buffer, token: string) {
    const preSignedUrlRes = await req.get({
      url: 'maps/getMapUploadUrl',
      query: {
        fileSize: bspBuffer.length
      },
      status: 200,
      token
    });

    await fileStore.putToPreSignedUrl(preSignedUrlRes.body.url, bspBuffer);
  }

  async function expectAdminActivityWasCreated(
    userID: number,
    type: AdminActivityType
  ) {
    const activities = await prisma.adminActivity.findMany({
      where: { userID }
    });
    assert.ok(activities.some((activity) => activity.type === type));
  }

  describe('admin/maps/{mapID}', () => {
    describe('POST', () => {
      const bspBuffer = readFileSync(path.join(FILES_PATH, 'map.bsp'));
      const vmfBuffer = readFileSync(path.join(FILES_PATH, 'map.vmf'));
      let u1: User,
        u1Token: string,
        admin: User,
        adminToken: string,
        modToken: string,
        map;

      before(async () => {
        [[u1, u1Token], [admin, adminToken], modToken] = await Promise.all([
          db.createAndLoginUser(),
          db.createAndLoginUser({ data: { roles: Role.ADMIN } }),
          db.loginNewUser({ data: { roles: Role.MODERATOR } })
        ]);
      });

      after(async () => {
        await db.cleanup('user');
        await fileStore.deleteDirectory('submissions');
        await fileStore.deleteDirectory('upload_tmp');
      });

      beforeEach(async () => {
        map = await db.createMap(
          {
            name: 'surf_map',
            submitter: { connect: { id: u1.id } },
            status: MapStatus.PRIVATE_TESTING,
            versions: {
              create: {
                zones: ZonesStubString,
                versionNum: 1,
                bspHash: createSha1Hash(bspBuffer),
                submitter: { connect: { id: u1.id } }
              }
            },
            submission: {
              create: {
                type: MapSubmissionType.ORIGINAL,
                suggestions: [
                  {
                    trackType: TrackType.MAIN,
                    trackNum: 1,
                    gamemode: Gamemode.SURF,
                    tier: 10,
                    type: LeaderboardType.RANKED
                  }
                ],
                dates: {
                  create: [
                    {
                      status: MapStatus.PRIVATE_TESTING,
                      date: new Date(),
                      user: { connect: { id: u1.id } }
                    }
                  ]
                }
              }
            }
          },
          true
        );
      });

      afterEach(async () => {
        await Promise.all([
          db.cleanup('mMap'),
          fileStore.deleteDirectory('maplist'),
          fileStore.deleteDirectory('upload_tmp')
        ]);
      });

      it('should allow admin to add a new map version', async () => {
        const changelog = 'Added walls, floors etc...';
        await uploadBspToPreSignedUrl(bspBuffer, adminToken);

        const res = await req.postAttach({
          url: `admin/maps/${map.id}`,
          status: 201,
          data: { changelog, hasBSP: true },
          files: [{ file: vmfBuffer, field: 'vmfs', fileName: 'surf_map.vmf' }],
          validate: MapDto,
          token: adminToken
        });

        assert.ok(
          matchesPartial(res.body, {
            currentVersion: {
              versionNum: 2,
              submitterID: admin.id,
              changelog
            },
            versions: arrayContaining([
              objectContaining({ versionNum: 1 }),
              objectContaining({
                versionNum: 2,
                changelog,
                submitterID: admin.id
              })
            ])
          })
        );

        const mapDB = await prisma.mMap.findUnique({
          where: { id: map.id },
          include: { currentVersion: true }
        });

        assert.equal(mapDB.currentVersion.versionNum, 2);
        assert.equal(res.body.currentVersion.id, mapDB.currentVersion.id);
      });

      it('should allow admin to add a new map version when map is approved', async () => {
        await prisma.mMap.update({
          where: { id: map.id },
          data: {
            status: MapStatus.APPROVED,
            info: { update: { approvedDate: new Date() } }
          }
        });

        await req.postAttach({
          url: `admin/maps/${map.id}`,
          status: 201,
          data: { changelog: 'meow' },
          files: [{ file: vmfBuffer, field: 'vmfs', fileName: 'surf_map.vmf' }],
          validate: MapDto,
          token: adminToken
        });
      });

      it('should allow updating zones when map is approved', async () => {
        await prisma.mMap.update({
          where: { id: map.id },
          data: {
            status: MapStatus.APPROVED,
            info: { update: { approvedDate: new Date() } }
          }
        });

        const zones = structuredClone(ZonesStub);
        zones.tracks.main.zones.segments[0].name = 'Bob';

        await req.postAttach({
          url: `admin/maps/${map.id}`,
          status: 201,
          data: { changelog: 'Oh, he is here too', zones },
          validate: MapDto,
          token: adminToken
        });
      });

      it('should not allow updating zones that create leaderboards when map is approved', async () => {
        await prisma.mMap.update({
          where: { id: map.id },
          data: {
            status: MapStatus.APPROVED,
            info: { update: { approvedDate: new Date() } }
          }
        });

        const zones = structuredClone(ZonesStub);
        zones.tracks.bonuses.push(zones.tracks.bonuses[0]);

        await req.postAttach({
          url: `admin/maps/${map.id}`,
          status: 400,
          data: { changelog: 'beer', zones },
          token: adminToken
        });
      });

      it('should allow updating zones that create leaderboards when map is in testing and was approved', async () => {
        await prisma.mMap.update({
          where: { id: map.id },
          data: {
            status: MapStatus.PUBLIC_TESTING,
            info: { update: { approvedDate: new Date() } }
          }
        });

        const zones = structuredClone(ZonesStub);
        zones.tracks.bonuses.push(zones.tracks.bonuses[0]);

        await req.postAttach({
          url: `admin/maps/${map.id}`,
          status: 201,
          data: { changelog: 'More bones', zones },
          validate: MapDto,
          token: adminToken
        });
      });

      it("should 400 if a VMF file is greater than the config's max vmf file size", async () => {
        await uploadBspToPreSignedUrl(bspBuffer, adminToken);

        await req.postAttach({
          url: `admin/maps/${map.id}`,
          status: 400,
          data: { changelog: 'kill me' },
          files: [
            {
              file: Buffer.alloc(Config.limits.vmfSize + 1),
              field: 'vmfs',
              fileName: 'surf_map.vmf'
            }
          ],
          token: adminToken
        });
      });

      it('should return 404 if map not found', async () => {
        await req.postAttach({
          url: `admin/maps/${NULL_ID}`,
          status: 404,
          data: { changelog: 'sausage' },
          files: [{ file: vmfBuffer, field: 'vmfs', fileName: 'surf_map.vmf' }],
          token: adminToken
        });
      });

      it('should return 403 for a non-admin/mod access token is given', async () => {
        await req.postAttach({
          url: `admin/maps/${map.id}`,
          status: 403,
          data: { changelog: 'tomato' },
          files: [{ file: vmfBuffer, field: 'vmfs', fileName: 'surf_map.vmf' }],
          token: u1Token
        });
      });

      it('should accept if a mod access token is given', async () => {
        await req.postAttach({
          url: `admin/maps/${map.id}`,
          status: 201,
          data: { changelog: 'mamping' },
          files: [{ file: vmfBuffer, field: 'vmfs', fileName: 'surf_map.vmf' }],
          token: modToken
        });
      });

      it('should 401 when no access token is provided', async () => {
        await req.unauthorizedTest('admin/maps/1', 'post');
      });
    });

    describe('PATCH', () => {
      const bspBuffer = readFileSync(path.join(FILES_PATH, 'map.bsp'));
      const vmfBuffer = readFileSync(path.join(FILES_PATH, 'map.vmf'));
      const bspHash = createSha1Hash(bspBuffer);

      let admin: User,
        adminToken: string,
        mod: User,
        modToken: string,
        reviewerToken: string,
        u1: User,
        u1Token: string,
        u2: User,
        u3: User,
        createMapData: Partial<Prisma.MMapCreateInput>;

      before(async () => {
        [
          [admin, adminToken],
          [mod, modToken],
          reviewerToken,
          [u1, u1Token],
          u2,
          u3
        ] = await Promise.all([
          db.createAndLoginUser({ data: { roles: Role.ADMIN } }),
          db.createAndLoginUser({ data: { roles: Role.MODERATOR } }),
          db.loginNewUser({ data: { roles: Role.REVIEWER } }),
          db.createAndLoginUser(),
          db.createUser(),
          db.createUser()
        ]);

        createMapData = {
          name: 'surf_map',
          submitter: { connect: { id: u1.id } },
          versions: {
            createMany: {
              data: [
                {
                  versionNum: 1,
                  bspHash: createSha1Hash(
                    'apple banana cat dog elephant fox grape hat igloo joker'
                  ),
                  zones: BabyZonesStubString,
                  submitterID: u1.id
                },
                {
                  versionNum: 2,
                  bspHash,
                  zones: BabyZonesStubString,
                  submitterID: u1.id
                }
              ]
            }
          },
          submission: {
            create: {
              type: MapSubmissionType.ORIGINAL,
              dates: {
                create: [
                  {
                    status: MapStatus.PRIVATE_TESTING,
                    date: new Date(),
                    user: { connect: { id: u1.id } }
                  }
                ]
              },
              suggestions: [
                {
                  gamemode: Gamemode.RJ,
                  trackType: TrackType.MAIN,
                  trackNum: 1,
                  tier: 1,
                  type: LeaderboardType.RANKED
                }
              ]
            }
          }
        };
      });

      after(async () => {
        await db.cleanup('leaderboardRun', 'user', 'adminActivity');
      });

      afterEach(async () => {
        await Promise.all([
          db.cleanup('mMap', 'adminActivity', 'notification'),
          fileStore.deleteDirectory('maps'),
          fileStore.deleteDirectory('submissions'),
          fileStore.deleteDirectory('maplist')
        ]);
      });

      for (const status of Enum.values(MapStatus)) {
        it(`should allow an admin to update map data during ${MapStatus[status]}`, async () => {
          const map = await db.createMap({ ...createMapData, status });

          await req.patch({
            url: `admin/maps/${map.id}`,
            status: 204,
            body: {
              name: 'surf_dogs',
              info: {
                description:
                  'Dogs are large flightless birds. They are the heaviest living birds, and lay the largest eggs of any living land animal.',
                youtubeID: 'Rt460jKi4Bk'
              },
              finalLeaderboards:
                status === MapStatus.FINAL_APPROVAL
                  ? [
                      {
                        gamemode: Gamemode.RJ,
                        trackType: TrackType.MAIN,
                        trackNum: 1,
                        tier: 5,
                        type: LeaderboardType.UNRANKED
                      }
                    ]
                  : undefined,
              placeholders: [{ type: MapCreditType.CONTRIBUTOR, alias: 'eee' }]
            },
            token: adminToken
          });

          const changedMap = await prisma.mMap.findFirst({
            where: { id: map.id },
            include: { info: true, submission: true }
          });

          assert.partialDeepStrictEqual(changedMap, {
            name: 'surf_dogs',
            info: {
              description:
                'Dogs are large flightless birds. They are the heaviest living birds, and lay the largest eggs of any living land animal.',
              youtubeID: 'Rt460jKi4Bk'
            },
            submission: {
              suggestions: [
                {
                  trackNum: 1,
                  trackType: TrackType.MAIN,
                  gamemode: Gamemode.RJ,
                  tier: 1,
                  type: LeaderboardType.RANKED
                }
              ],
              placeholders: [{ type: MapCreditType.CONTRIBUTOR, alias: 'eee' }]
            }
          });
          await expectAdminActivityWasCreated(
            admin.id,
            AdminActivityType.MAP_UPDATE
          );
        });

        it(`should allow a mod to update map data during ${MapStatus[status]}`, async () => {
          const map = await db.createMap({ ...createMapData, status });

          await req.patch({
            url: `admin/maps/${map.id}`,
            status: 204,
            body: {
              name: 'surf_whelks',
              info: {
                description:
                  'Whelks are large flightless dogs. They are the heaviest living dogs, and lay the largest dogs of any living land animal.',
                youtubeID: 'IUfBBCkl_QI'
              },
              finalLeaderboards:
                status === MapStatus.FINAL_APPROVAL
                  ? [
                      {
                        gamemode: Gamemode.RJ,
                        trackType: TrackType.MAIN,
                        trackNum: 1,
                        tier: 5,
                        type: LeaderboardType.UNRANKED
                      }
                    ]
                  : undefined,
              placeholders: [{ type: MapCreditType.CONTRIBUTOR, alias: 'eee' }]
            },
            token: modToken
          });

          const changedMap = await prisma.mMap.findFirst({
            where: { id: map.id },
            include: { info: true, submission: true }
          });

          assert.partialDeepStrictEqual(changedMap, {
            name: 'surf_whelks',
            info: {
              description:
                'Whelks are large flightless dogs. They are the heaviest living dogs, and lay the largest dogs of any living land animal.',
              youtubeID: 'IUfBBCkl_QI'
            },
            submission: {
              placeholders: [{ type: MapCreditType.CONTRIBUTOR, alias: 'eee' }]
            }
          });
          await expectAdminActivityWasCreated(
            mod.id,
            AdminActivityType.MAP_UPDATE
          );
        });

        if (status === MapStatus.PUBLIC_TESTING) {
          it('should allow a reviewer to update map data during PUBLIC_TESTING', async () => {
            const map = await db.createMap({ ...createMapData, status });

            await req.patch({
              url: `admin/maps/${map.id}`,
              status: 204,
              body: {
                name: 'surf_albatross',
                info: {
                  description: 'Albatrosses are large seabirds.',
                  youtubeID: 'IUfBBCkl_QI'
                },
                placeholders: [
                  { type: MapCreditType.CONTRIBUTOR, alias: 'eee' }
                ]
              },
              token: reviewerToken
            });

            const changedMap = await prisma.mMap.findFirst({
              where: { id: map.id },
              include: { info: true, submission: true }
            });

            assert.partialDeepStrictEqual(changedMap, {
              name: 'surf_albatross',
              info: {
                description: 'Albatrosses are large seabirds.',
                youtubeID: 'IUfBBCkl_QI'
              },
              submission: {
                placeholders: [
                  { type: MapCreditType.CONTRIBUTOR, alias: 'eee' }
                ]
              }
            });
          });
        } else {
          it(`should not allow a reviewer to update map data during ${MapStatus[status]}`, async () => {
            const map = await db.createMap({ ...createMapData, status });

            await prisma.mMap.update({
              where: { id: map.id },
              data: { status }
            });

            await req.patch({
              url: `admin/maps/${map.id}`,
              status: 403,
              body: {
                name: 'surf_albatross',
                finalLeaderboards:
                  status === MapStatus.FINAL_APPROVAL
                    ? [
                        {
                          gamemode: Gamemode.RJ,
                          trackType: TrackType.MAIN,
                          trackNum: 1,
                          tier: 5,
                          type: LeaderboardType.UNRANKED
                        }
                      ]
                    : undefined
              },
              token: reviewerToken
            });
          });
        }
      }

      it('should allow an admin to update suggestions during submission', async () => {
        const map = await db.createMap({
          ...createMapData,
          status: MapStatus.PUBLIC_TESTING
        });

        await req.patch({
          url: `admin/maps/${map.id}`,
          status: 204,
          body: {
            name: 'surf_asbestos',
            suggestions: [
              {
                trackNum: 1,
                trackType: TrackType.MAIN,
                gamemode: Gamemode.BHOP,
                tier: 1,
                type: LeaderboardType.UNRANKED
              }
            ]
          },
          token: adminToken
        });
      });

      it('should allow an admin to update leaderboards when map is approved', async () => {
        const map = await db.createMap({
          ...createMapData,
          status: MapStatus.FINAL_APPROVAL
        });

        await req.patch({
          url: `admin/maps/${map.id}`,
          status: 204,
          body: {
            status: MapStatus.APPROVED,
            finalLeaderboards: [
              {
                gamemode: Gamemode.RJ,
                trackType: TrackType.MAIN,
                trackNum: 1,
                tier: 1,
                type: LeaderboardType.RANKED
              },
              {
                gamemode: Gamemode.SJ,
                trackType: TrackType.MAIN,
                trackNum: 1,
                type: LeaderboardType.HIDDEN
              }
            ]
          },
          token: adminToken
        });

        const oldLeaderboards = await prisma.leaderboard.findMany({
          where: { mapID: map.id, trackType: TrackType.MAIN, trackNum: 1 }
        });

        await req.patch({
          url: `admin/maps/${map.id}`,
          status: 204,
          body: {
            leaderboards: [
              {
                gamemode: Gamemode.SJ,
                trackType: TrackType.MAIN,
                trackNum: 1,
                tier: 4,
                type: LeaderboardType.RANKED,
                tags: [MapTag.Portals]
              }
            ]
          },
          token: adminToken
        });

        const newLeaderboards = await prisma.leaderboard.findMany({
          where: { mapID: map.id, trackType: TrackType.MAIN, trackNum: 1 }
        });
        const newRanked = newLeaderboards.find(
          (lb) => lb.type === LeaderboardType.RANKED
        );

        assert.equal(newLeaderboards.length, oldLeaderboards.length);

        assert.equal(newRanked.gamemode, Gamemode.SJ);
        assert.equal(newRanked.tier, 4);
        assert.deepEqual(newRanked.tags, [MapTag.Portals]);
      });

      it('should not allow to update leaderboards to an unsupported gamemode', async () => {
        const map = await db.createMap({
          ...createMapData,
          status: MapStatus.FINAL_APPROVAL
        });

        await req.patch({
          url: `admin/maps/${map.id}`,
          status: 204,
          body: {
            status: MapStatus.APPROVED,
            finalLeaderboards: [
              {
                gamemode: Gamemode.RJ,
                trackType: TrackType.MAIN,
                trackNum: 1,
                tier: 1,
                type: LeaderboardType.RANKED
              },
              {
                gamemode: Gamemode.BHOP,
                trackType: TrackType.MAIN,
                trackNum: 1,
                type: LeaderboardType.HIDDEN
              }
            ]
          },
          token: adminToken
        });

        await req.patch({
          url: `admin/maps/${map.id}`,
          status: 400,
          body: {
            leaderboards: [
              {
                gamemode: Gamemode.SJ,
                trackType: TrackType.MAIN,
                trackNum: 1,
                tier: 4,
                type: LeaderboardType.RANKED,
                tags: [MapTag.Portals]
              }
            ]
          },
          token: adminToken
        });
      });

      it('should not allow to create leaderboards for new tracks when the map is approved', async () => {
        const map = await db.createMap({
          ...createMapData,
          status: MapStatus.FINAL_APPROVAL
        });

        await req.patch({
          url: `admin/maps/${map.id}`,
          status: 204,
          body: {
            status: MapStatus.APPROVED,
            finalLeaderboards: [
              {
                gamemode: Gamemode.RJ,
                trackType: TrackType.MAIN,
                trackNum: 1,
                tier: 1,
                type: LeaderboardType.RANKED
              },
              {
                gamemode: Gamemode.BHOP,
                trackType: TrackType.MAIN,
                trackNum: 1,
                type: LeaderboardType.HIDDEN
              }
            ]
          },
          token: adminToken
        });

        await req.patch({
          url: `admin/maps/${map.id}`,
          status: 400,
          body: {
            leaderboards: [
              {
                gamemode: Gamemode.SJ,
                trackType: TrackType.BONUS,
                trackNum: 1,
                tier: 4,
                type: LeaderboardType.RANKED,
                tags: [MapTag.Portals]
              }
            ]
          },
          token: adminToken
        });
      });

      it('should allow an admin to create leaderboards for new tracks when the map is in testing and was approved', async () => {
        const newZones = structuredClone(BabyZonesStub);
        newZones.tracks.bonuses.push({
          zones: newZones.tracks.main.zones
        });

        const map = await db.createMap({
          ...createMapData,
          status: MapStatus.FINAL_APPROVAL,
          versions: {
            create: {
              versionNum: 1,
              bspHash: createSha1Hash(
                'apple banana cat dog elephant fox grape hat igloo joker'
              ),
              zones: BabyZonesStubString,
              submitterID: u1.id
            }
          }
        });

        await req.patch({
          url: `admin/maps/${map.id}`,
          status: 204,
          body: {
            status: MapStatus.APPROVED,
            finalLeaderboards: [
              {
                gamemode: Gamemode.RJ,
                trackType: TrackType.MAIN,
                trackNum: 1,
                tier: 1,
                type: LeaderboardType.RANKED
              }
            ]
          },
          token: adminToken
        });

        await prisma.mMap.update({
          where: { id: map.id },
          data: {
            status: MapStatus.PUBLIC_TESTING,
            currentVersion: {
              create: {
                mapID: map.id,
                versionNum: 2,
                bspHash: createSha1Hash(
                  'apple banana cat dog elephant fox grape hat igloo joker'
                ),
                zones: JSON.stringify(newZones),
                submitterID: admin.id,
                changelog: 'Oooops'
              }
            }
          }
        });

        await req.patch({
          url: `admin/maps/${map.id}`,
          status: 204,
          body: {
            leaderboards: [
              {
                gamemode: Gamemode.RJ,
                trackType: TrackType.MAIN,
                trackNum: 1,
                tier: 1,
                type: LeaderboardType.RANKED
              },
              {
                gamemode: Gamemode.RJ,
                trackType: TrackType.BONUS,
                trackNum: 1,
                tier: 1,
                type: LeaderboardType.RANKED
              }
            ]
          },
          token: adminToken
        });

        const createdLeaderboards = await prisma.leaderboard.findMany({
          where: { mapID: map.id, trackType: TrackType.BONUS, trackNum: 1 }
        });
        const rankedLb = createdLeaderboards.find(
          (lb) => lb.type === LeaderboardType.RANKED
        );

        assert.notEqual(createdLeaderboards.length, 0);
        assert.ok(rankedLb);
        assert.equal(rankedLb.gamemode, Gamemode.RJ);
      });

      const statuses = Enum.values(MapStatus);
      //prettier-ignore
      const validChanges = new Set([
        `${MapStatus.APPROVED        },${MapStatus.DISABLED        },${Role.MODERATOR}`,
        `${MapStatus.APPROVED        },${MapStatus.DISABLED        },${Role.ADMIN}`,
        `${MapStatus.PRIVATE_TESTING },${MapStatus.DISABLED        },${Role.ADMIN}`,
        `${MapStatus.PRIVATE_TESTING },${MapStatus.DISABLED        },${Role.MODERATOR}`,
        `${MapStatus.CONTENT_APPROVAL},${MapStatus.PUBLIC_TESTING  },${Role.ADMIN}`,
        `${MapStatus.CONTENT_APPROVAL},${MapStatus.PUBLIC_TESTING  },${Role.MODERATOR}`,
        `${MapStatus.CONTENT_APPROVAL},${MapStatus.PUBLIC_TESTING  },${Role.REVIEWER}`,
        `${MapStatus.CONTENT_APPROVAL},${MapStatus.FINAL_APPROVAL  },${Role.MODERATOR}`,
        `${MapStatus.CONTENT_APPROVAL},${MapStatus.FINAL_APPROVAL  },${Role.ADMIN}`,
        `${MapStatus.CONTENT_APPROVAL},${MapStatus.DISABLED        },${Role.MODERATOR}`,
        `${MapStatus.CONTENT_APPROVAL},${MapStatus.DISABLED        },${Role.ADMIN}`,
        `${MapStatus.PUBLIC_TESTING  },${MapStatus.FINAL_APPROVAL  },${Role.MODERATOR}`,
        `${MapStatus.PUBLIC_TESTING  },${MapStatus.FINAL_APPROVAL  },${Role.ADMIN}`,
        `${MapStatus.PUBLIC_TESTING  },${MapStatus.CONTENT_APPROVAL},${Role.MODERATOR}`,
        `${MapStatus.PUBLIC_TESTING  },${MapStatus.CONTENT_APPROVAL},${Role.ADMIN}`,
        `${MapStatus.PUBLIC_TESTING  },${MapStatus.DISABLED        },${Role.MODERATOR}`,
        `${MapStatus.PUBLIC_TESTING  },${MapStatus.DISABLED        },${Role.ADMIN}`,
        `${MapStatus.FINAL_APPROVAL  },${MapStatus.APPROVED        },${Role.MODERATOR}`,
        `${MapStatus.FINAL_APPROVAL  },${MapStatus.APPROVED        },${Role.ADMIN}`,
        `${MapStatus.FINAL_APPROVAL  },${MapStatus.DISABLED        },${Role.MODERATOR}`,
        `${MapStatus.FINAL_APPROVAL  },${MapStatus.DISABLED        },${Role.ADMIN}`,
        `${MapStatus.DISABLED        },${MapStatus.PRIVATE_TESTING },${Role.ADMIN}`,
        `${MapStatus.DISABLED        },${MapStatus.CONTENT_APPROVAL},${Role.ADMIN}`,
        `${MapStatus.DISABLED        },${MapStatus.PUBLIC_TESTING  },${Role.ADMIN}`,
        `${MapStatus.DISABLED        },${MapStatus.FINAL_APPROVAL  },${Role.ADMIN}`
        // Disabled -> Approved should fail if hasn't been approved once before.
        // This isn't the case for this map, so should fail.
      ]);

      for (const s1 of statuses) {
        for (const s2 of statuses.filter((s) => s !== s1)) {
          for (const role of [Role.MODERATOR, Role.ADMIN, Role.REVIEWER]) {
            const shouldPass = validChanges.has(`${s1},${s2},${role}`);

            it(`should ${shouldPass ? '' : 'not '}allow a ${
              role === Role.ADMIN
                ? 'admin'
                : role === Role.MODERATOR
                  ? 'mod'
                  : 'reviewer'
            } to change a map from ${MapStatus[s1]} to ${
              MapStatus[s2]
            }`, async () => {
              const bspBuffer = readFileSync(path.join(FILES_PATH, 'map.bsp'));

              const map = await db.createMap({
                ...createMapData,
                versions: {
                  create: {
                    zones: BabyZonesStubString,
                    versionNum: 1,
                    bspHash: createSha1Hash(bspBuffer),
                    submitterID: u1.id
                  }
                },
                status: s1,
                reviews: {
                  createMany: {
                    data: [
                      {
                        mainText: 'h',
                        approves: true,
                        reviewerID: admin.id
                      }
                    ]
                  }
                }
              });

              await prisma.mMap.update({
                where: { id: map.id },
                data: { currentVersionID: map.versions[0].id }
              });

              // Annoying to have to do this for every test but FA -> Approved
              // will throw otherwise.
              await fileStore.add(
                `submissions/${map.versions[0].id}.bsp`,
                bspBuffer
              );

              await req.patch({
                url: `admin/maps/${map.id}`,
                status: shouldPass ? 204 : 403,
                body: {
                  status: s2,
                  finalLeaderboards:
                    s2 === MapStatus.APPROVED
                      ? [
                          {
                            gamemode: Gamemode.RJ,
                            trackNum: 1,
                            trackType: 0,
                            tier: 1,
                            type: LeaderboardType.RANKED
                          }
                        ]
                      : undefined
                },
                token:
                  role === Role.ADMIN
                    ? adminToken
                    : role === Role.MODERATOR
                      ? modToken
                      : reviewerToken
              });

              if (shouldPass) {
                const updatedMap = await prisma.mMap.findUnique({
                  where: { id: map.id }
                });
                assert.equal(updatedMap.status, s2);
              }
            });
          }
        }
      }

      // Above nonsense tested the inverse of this
      it("should allow an admin to change a map from DISABLED to FINAL APPROVAL if it's been previously approved", async () => {
        const bspBuffer = readFileSync(path.join(FILES_PATH, 'map.bsp'));

        const map = await db.createMap({
          ...createMapData,
          versions: {
            create: {
              zones: BabyZonesStubString,
              versionNum: 1,
              bspHash: createSha1Hash(bspBuffer),
              submitterID: u1.id
            }
          },
          status: MapStatus.DISABLED
        });

        await prisma.mMap.update({
          where: { id: map.id },
          data: {
            currentVersionID: map.versions[0].id,
            submission: {
              update: {
                dates: {
                  create: [
                    {
                      status: MapStatus.APPROVED,
                      date: new Date(Date.now() - 2000),
                      user: { connect: { id: admin.id } }
                    },
                    {
                      status: MapStatus.DISABLED,
                      date: new Date(Date.now() - 1000),
                      user: { connect: { id: admin.id } }
                    }
                  ]
                }
              }
            }
          }
        });

        // Annoying to have to do this for every test but FA -> Approved
        // will throw otherwise.
        await fileStore.add(`submissions/${map.versions[0].id}.bsp`, bspBuffer);

        await req.patch({
          url: `admin/maps/${map.id}`,
          status: 204,
          body: {
            status: MapStatus.APPROVED,
            finalLeaderboards: [
              {
                gamemode: Gamemode.RJ,
                trackNum: 1,
                trackType: 0,
                tier: 1,
                type: LeaderboardType.RANKED
              }
            ]
          },
          token: adminToken
        });

        const updatedMap = await prisma.mMap.findUnique({
          where: { id: map.id }
        });
        assert.equal(updatedMap.status, MapStatus.APPROVED);
      });

      it('should create placeholder accounts and wipe placeholder json after map status changed from FA to approved', async () => {
        const bspBuffer = readFileSync(path.join(FILES_PATH, 'map.bsp'));

        const map = await db.createMap({
          ...createMapData,
          versions: {
            create: {
              versionNum: 1,
              bspHash: createSha1Hash(bspBuffer),
              zones: BabyZonesStubString,
              submitterID: u1.id
            }
          },
          submission: {
            create: {
              ...createMapData.submission.create,
              placeholders: [
                {
                  type: MapCreditType.CONTRIBUTOR,
                  alias: 'Bungus',
                  description: 'What'
                }
              ]
            }
          },
          status: MapStatus.FINAL_APPROVAL
        });

        await prisma.mMap.update({
          where: { id: map.id },
          data: { currentVersionID: map.versions[0].id }
        });

        await fileStore.add(`submissions/${map.versions[0].id}.bsp`, bspBuffer);

        await req.patch({
          url: `admin/maps/${map.id}`,
          status: 204,
          body: {
            status: MapStatus.APPROVED,
            finalLeaderboards: [
              {
                gamemode: Gamemode.RJ,
                trackType: TrackType.MAIN,
                trackNum: 1,
                tier: 1,
                type: LeaderboardType.UNRANKED
              }
            ]
          },
          token: adminToken
        });

        const bungus = await prisma.user.findFirst({
          where: { alias: 'Bungus' },
          include: { mapCredits: true }
        });

        assert.partialDeepStrictEqual(bungus, {
          mapCredits: [
            {
              mapID: map.id,
              type: MapCreditType.CONTRIBUTOR,
              description: 'What'
            }
          ]
        });

        const submission = await prisma.mapSubmission.findUnique({
          where: { mapID: map.id }
        });
        assert.partialDeepStrictEqual(submission.placeholders, []);
      });

      it('should delete pending test requests and their notifications changing from PRIVATE_TESTING to DISABLED', async () => {
        const map = await db.createMap({
          ...createMapData,
          status: MapStatus.PRIVATE_TESTING,
          testInvites: {
            createMany: {
              data: [
                {
                  userID: u2.id,
                  state: MapTestInviteState.UNREAD
                },
                {
                  userID: u3.id,
                  state: MapTestInviteState.ACCEPTED
                }
              ]
            }
          }
        });
        await prisma.notification.create({
          data: {
            notifiedUserID: u2.id,
            type: NotificationType.MAP_TESTING_INVITE,
            mapID: map.id,
            userID: map.submitterID
          }
        });
        await req.patch({
          url: `admin/maps/${map.id}`,
          status: 204,
          body: { status: MapStatus.DISABLED },
          token: adminToken
        });
        const notifs = await prisma.notification.findMany({
          where: {
            type: NotificationType.MAP_TESTING_INVITE,
            mapID: map.id
          }
        });
        assert.equal(notifs.length, 0);
        const updatedMap = await prisma.mMap.findUnique({
          where: { id: map.id },
          include: { testInvites: true }
        });
        assert.partialDeepStrictEqual(updatedMap.testInvites, [
          { userID: u3.id, state: MapTestInviteState.ACCEPTED }
        ]);
      });

      describe('Map Approval', () => {
        let map: E2ETestMMap;
        const finalLeaderboards = [
          {
            gamemode: Gamemode.RJ,
            trackType: TrackType.MAIN,
            trackNum: 1,
            tier: 5,
            type: LeaderboardType.UNRANKED,
            tags: [MapTag.Sync]
          },
          {
            gamemode: Gamemode.DEFRAG_VQ3,
            trackType: TrackType.BONUS,
            trackNum: 1,
            tier: 5,
            type: LeaderboardType.RANKED,
            tags: [MapTag.Strafe]
          },
          {
            gamemode: Gamemode.DEFRAG_CPM,
            trackType: TrackType.BONUS,
            trackNum: 1,
            type: LeaderboardType.HIDDEN
          }
        ];

        // cleanup for this is done in outer afterEach
        beforeEach(async () => {
          map = await db.createMap({
            ...createMapData,
            versions: {
              createMany: {
                data: [
                  {
                    versionNum: 1,
                    bspHash,
                    zones: ZonesStubString,
                    bspDownloadId: randomUUID(),
                    vmfDownloadId: randomUUID(),
                    submitterID: u1.id
                  },
                  {
                    versionNum: 2,
                    bspHash,
                    zones: ZonesStubString,
                    bspDownloadId: randomUUID(),
                    vmfDownloadId: randomUUID(),
                    submitterID: u1.id
                  }
                ]
              }
            },
            leaderboards: { createMany: { data: [] } },
            status: MapStatus.FINAL_APPROVAL,
            submission: {
              create: {
                type: MapSubmissionType.ORIGINAL,
                dates: {
                  create: [
                    {
                      status: MapStatus.PRIVATE_TESTING,
                      date: new Date(),
                      user: { connect: { id: u1.id } }
                    }
                  ]
                },
                suggestions: [
                  {
                    gamemode: Gamemode.RJ,
                    trackType: TrackType.MAIN,
                    trackNum: 1,
                    tier: 1,
                    type: LeaderboardType.RANKED
                  },
                  {
                    gamemode: Gamemode.DEFRAG_CPM,
                    trackType: TrackType.BONUS,
                    trackNum: 1,
                    tier: 1,
                    type: LeaderboardType.RANKED
                  }
                ]
              }
            }
          });

          const vmfZip = new Zip();
          vmfZip.addFile('map.vmf', vmfBuffer);
          for (const i of [0, 1]) {
            const { bspDownloadId: bspId, vmfDownloadId: vmfId } =
              map.versions[i];
            await fileStore.add(`maps/${vmfId}_VMFs.zip`, vmfZip.toBuffer());
            await fileStore.add(`maps/${bspId}.bsp`, bspBuffer);
          }

          await prisma.leaderboard.createMany({
            data: ZonesStubLeaderboards.map((lb) => ({
              mapID: map.id,
              style: Style.NORMAL,
              type: LeaderboardType.IN_SUBMISSION,
              ...lb
            }))
          });
        });

        it('should delete old version files after map status changed from FA to approved', async () => {
          const bspHash = createSha1Hash(bspBuffer);
          const vmfHash = createSha1Hash(vmfBuffer);

          await req.patch({
            url: `admin/maps/${map.id}`,
            status: 204,
            body: { status: MapStatus.APPROVED, finalLeaderboards },
            token: adminToken
          });

          const updatedMap = await prisma.mMap.findUnique({
            where: { id: map.id },
            include: { currentVersion: true, versions: true }
          });

          assert.partialDeepStrictEqual(updatedMap, {
            status: MapStatus.APPROVED,
            currentVersion: { bspHash, versionNum: 2 }
          });

          const { bspDownloadId: bspId1, vmfDownloadId: vmfId1 } =
            map.versions[0];
          const { bspDownloadId: bspId2, vmfDownloadId: vmfId2 } =
            map.versions[1];
          assert.ok(!(await fileStore.exists(`maps/${bspId1}.bsp`)));
          assert.ok(!(await fileStore.exists(`maps/${vmfId1}_VMFs.zip`)));

          assert.equal(
            createSha1Hash(await fileStore.get(`maps/${bspId2}.bsp`)),
            bspHash
          );
          assert.equal(
            createSha1Hash(
              new Zip(await fileStore.get(`maps/${vmfId2}_VMFs.zip`))
                .getEntry('map.vmf')
                .getData()
            ),
            vmfHash
          );
        });

        it('should create MAP_APPROVED activities for authors after map status changed from FA to approved', async () => {
          await prisma.mapCredit.createMany({
            data: [
              { type: MapCreditType.AUTHOR, mapID: map.id, userID: u1.id },
              { type: MapCreditType.AUTHOR, mapID: map.id, userID: admin.id },
              { type: MapCreditType.AUTHOR, mapID: map.id, userID: mod.id }
            ]
          });

          await req.patch({
            url: `admin/maps/${map.id}`,
            status: 204,
            body: { status: MapStatus.APPROVED, finalLeaderboards },
            token: adminToken
          });

          const mapApprovedActvities = await prisma.activity.findMany({
            where: { type: ActivityType.MAP_APPROVED, data: map.id }
          });

          assert.equal(mapApprovedActvities.length, 3);
          assert.deepEqual(
            mapApprovedActvities.map((activity) => activity.userID).sort(),
            [u1.id, admin.id, mod.id].sort()
          );
        });

        it('should send a notification to the map submitter on approval', async () => {
          await req.patch({
            url: `admin/maps/${map.id}`,
            status: 204,
            body: { status: MapStatus.APPROVED, finalLeaderboards },
            token: adminToken
          });

          const notifs = await prisma.notification.findMany({
            where: { mapID: map.id, type: NotificationType.MAP_STATUS_CHANGE }
          });
          assert.equal(notifs.length, 1);
          assert.partialDeepStrictEqual(notifs[0], {
            notifiedUserID: map.submitterID,
            userID: admin.id,
            json: {
              oldStatus: MapStatus.FINAL_APPROVAL,
              newStatus: MapStatus.APPROVED
            }
          });
        });

        it('should create leaderboards based on finalLeaderboards and clear all existing', async () => {
          await db.createLbRun({
            map,
            user: u1,
            gamemode: Gamemode.RJ,
            trackType: TrackType.MAIN,
            trackNum: 1
          });

          await db.createLbRun({
            map,
            user: u1,
            gamemode: Gamemode.CONC,
            trackType: TrackType.MAIN,
            trackNum: 1
          });

          assert.equal(
            (
              await prisma.leaderboardRun.findMany({
                where: { mapID: map.id, gamemode: Gamemode.RJ }
              })
            ).length,
            1
          );

          assert.equal(
            (
              await prisma.leaderboardRun.findMany({
                where: { mapID: map.id, gamemode: Gamemode.CONC }
              })
            ).length,
            1
          );

          await req.patch({
            url: `admin/maps/${map.id}`,
            status: 204,
            body: { status: MapStatus.APPROVED, finalLeaderboards },
            token: adminToken
          });

          const leaderboards = await prisma.leaderboard.findMany({
            where: { mapID: map.id }
          });
          assert.ok(
            matchesPartial(
              leaderboards,
              arrayContaining([
                {
                  mapID: map.id,
                  gamemode: Gamemode.RJ,
                  trackType: TrackType.MAIN,
                  trackNum: 1,
                  linear: false,
                  style: Style.NORMAL,
                  tier: 5,
                  type: LeaderboardType.UNRANKED,
                  tags: [MapTag.Sync]
                },
                {
                  mapID: map.id,
                  gamemode: Gamemode.RJ,
                  trackType: TrackType.STAGE,
                  trackNum: 1,
                  linear: null,
                  tier: null,
                  type: LeaderboardType.UNRANKED,
                  style: Style.NORMAL,
                  tags: []
                },
                {
                  mapID: map.id,
                  gamemode: Gamemode.RJ,
                  trackType: TrackType.STAGE,
                  trackNum: 2,
                  linear: null,
                  tier: null,
                  type: LeaderboardType.UNRANKED,
                  style: Style.NORMAL,
                  tags: []
                },
                {
                  mapID: map.id,
                  gamemode: Gamemode.DEFRAG_VQ3,
                  trackType: TrackType.BONUS,
                  trackNum: 1,
                  linear: null,
                  tier: 5,
                  type: LeaderboardType.RANKED,
                  style: Style.NORMAL,
                  tags: [MapTag.Strafe]
                },
                {
                  mapID: map.id,
                  gamemode: Gamemode.DEFRAG_CPM,
                  trackType: TrackType.BONUS,
                  trackNum: 1,
                  linear: null,
                  tier: null,
                  type: LeaderboardType.HIDDEN,
                  style: Style.NORMAL,
                  tags: []
                }
              ])
            )
          );

          assert.equal(leaderboards.length, 5);

          assert.equal(
            (
              await prisma.leaderboardRun.findMany({
                where: { mapID: map.id, gamemode: Gamemode.RJ }
              })
            ).length,
            0
          );

          assert.equal(
            (
              await prisma.leaderboardRun.findMany({
                where: { mapID: map.id, gamemode: Gamemode.CONC }
              })
            ).length,
            0
          );
        });

        it('should 400 if map has unresolved reviews', async () => {
          await prisma.mapReview.create({
            data: {
              resolved: false,
              mainText:
                'I hated this map. ' +
                'Hated hated hated hated hated this map. Hated it. ' +
                'Hated every simpering stupid vacant player-insulting stage of it',
              imageIDs: ['1'],
              mmap: { connect: { id: map.id } },
              reviewer: { connect: { id: mod.id } }
            }
          });

          await req.patch({
            url: `admin/maps/${map.id}`,
            status: 400,
            body: { status: MapStatus.APPROVED, finalLeaderboards },
            token: adminToken
          });
        });

        it('should succeed if map has resolved=null reviews', async () => {
          await prisma.mapReview.create({
            data: {
              resolved: null,
              mainText:
                'Was there no one connected with this project who read the ' +
                'screenplay, considered the story, evaluated the proposed map and vomited?',
              imageIDs: ['1'],
              mmap: { connect: { id: map.id } },
              reviewer: { connect: { id: mod.id } }
            }
          });

          await req.patch({
            url: `admin/maps/${map.id}`,
            status: 204,
            body: { status: MapStatus.APPROVED, finalLeaderboards },
            token: adminToken
          });
        });

        it('should generate new map list version files', async () => {
          // This is just stored in memory so we can't test this without calling
          // another endpoint. In future we could probably just peer inside of
          // Redis.
          const oldVersion = await req.get({
            url: 'maps/maplistversion',
            status: 200,
            token: adminToken
          });

          await req.patch({
            url: `admin/maps/${map.id}`,
            status: 204,
            body: { status: MapStatus.APPROVED, finalLeaderboards },
            token: adminToken
          });

          await checkScheduledMapListUpdates();

          const newVersion = await req.get({
            url: 'maps/maplistversion',
            status: 200,
            token: adminToken
          });

          assert.equal(newVersion.body.approved, oldVersion.body.approved + 1);
          assert.equal(
            newVersion.body.submissions,
            oldVersion.body.submissions + 1
          );

          const approved = await fileStore.getMapListVersion(
            FlatMapList.APPROVED,
            newVersion.body.approved
          );
          assert.equal(approved.ident, 'MSML');
          assert.equal(approved.numMaps, 1);
          assert.equal(approved.data.length, 1);
          assert.ok(
            matchesPartial(approved.data[0], {
              id: map.id,
              leaderboards: anything(),
              info: anything()
            })
          );
          assert.ok(!Object.hasOwn(approved.data[0], 'zones'));

          const submission = await fileStore.getMapListVersion(
            FlatMapList.SUBMISSION,
            newVersion.body.submissions
          );
          assert.equal(submission.ident, 'MSML');
          assert.equal(submission.numMaps, 0);
          assert.equal(submission.data.length, 0);
        });

        it('should 400 when moving from FA to approved if leaderboards are not provided', async () => {
          await req.patch({
            url: `admin/maps/${map.id}`,
            status: 400,
            body: { status: MapStatus.APPROVED },
            token: adminToken
          });
        });
      });

      it('should generate a new map list version file without the map when the map gets disabled', async () => {
        const oldVersion = await req.get({
          url: 'maps/maplistversion',
          status: 200,
          token: adminToken
        });

        const map1 = await db.createMap({
          ...createMapData,
          status: MapStatus.APPROVED
        });

        const map2 = await db.createMap({
          ...createMapData,
          name: 'surf_thisfileistoobig',
          status: MapStatus.APPROVED
        });

        await req.patch({
          url: `admin/maps/${map1.id}`,
          status: 204,
          body: { status: MapStatus.DISABLED },
          token: adminToken
        });

        await checkScheduledMapListUpdates();

        const newVersion = await req.get({
          url: 'maps/maplistversion',
          status: 200,
          token: adminToken
        });

        assert.equal(newVersion.body.submissions, oldVersion.body.submissions);
        assert.equal(newVersion.body.approved, oldVersion.body.approved + 1);

        const { ident, numMaps, data } = await fileStore.getMapListVersion(
          FlatMapList.APPROVED,
          newVersion.body.approved
        );
        assert.equal(ident, 'MSML');
        assert.equal(numMaps, 1);
        assert.equal(data.length, 1);
        assert.equal(data[0].id, map2.id);
      });

      it('should return 404 if map not found', async () => {
        await req.patch({
          url: `admin/maps/${NULL_ID}`,
          status: 404,
          body: { status: MapStatus.PUBLIC_TESTING },
          token: adminToken
        });
      });

      it('should return 403 for a non-admin/mod/reviewer access token is given', async () => {
        await req.patch({
          url: `admin/maps/${NULL_ID}`,
          status: 403,
          token: u1Token
        });
      });

      it('should 401 when no access token is provided', async () => {
        await req.unauthorizedTest('admin/maps/1', 'patch');
      });
    });

    describe('DELETE', () => {
      let modToken: string,
        admin: User,
        adminToken: string,
        user: User,
        token: string,
        map: E2ETestMMap;

      before(async () => {
        [modToken, [admin, adminToken], [user, token]] = await Promise.all([
          db.loginNewUser({ data: { roles: Role.MODERATOR } }),
          db.createAndLoginUser({ data: { roles: Role.ADMIN } }),
          db.createAndLoginUser({ data: { roles: Role.MAPPER } })
        ]);
      });

      after(async () => {
        await db.cleanup('leaderboardRun', 'user', 'mMap', 'adminActivity');
      });

      beforeEach(async () => {
        map = await db.createMap({
          name: 'surf_bork',
          status: MapStatus.CONTENT_APPROVAL,
          submitter: { connect: { id: user.id } },
          versions: {
            create: {
              zones: ZonesStubString,
              versionNum: 1,
              bspDownloadId: db.uuid(),
              vmfDownloadId: db.uuid(),
              bspHash: createSha1Hash(Buffer.from('buffer fish')),
              submitter: { connect: { id: user.id } }
            }
          }
        });
      });

      afterEach(async () => {
        await Promise.all([
          db.cleanup('mMap'),
          fileStore.deleteDirectory('/maplist')
        ]);
      });

      it('should completely delete the map and related stored data if map was never approved', async () => {
        const imgID = db.uuid();
        await prisma.mMap.update({
          where: { id: map.id },
          data: { images: [imgID] }
        });

        await fileStore.add(
          bspPath(map.currentVersion.bspDownloadId),
          readFileSync(__dirname + '/../files/map.bsp')
        );

        await fileStore.add(
          vmfsPath(map.currentVersion.vmfDownloadId),
          Buffer.from('bup')
        );

        for (const sizePath of [
          imgSmallPath,
          imgMediumPath,
          imgLargePath,
          imgXlPath
        ]) {
          await fileStore.add(
            sizePath(imgID),
            readFileSync(__dirname + '/../files/image_jpg.jpg')
          );
        }

        for (const sizePath of [
          imgSmallPath,
          imgMediumPath,
          imgLargePath,
          imgXlPath
        ]) {
          assert.ok(await fileStore.exists(sizePath(imgID)));
        }

        const run = await db.createLbRun({
          map: map,
          user,
          time: 1
        });
        await fileStore.add(runPath(run.replayHash), Buffer.alloc(123));

        await req.del({
          url: `admin/maps/${map.id}`,
          status: 204,
          token: adminToken
        });

        const updated = await prisma.mMap.findFirst({
          where: { id: map.id }
        });
        const versions = await prisma.mapVersion.findMany({
          where: { mapID: map.id }
        });

        assert.equal(updated, null);
        assert.equal(versions.length, 0);
        assert.ok(
          !(await fileStore.exists(bspPath(map.currentVersion.bspDownloadId)))
        );
        assert.ok(
          !(await fileStore.exists(vmfsPath(map.currentVersion.vmfDownloadId)))
        );

        const relatedRuns = await prisma.leaderboardRun.findMany({
          where: { mapID: map.id }
        });
        assert.equal(relatedRuns.length, 0);
        assert.ok(!(await fileStore.exists(runPath(run.replayHash))));

        for (const sizePath of [
          imgSmallPath,
          imgMediumPath,
          imgLargePath,
          imgXlPath
        ]) {
          assert.ok(!(await fileStore.exists(sizePath(imgID))));
        }

        await expectAdminActivityWasCreated(
          admin.id,
          AdminActivityType.MAP_CONTENT_DELETE
        );
      });

      it('should successfully disable the map and related files if map was approved', async () => {
        await prisma.mapInfo.update({
          where: { mapID: map.id },
          data: { approvedDate: new Date() }
        });

        const imgID = db.uuid();
        await prisma.mMap.update({
          where: { id: map.id },
          data: { images: [imgID], status: MapStatus.APPROVED }
        });

        await fileStore.add(
          bspPath(map.currentVersion.bspDownloadId),
          readFileSync(__dirname + '/../files/map.bsp')
        );

        await fileStore.add(
          vmfsPath(map.currentVersion.vmfDownloadId),
          Buffer.from('bup')
        );

        for (const sizePath of [
          imgSmallPath,
          imgMediumPath,
          imgLargePath,
          imgXlPath
        ]) {
          await fileStore.add(
            sizePath(imgID),
            readFileSync(__dirname + '/../files/image_jpg.jpg')
          );
        }

        for (const sizePath of [
          imgSmallPath,
          imgMediumPath,
          imgLargePath,
          imgXlPath
        ]) {
          assert.ok(await fileStore.exists(sizePath(imgID)));
        }

        const run = await db.createLbRun({
          map: map,
          user,
          time: 1
        });
        await fileStore.add(runPath(run.replayHash), Buffer.alloc(123));

        await req.del({
          url: `admin/maps/${map.id}`,
          status: 204,
          token: adminToken
        });

        const updated = await prisma.mMap.findFirst({
          where: { id: map.id },
          include: { versions: { orderBy: { versionNum: 'asc' } } }
        });

        assert.equal(updated.status, MapStatus.DISABLED);
        assert.equal(updated.versions.at(-1).bspHash, null);
        assert.equal(updated.versions.at(-1).bspDownloadId, null);
        assert.equal(updated.versions.at(-1).vmfDownloadId, null);
        assert.ok(
          !(await fileStore.exists(bspPath(map.currentVersion.bspDownloadId)))
        );
        assert.ok(
          !(await fileStore.exists(vmfsPath(map.currentVersion.vmfDownloadId)))
        );

        // We used to delete these, check we don't anymore
        const relatedRuns = await prisma.leaderboardRun.findMany({
          where: { mapID: map.id }
        });
        assert.equal(relatedRuns.length, 1);
        assert.ok(await fileStore.exists(runPath(run.replayHash)));

        for (const sizePath of [
          imgSmallPath,
          imgMediumPath,
          imgLargePath,
          imgXlPath
        ]) {
          assert.ok(!(await fileStore.exists(sizePath(imgID))));
        }

        await expectAdminActivityWasCreated(
          admin.id,
          AdminActivityType.MAP_CONTENT_DELETE
        );
      });

      it('should update the map list version', async () => {
        await checkScheduledMapListUpdates();

        await prisma.mapInfo.update({
          where: { mapID: map.id },
          data: { approvedDate: new Date() }
        });

        await prisma.mMap.update({
          where: { id: map.id },
          data: { status: MapStatus.APPROVED }
        });

        const oldVersion = await req.get({
          url: 'maps/maplistversion',
          status: 200,
          token: adminToken
        });

        await req.del({
          url: `admin/maps/${map.id}`,
          status: 204,
          token: adminToken
        });

        await checkScheduledMapListUpdates();

        const newVersion = await req.get({
          url: 'maps/maplistversion',
          status: 200,
          token: adminToken
        });

        assert.equal(newVersion.body.submissions, oldVersion.body.submissions);
        assert.equal(newVersion.body.approved, oldVersion.body.approved + 1);

        const { ident, numMaps, data } = await fileStore.getMapListVersion(
          FlatMapList.APPROVED,
          newVersion.body.approved
        );
        assert.equal(ident, 'MSML');
        assert.equal(numMaps, 0);
        assert.equal(data.length, 0);
      });

      it('should return 404 if map not found', async () => {
        await req.del({
          url: `admin/maps/${NULL_ID}`,
          status: 404,
          token: adminToken
        });
      });

      it('should return 403 if a non admin access token is given', async () => {
        await req.del({
          url: `admin/maps/${map.id}`,
          status: 403,
          token: token
        });
      });

      it('should return 403 if a mod access token is given', async () => {
        await req.del({
          url: `admin/maps/${map.id}`,
          status: 403,
          token: modToken
        });
      });

      it('should 401 when no access token is provided', async () => {
        await req.unauthorizedTest('admin/maps/1', 'del');
      });
    });
  });
});
