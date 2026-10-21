import {
  mock,
  after,
  afterEach,
  before,
  beforeEach,
  describe,
  it
} from 'node:test';
import {
  arrayContaining,
  createSha1Hash,
  FILES_PATH,
  matchesPartial,
  NULL_ID,
  objectContaining,
  randomString
} from '@momentum/test-utils';
import * as assert from 'node:assert/strict';
import { Config } from '../../backend/src/app/config';
import { MapDto } from '../../backend/src/app/dto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  Ban,
  MapStatuses,
  Gamemode,
  MapCreditType,
  MapStatus,
  MapSubmissionType,
  MapTestInviteState,
  MIN_PUBLIC_TESTING_DURATION,
  NotificationType,
  Role,
  TrackType,
  LeaderboardType,
  FlatMapList,
  MapTag,
  runPath,
  bspPath,
  vmfsPath,
  imgSmallPath,
  imgMediumPath,
  imgLargePath,
  imgXlPath,
  MAX_CREDITS_EXCEPT_TESTERS,
  Style,
  GamemodeStyles
} from '@momentum/constants';
import { MapVersion, MMap, Prisma, User } from '@momentum/db';
import Zip from 'adm-zip';
import * as Enum from '@momentum/enum';
import {
  ZonesStub,
  ZonesStubLeaderboards,
  ZonesStubString,
  ZoneStubCompatGamemodes
} from '@momentum/formats/zone';
import { arrayFrom } from '@momentum/util-fn';
import { FileStoreService } from '../../../apps/backend/src/app/modules/filestore/file-store.service';
import {
  app,
  prisma,
  req,
  db,
  fileStore,
  checkScheduledMapListUpdates,
  registerE2ETestFile,
  resetKillswitches
} from './support/e2e-environment';

describe('Maps', () => {
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

  describe('maps/{mapID}', () => {
    describe('GET', () => {
      let u1: User, u1Token: string, u2: User, map;

      before(async () => {
        [[u1, u1Token], u2] = await Promise.all([
          db.createAndLoginUser(),
          db.createUser()
        ]);

        map = await db.createMap({
          name: 'my_epic_map',
          versions: {
            createMany: {
              data: [
                {
                  versionNum: 1,
                  bspHash: createSha1Hash('bats'),
                  submitterID: u1.id
                },
                {
                  versionNum: 2,
                  bspHash: createSha1Hash('wigs'),
                  submitterID: u1.id
                }
              ]
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
                  tier: 1,
                  type: LeaderboardType.RANKED,
                  comment: 'I will kill again'
                }
              ],
              dates: {
                create: [
                  {
                    status: MapStatus.APPROVED,
                    date: new Date(),
                    user: { connect: { id: u1.id } }
                  }
                ]
              }
            }
          },
          reviews: {
            create: {
              reviewer: { connect: { id: u2.id } },
              mainText: 'No! No!!'
            }
          },
          testInvites: {
            create: { userID: u2.id, state: MapTestInviteState.ACCEPTED }
          }
        });

        await prisma.mMap.update({
          where: { id: map.id },
          data: { currentVersion: { connect: { id: map.versions[1].id } } }
        });
      });

      after(async () => {
        await db.cleanup('leaderboardRun', 'pastRun', 'user', 'mMap');
      });

      it('should respond with map data', async () => {
        const res = await req.get({
          url: `maps/${map.id}`,
          status: 200,
          validate: MapDto,
          token: u1Token
        });

        assert.ok(!Object.hasOwn(res.body, 'zones'));
      });

      it('should search by name when passed a string', async () => {
        await req.get({
          url: 'maps/my_epic_map',
          status: 200,
          validate: MapDto,
          token: u1Token
        });
      });

      it('should respond with expanded map data using the credits expand parameter', async () => {
        await prisma.mapCredit.create({
          data: { mapID: map.id, userID: u2.id, type: MapCreditType.AUTHOR }
        });

        await req.expandTest({
          url: `maps/${map.id}`,
          validate: MapDto,
          expand: 'credits',
          expectedPropertyName: 'credits[0].user',
          token: u1Token
        });
      });

      it('should respond with expanded map data using the info expand parameter', async () => {
        await req.expandTest({
          url: `maps/${map.id}`,
          validate: MapDto,
          expand: 'info',
          token: u1Token
        });
      });

      it('should respond with expanded map data using the submitter expand parameter', async () => {
        await prisma.mMap.update({
          where: { id: map.id },
          data: { submitterID: u2.id }
        });

        await req.expandTest({
          url: `maps/${map.id}`,
          validate: MapDto,
          expand: 'submitter',
          token: u1Token
        });
      });

      it('should respond with expanded map data using the submission expand parameter', async () => {
        await req.expandTest({
          url: `maps/${map.id}`,
          validate: MapDto,
          expand: 'submission',
          // Nested dates and author should be included with submission.
          expectedPropertyName: 'submission.dates[0].user',
          token: u1Token
        });
      });

      it('should respond with expanded map data using the stats expand parameter', async () => {
        await req.expandTest({
          url: `maps/${map.id}`,
          validate: MapDto,
          expand: 'stats',
          token: u1Token
        });
      });

      it('should respond with expanded map data using the leaderboards expand parameter', async () => {
        await req.expandTest({
          url: `maps/${map.id}`,
          validate: MapDto,
          expand: 'leaderboards',
          token: u1Token
        });
      });

      it('should respond with expanded map data using the currentVersion expand parameter', async () => {
        await req.expandTest({
          url: `maps/${map.id}`,
          validate: MapDto,
          expand: 'currentVersion',
          token: u1Token
        });
      });

      it('should respond with expanded map data using the testInvites expand parameter', async () => {
        await req.expandTest({
          url: `maps/${map.id}`,
          validate: MapDto,
          expand: 'testInvites',
          expectedPropertyName: 'testInvites[0].user',
          token: u1Token
        });
      });

      it("should respond with expanded map data if the map is in the logged in user's favorites when using the inFavorites expansion", async () => {
        await prisma.mapFavorite.create({
          data: { userID: u1.id, mapID: map.id }
        });

        await req.expandTest({
          url: `maps/${map.id}`,
          validate: MapDto,
          expand: 'inFavorites',
          expectedPropertyName: 'favorites',
          token: u1Token
        });
      });

      it("should respond with the map's WR when requested", async () => {
        await db.createLbRun({
          map: map,
          user: u2,
          time: 5
        });

        const res = await req.get({
          url: `maps/${map.id}`,
          status: 200,
          query: {
            worldRecord: `${Gamemode.AHOP},${TrackType.MAIN},1,${Style.NORMAL}`
          },
          token: u1Token
        });

        assert.partialDeepStrictEqual(res.body, {
          worldRecord: { rank: 1, user: { id: u2.id } }
        });
      });

      it("should respond with the logged in user's PB when requested", async () => {
        await db.createLbRun({
          map: map,
          user: u1,
          time: 10
        });

        const res = await req.get({
          url: `maps/${map.id}`,
          status: 200,
          query: {
            personalBest: `${Gamemode.AHOP},${TrackType.MAIN},1,${Style.NORMAL}`
          },
          token: u1Token
        });

        assert.partialDeepStrictEqual(res.body, {
          personalBest: { rank: 2, user: { id: u1.id } }
        });
      });

      it('should respond with both personalBest and worldRecord when requested', async () => {
        const res = await req.get({
          url: `maps/${map.id}`,
          status: 200,
          query: {
            worldRecord: `${Gamemode.AHOP},${TrackType.MAIN},1,${Style.NORMAL}`,
            personalBest: `${Gamemode.AHOP},${TrackType.MAIN},1,${Style.NORMAL}`
          },
          token: u1Token
        });

        assert.partialDeepStrictEqual(res.body, {
          worldRecord: { rank: 1, user: { id: u2.id } },
          personalBest: { rank: 2, user: { id: u1.id } }
        });
      });

      it('should respond with expanded map data using the submission expand parameter', async () => {
        await req.expandTest({
          url: `maps/${map.id}`,
          validate: MapDto,
          expand: 'submission',
          token: u1Token
        });
      });

      it('should respond with expanded map data using the versions expand parameter', async () => {
        await req.expandTest({
          url: `maps/${map.id}`,
          validate: MapDto,
          expand: 'versions',
          // Nested submitter should be included with versions.
          expectedPropertyName: 'versions[1].submitter',
          token: u1Token
        });
      });

      it('should respond with expanded map data using the versionsWithZones expand parameter', async () => {
        await req.expandTest({
          url: `maps/${map.id}`,
          validate: MapDto,
          expand: 'versionsWithZones',
          expectedPropertyName: 'versions[1].zones',
          token: u1Token
        });
      });

      it('should respond with expanded map data using the currentVersion expand parameter', async () => {
        await req.expandTest({
          url: `maps/${map.id}`,
          validate: MapDto,
          expand: 'currentVersion',
          expectedPropertyName: 'currentVersion',
          token: u1Token
        });
      });

      it('should respond with expanded map data using the currentVersionWithZones expand parameter', async () => {
        await req.expandTest({
          url: `maps/${map.id}`,
          validate: MapDto,
          expand: 'currentVersionWithZones',
          expectedPropertyName: 'currentVersion.zones',
          token: u1Token
        });
      });

      // This test is sufficient to test that getMapAndCheckReadAccess is being
      // called, so we don't need to test the endless variations of states/perms
      // as they're extensively covered by unit tests.
      it('should 403 if the user does not have permission to access to the map', async () => {
        await prisma.mMap.update({
          where: { id: map.id },
          data: { status: MapStatus.PRIVATE_TESTING }
        });

        await req.get({
          url: `maps/${map.id}`,
          status: 403,
          token: u1Token
        });

        await prisma.mMap.update({
          where: { id: map.id },
          data: { status: MapStatus.APPROVED }
        });
      });

      it('should 400 if map id is bigger then max 32-bit integer', async () => {
        await req.get({ url: `maps/${2 ** 31}`, status: 400, token: u1Token });
      });

      it('should 404 if the map is not found', async () => {
        await req.get({ url: `maps/${NULL_ID}`, status: 404, token: u1Token });
      });
    });

    describe('POST', () => {
      let u1: User,
        u1Token: string,
        u2Token: string,
        createInput: Partial<Prisma.MMapCreateInput>,
        map,
        bspBuffer: Buffer,
        bspHash: string,
        vmfBuffer: Buffer,
        vmfHash: string;

      before(async () => {
        [[u1, u1Token], u2Token] = await Promise.all([
          db.createAndLoginUser(),
          db.loginNewUser()
        ]);

        bspBuffer = readFileSync(path.join(FILES_PATH, 'map.bsp'));
        bspHash = createSha1Hash(bspBuffer);

        vmfBuffer = readFileSync(path.join(FILES_PATH, 'map.vmf'));
        vmfHash = createSha1Hash(vmfBuffer);
      });

      after(async () => {
        await db.cleanup('user');
        await fileStore.deleteDirectory('submissions');
        await fileStore.deleteDirectory('upload_tmp');
      });

      beforeEach(async () => {
        createInput = {
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
        };

        map = await db.createMap(createInput, true);
      });

      afterEach(async () => {
        await Promise.all([
          db.cleanup('mMap'),
          fileStore.deleteDirectory('maplist'),
          fileStore.deleteDirectory('upload_tmp')
        ]);
      });

      it('should add a new map version', async () => {
        const changelog = 'Added walls, floors etc...';
        await uploadBspToPreSignedUrl(bspBuffer, u1Token);

        const res = await req.postAttach({
          url: `maps/${map.id}`,
          status: 201,
          data: { changelog, hasBSP: true },
          files: [{ file: vmfBuffer, field: 'vmfs', fileName: 'surf_map.vmf' }],
          validate: MapDto,
          token: u1Token
        });

        assert.ok(
          matchesPartial(res.body, {
            currentVersion: {
              versionNum: 2,
              submitterID: u1.id,
              changelog
            },
            versions: arrayContaining([
              objectContaining({ versionNum: 1 }),
              objectContaining({
                versionNum: 2,
                changelog,
                submitterID: u1.id
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

      it('should upload the BSP and VMF files', async () => {
        const { currentVersion: oldVersion } = await prisma.mMap.findUnique({
          where: { id: map.id },
          include: { currentVersion: true }
        });

        await uploadBspToPreSignedUrl(bspBuffer, u1Token);

        const res = await req.postAttach({
          url: `maps/${map.id}`,
          status: 201,
          data: {
            changelog: 'Added lights, spawn entity etc...',
            hasBSP: true
          },
          files: [{ file: vmfBuffer, field: 'vmfs', fileName: 'surf_map.vmf' }],
          validate: MapDto,
          token: u1Token
        });

        const currentVersion = res.body.currentVersion;
        const newMap = await prisma.mMap.findUnique({
          where: { id: map.id },
          include: { currentVersion: true }
        });

        assert.deepEqual(currentVersion.downloadURL.split('/').slice(-2), [
          'maps',
          `${newMap.currentVersion.bspDownloadId}.bsp`
        ]);
        assert.notDeepEqual(
          newMap.currentVersion.bspDownloadId,
          oldVersion.bspDownloadId
        );

        const bspDownloadBuffer = await fileStore.downloadHttp(
          currentVersion.downloadURL
        );
        const bspDownloadHash = createSha1Hash(bspDownloadBuffer);

        assert.equal(bspHash, currentVersion.bspHash);
        assert.equal(bspDownloadHash, currentVersion.bspHash);

        assert.deepEqual(currentVersion.vmfDownloadURL.split('/').slice(-2), [
          'maps',
          `${newMap.currentVersion.vmfDownloadId}_VMFs.zip`
        ]);
        assert.notDeepEqual(
          newMap.currentVersion.vmfDownloadId,
          oldVersion.vmfDownloadId
        );

        const vmfDownloadBuffer = await fileStore.downloadHttp(
          currentVersion.vmfDownloadURL
        );

        const zip = new Zip(vmfDownloadBuffer);

        const extractedVmf = zip.getEntry('surf_map.vmf').getData();
        assert.equal(createSha1Hash(extractedVmf), vmfHash);
      });

      it('should generate new leaderboards for new zones', async () => {
        await prisma.leaderboard.createMany({
          data: ZonesStubLeaderboards.map((lb) => ({
            mapID: map.id,
            style: lb.style,
            type: LeaderboardType.IN_SUBMISSION,
            ...lb
          }))
        });

        await db.createLbRun({
          map,
          user: u1,
          time: 1,
          gamemode: Gamemode.RJ,
          trackType: TrackType.MAIN,
          trackNum: 1,
          style: Style.NORMAL
        });

        await db.createLbRun({
          map,
          user: u1,
          time: 1,
          gamemode: Gamemode.CONC,
          trackType: TrackType.BONUS,
          trackNum: 1,
          style: Style.NORMAL
        });

        assert.equal(
          (
            await prisma.leaderboardRun.findMany({
              where: {
                mapID: map.id,
                gamemode: Gamemode.RJ,
                style: Style.NORMAL
              }
            })
          ).length,
          1
        );

        assert.equal(
          (
            await prisma.leaderboardRun.findMany({
              where: {
                mapID: map.id,
                gamemode: Gamemode.CONC,
                style: Style.NORMAL
              }
            })
          ).length,
          1
        );

        // Add a third major CP, setting end zone to end of major CP 3 - a
        // mapper could very realistically do this!
        // Then we're gonna delete the bonus. Should get new leaderboard for
        // stage 3, and bonus leaderboards and runs should be deleted.

        const newZones = structuredClone(ZonesStub);

        // Add 3rd major CP
        newZones.tracks.main.zones.segments.push({
          cancel: [],
          checkpointsRequired: true,
          checkpointsOrdered: true,
          limitStartGroundSpeed: true,
          checkpoints: [
            structuredClone(
              newZones.tracks.main.zones.segments[0].checkpoints[0]
            )
          ]
        });

        // Nuke the bonus
        newZones.tracks.bonuses = [];

        await uploadBspToPreSignedUrl(bspBuffer, u1Token);

        await req.postAttach({
          url: `maps/${map.id}`,
          status: 201,
          data: {
            changelog: 'Added Stage 3, removed bonus',
            zones: newZones,
            hasBSP: true
          },
          files: [{ file: vmfBuffer, field: 'vmfs', fileName: 'surf_map.vmf' }],
          validate: MapDto,
          token: u1Token
        });

        const expected = ZoneStubCompatGamemodes.flatMap((gamemode) =>
          GamemodeStyles.get(gamemode)
            .values()
            .toArray()
            .flatMap((style) => [
              {
                gamemode,
                trackType: TrackType.MAIN,
                trackNum: 1,
                style,
                linear: false
              },
              {
                gamemode,
                trackType: TrackType.STAGE,
                trackNum: 1,
                style,
                linear: null
              },
              {
                gamemode,
                trackType: TrackType.STAGE,
                trackNum: 2,
                style,
                linear: null
              },
              {
                gamemode,
                trackType: TrackType.STAGE,
                trackNum: 3,
                style,
                linear: null
              }
            ])
        ).sort();

        const leaderboards = await prisma.leaderboard.findMany({
          where: { mapID: map.id },
          select: {
            gamemode: true,
            trackType: true,
            trackNum: true,
            linear: true,
            style: true
          }
        });

        assert.ok(matchesPartial(leaderboards, arrayContaining(expected)));
        assert.equal(leaderboards.length, expected.length);

        assert.equal(
          (
            await prisma.leaderboardRun.findMany({
              where: {
                mapID: map.id,
                gamemode: Gamemode.RJ,
                style: Style.NORMAL
              }
            })
          ).length,
          1
        );

        assert.equal(
          (
            await prisma.leaderboardRun.findMany({
              where: {
                mapID: map.id,
                gamemode: Gamemode.CONC,
                style: Style.NORMAL
              }
            })
          ).length,
          0
        );
      });

      it('should 503 if killswitch guard is active for maps/{mapID}', async () => {
        const adminToken = await db.loginNewUser({
          data: { roles: Role.ADMIN }
        });

        const changelog = 'Will delete map';

        await req.patch({
          url: 'admin/killswitch',
          status: 204,
          body: {
            MAP_SUBMISSION: true
          },
          token: adminToken
        });

        await req.postAttach({
          url: `maps/${map.id}`,
          status: 503,
          data: { changelog, hasBSP: true },
          files: [{ file: vmfBuffer, field: 'vmfs', fileName: 'surf_map.vmf' }],
          token: u1Token
        });

        await resetKillswitches();
      });

      it('should not update the map list version for private submissions', async () => {
        const oldListVersion = await req.get({
          url: 'maps/maplistversion',
          status: 200,
          token: u1Token
        });

        await uploadBspToPreSignedUrl(bspBuffer, u1Token);

        await req.postAttach({
          url: `maps/${map.id}`,
          status: 201,
          data: { changelog: 'haha i am making ur thing update', hasBSP: true },
          files: [{ file: vmfBuffer, field: 'vmfs', fileName: 'surf_map.vmf' }],
          token: u1Token
        });

        await checkScheduledMapListUpdates();

        const newListVersion = await req.get({
          url: 'maps/maplistversion',
          status: 200,
          token: u1Token
        });

        assert.equal(
          newListVersion.body.approved,
          oldListVersion.body.approved
        );
        assert.equal(
          newListVersion.body.submissions,
          oldListVersion.body.submissions
        );
      });

      it('should update the map list version for submissions for a public map', async () => {
        await prisma.mMap.update({
          where: { id: map.id },
          data: { status: MapStatus.PUBLIC_TESTING }
        });

        const oldListVersion = await req.get({
          url: 'maps/maplistversion',
          status: 200,
          token: u1Token
        });

        await uploadBspToPreSignedUrl(bspBuffer, u1Token);

        await req.postAttach({
          url: `maps/${map.id}`,
          status: 201,
          data: { changelog: 'haha i am making ur thing update', hasBSP: true },
          files: [{ file: vmfBuffer, field: 'vmfs', fileName: 'surf_map.vmf' }],
          token: u1Token
        });

        await checkScheduledMapListUpdates();

        const newListVersion = await req.get({
          url: 'maps/maplistversion',
          status: 200,
          token: u1Token
        });

        assert.equal(
          newListVersion.body.approved,
          oldListVersion.body.approved
        );
        assert.equal(
          newListVersion.body.submissions,
          oldListVersion.body.submissions + 1
        );

        const { ident, numMaps, data } = await fileStore.getMapListVersion(
          FlatMapList.SUBMISSION,
          newListVersion.body.submissions
        );
        assert.equal(ident, 'MSML');
        assert.equal(numMaps, 1);
        assert.equal(data.length, 1);
        assert.equal(data[0].id, map.id);
        assert.ok(!Object.hasOwn(data[0], 'zones'));
      });

      it('should retry map list update if it fails', async () => {
        await prisma.mMap.update({
          where: { id: map.id },
          data: { status: MapStatus.PUBLIC_TESTING }
        });

        const oldListVersion = await req.get({
          url: 'maps/maplistversion',
          status: 200,
          token: u1Token
        });

        await uploadBspToPreSignedUrl(bspBuffer, u1Token);

        await req.postAttach({
          url: `maps/${map.id}`,
          status: 201,
          data: { changelog: 'haha i am making ur thing update', hasBSP: true },
          files: [{ file: vmfBuffer, field: 'vmfs', fileName: 'surf_map.vmf' }],
          token: u1Token
        });

        const storeFileMock = mock.method(
          app.get(FileStoreService),
          'storeFile'
        );
        storeFileMock.mock.mockImplementation(() =>
          Promise.reject('Your storage no worky (((')
        );

        await checkScheduledMapListUpdates();

        let newListVersion = await req.get({
          url: 'maps/maplistversion',
          status: 200,
          token: u1Token
        });

        assert.equal(
          newListVersion.body.approved,
          oldListVersion.body.approved
        );
        assert.equal(
          newListVersion.body.submissions,
          oldListVersion.body.submissions
        );

        storeFileMock.mock.restore();

        await checkScheduledMapListUpdates();

        newListVersion = await req.get({
          url: 'maps/maplistversion',
          status: 200,
          token: u1Token
        });

        assert.equal(
          newListVersion.body.approved,
          oldListVersion.body.approved
        );
        assert.equal(
          newListVersion.body.submissions,
          oldListVersion.body.submissions + 1
        );
      });

      it('should 400 for bad zones', async () => {
        await uploadBspToPreSignedUrl(bspBuffer, u1Token);

        const zones = structuredClone(ZonesStub);
        zones.tracks.main.zones.segments[0].checkpoints[0].regions[0].points = [
          [0, 0],
          [1, 0],
          [0, 1],
          [1, 1]
        ];
        await req.postAttach({
          url: `maps/${map.id}`,
          status: 400,
          data: {
            changelog: 'done fucked it',
            zones,
            hasBSP: true
          },
          files: [{ file: vmfBuffer, field: 'vmfs', fileName: 'surf_map.vmf' }],
          token: u1Token
        });
      });

      it('should 404 if the map does not exist', async () => {
        await req.postAttach({
          url: `maps/${NULL_ID}`,
          status: 404,
          data: { changelog: 'what is this' },
          files: [{ file: vmfBuffer, field: 'vmfs', fileName: 'surf_map.vmf' }],
          token: u2Token
        });
      });

      it('should 403 if the user is not the map submitter', async () => {
        await req.postAttach({
          url: `maps/${map.id}`,
          status: 403,
          data: { changelog: 'let me touch your map' },
          files: [{ file: vmfBuffer, field: 'vmfs', fileName: 'surf_map.vmf' }],
          token: u2Token
        });
      });

      it('should 403 if the user has a MAP_SUBMISSION ban', async () => {
        await prisma.user.update({
          where: { id: u1.id },
          data: { bans: Ban.MAP_SUBMISSION }
        });

        await req.postAttach({
          url: `maps/${map.id}`,
          status: 403,
          data: { changelog: 'guhhh' },
          files: [{ file: vmfBuffer, field: 'vmfs', fileName: 'surf_map.vmf' }],
          token: u1Token
        });

        await prisma.user.update({
          where: { id: u1.id },
          data: { bans: 0 }
        });
      });

      it('should succeed if only the VMF file is provided', async () => {
        const { currentVersion: oldVersion } = await prisma.mMap.findUnique({
          where: { id: map.id },
          include: { currentVersion: true }
        });

        await req.postAttach({
          url: `maps/${map.id}`,
          status: 201,
          data: { changelog: 'who needs tests anyway' },
          files: [{ file: vmfBuffer, field: 'vmfs', fileName: 'surf_map.vmf' }],
          token: u1Token
        });

        const { currentVersion: newVersion } = await prisma.mMap.findUnique({
          where: { id: map.id },
          include: { currentVersion: true }
        });

        assert.deepEqual(oldVersion.bspDownloadId, newVersion.bspDownloadId);
        assert.notDeepEqual(oldVersion.vmfDownloadId, newVersion.vmfDownloadId);
      });

      it('should succeed if only the BSP file is provided', async () => {
        const { currentVersion: oldVersion } = await prisma.mMap.findUnique({
          where: { id: map.id },
          include: { currentVersion: true }
        });

        await uploadBspToPreSignedUrl(bspBuffer, u1Token);

        await req.postAttach({
          url: `maps/${map.id}`,
          status: 201,
          data: { changelog: 'who needs tests anyway', hasBSP: true },
          token: u1Token
        });

        const { currentVersion: newVersion } = await prisma.mMap.findUnique({
          where: { id: map.id },
          include: { currentVersion: true }
        });

        assert.notDeepEqual(oldVersion.bspDownloadId, newVersion.bspDownloadId);
        assert.ok(!newVersion.vmfDownloadId);
      });

      it('should succeed if only zones are provided', async () => {
        const { currentVersion: oldVersion } = await prisma.mMap.findUnique({
          where: { id: map.id },
          include: { currentVersion: true }
        });

        await req.postAttach({
          url: `maps/${map.id}`,
          status: 201,
          data: {
            changelog: 'Mlem',
            zones: structuredClone(ZonesStub)
          },
          validate: MapDto,
          token: u1Token
        });

        const { currentVersion: newVersion } = await prisma.mMap.findUnique({
          where: { id: map.id },
          include: { currentVersion: true }
        });

        assert.deepEqual(oldVersion.bspDownloadId, newVersion.bspDownloadId);
        assert.deepEqual(oldVersion.vmfDownloadId, newVersion.vmfDownloadId);
      });

      it('should allow updating zones when in testing and was approved', async () => {
        await prisma.mMap.update({
          where: { id: map.id },
          data: {
            status: MapStatus.PUBLIC_TESTING,
            info: { update: { approvedDate: new Date() } }
          }
        });

        const zones = structuredClone(ZonesStub);
        zones.tracks.main.zones.segments[0].name = 'Bob';

        await req.postAttach({
          url: `maps/${map.id}`,
          status: 201,
          data: {
            changelog: 'This is one is going to the moon',
            zones
          },
          validate: MapDto,
          token: u1Token
        });
      });

      it('should not allow updating zones that create leaderboards when in testing and was approved', async () => {
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
          url: `maps/${map.id}`,
          status: 400,
          data: {
            changelog: 'New bonus aha',
            zones
          },
          token: u1Token
        });
      });

      it('should 400 if VMF file is invalid', async () => {
        await uploadBspToPreSignedUrl(bspBuffer, u1Token);

        await req.postAttach({
          url: `maps/${map.id}`,
          status: 400,
          data: { changelog: 'just hope it works', hasBSP: true },
          files: [
            {
              file: Buffer.from('{' + vmfBuffer.toString()),
              field: 'vmfs',
              fileName: 'surf_map.vmf'
            }
          ],
          token: u1Token
        });
      });

      it('should 400 if VMF file is invalid and BSP file is missing', async () => {
        await req.postAttach({
          url: `maps/${map.id}`,
          status: 400,
          data: { changelog: 'just hope it works' },
          files: [
            {
              file: Buffer.from('{' + vmfBuffer.toString()),
              field: 'vmfs',
              fileName: 'surf_map.vmf'
            }
          ],
          token: u1Token
        });
      });

      it('should 400 if neither VMF nor BSP nor zones are provided', async () => {
        await req.postAttach({
          url: `maps/${map.id}`,
          status: 400,
          data: { changelog: 'just hope it works' },
          token: u1Token
        });
      });

      it('should 400 if a VMF filename does not end in .vmf', async () => {
        await uploadBspToPreSignedUrl(bspBuffer, u1Token);

        await req.postAttach({
          url: `maps/${map.id}`,
          status: 400,
          data: { changelog: 'shoutout to winrar', hasBSP: true },
          files: [{ file: vmfBuffer, field: 'vmfs', fileName: 'surf_map.rar' }],
          token: u1Token
        });
      });

      it("should 400 if a VMF file is greater than the config's max vmf file size", async () => {
        await uploadBspToPreSignedUrl(bspBuffer, u1Token);

        await req.postAttach({
          url: `maps/${map.id}`,
          status: 400,
          data: { changelog: 'kill me' },
          files: [
            {
              file: Buffer.alloc(Config.limits.vmfSize + 1),
              field: 'vmfs',
              fileName: 'surf_map.vmf'
            }
          ],
          token: u1Token
        });
      });

      it('should 400 if the changelog is missing', async () => {
        await uploadBspToPreSignedUrl(bspBuffer, u1Token);

        await req.postAttach({
          url: `maps/${map.id}`,
          status: 400,
          data: { hasBSP: true },
          files: [{ file: vmfBuffer, field: 'vmfs', fileName: 'surf_map.vmf' }],
          token: u1Token
        });
      });

      it('should ignore BSP file if flag is not set', async () => {
        await uploadBspToPreSignedUrl(bspBuffer.subarray(0, -5), u1Token);

        const oldMap = await prisma.mMap.findUnique({
          where: { id: map.id },
          include: { currentVersion: true }
        });

        await req.postAttach({
          url: `maps/${map.id}`,
          status: 201,
          data: { changelog: 'there is no BSP in this one' },
          files: [{ file: vmfBuffer, field: 'vmfs', fileName: 'surf_map.vmf' }],
          token: u1Token
        });

        const newMap = await prisma.mMap.findUnique({
          where: { id: map.id },
          include: { currentVersion: true }
        });

        assert.deepEqual(
          oldMap.currentVersion.bspHash,
          newMap.currentVersion.bspHash
        );
        assert.deepEqual(
          oldMap.currentVersion.bspDownloadId,
          newMap.currentVersion.bspDownloadId
        );
      });

      it('should 400 if flag is set but BSP was not submitted', async () => {
        const [file] = await fileStore.list(`upload_tmp/${u1.id}`);
        if (file) {
          await fileStore.delete(file);
        }

        await req.postAttach({
          url: `maps/${map.id}`,
          status: 400,
          data: {
            changelog: 'there is no BSP in this one either',
            hasBSP: true
          },
          files: [{ file: vmfBuffer, field: 'vmfs', fileName: 'surf_map.vmf' }],
          token: u1Token
        });
      });

      it('should 409 if map with BSP hash already used by other map gets submitted', async () => {
        const createInput2 = structuredClone(createInput);
        // Pass unique name invariant.
        createInput2.name = 'surf_best';
        // Pretend that previous BSP version is actually unique.
        const map2 = await db.createMap(createInput2, true);

        await uploadBspToPreSignedUrl(bspBuffer, u1Token);

        await req.postAttach({
          url: `maps/${map2.id}`,
          status: 409,
          data: { changelog: 'totally original BSP i swear', hasBSP: true },
          token: u1Token
        });
      });

      for (const status of [MapStatus.APPROVED, MapStatus.DISABLED]) {
        it(`should 403 if the map status is ${MapStatus[status]}`, async () => {
          await prisma.mMap.update({ where: { id: map.id }, data: { status } });

          await req.postAttach({
            url: `maps/${map.id}`,
            status: 403,
            data: { changelog: 'awoooooga' },
            token: u1Token
          });

          await prisma.mMap.update({
            where: { id: map.id },
            data: { status: MapStatus.PRIVATE_TESTING }
          });
        });
      }

      it('should wipe leaderboards if resetLeaderboards is true', async () => {
        await prisma.leaderboard.create({
          data: {
            mmap: { connect: { id: map.id } },
            gamemode: Gamemode.AHOP,
            trackType: TrackType.MAIN,
            trackNum: 1,
            style: Style.NORMAL,
            type: LeaderboardType.IN_SUBMISSION,
            runs: {
              create: {
                userID: u1.id,
                time: 1,
                splits: {}
              }
            }
          }
        });

        assert.equal(
          (
            await prisma.leaderboardRun.findMany({
              where: { mapID: map.id }
            })
          ).length,
          1
        );

        await uploadBspToPreSignedUrl(bspBuffer, u1Token);

        await req.postAttach({
          url: `maps/${map.id}`,
          status: 201,
          data: {
            changelog: 'all your runs SUCK',
            resetLeaderboards: true,
            hasBSP: true
          },
          validate: MapDto,
          token: u1Token
        });

        assert.equal(
          (
            await prisma.leaderboardRun.findMany({
              where: { mapID: map.id }
            })
          ).length,
          0
        );
      });

      it('should wipe leaderboards if resetLeaderboards is false or undefined', async () => {
        await prisma.leaderboard.create({
          data: {
            mmap: { connect: { id: map.id } },
            gamemode: Gamemode.RJ,
            trackType: TrackType.MAIN,
            trackNum: 1,
            style: Style.NORMAL,
            type: LeaderboardType.IN_SUBMISSION,
            runs: {
              create: {
                userID: u1.id,
                time: 1,
                splits: {}
              }
            }
          }
        });

        assert.equal(
          (
            await prisma.leaderboardRun.findMany({
              where: { mapID: map.id }
            })
          ).length,
          1
        );

        await uploadBspToPreSignedUrl(bspBuffer, u1Token);

        await req.postAttach({
          url: `maps/${map.id}`,
          status: 201,
          data: {
            changelog: 'damn these runs are great. i love you guys',
            resetLeaderboards: false,
            hasBSP: true
          },
          validate: MapDto,
          token: u1Token
        });

        await uploadBspToPreSignedUrl(bspBuffer, u1Token);

        await req.postAttach({
          url: `maps/${map.id}`,
          status: 201,
          data: { changelog: 'im so happy right now', hasBSP: true },
          validate: MapDto,
          token: u1Token
        });

        assert.equal(
          (
            await prisma.leaderboardRun.findMany({
              where: { mapID: map.id }
            })
          ).length,
          1
        );
      });

      it('should block resetting leaderboards if the map has previously been approved', async () => {
        await prisma.mMap.update({
          where: { id: map.id },
          data: {
            submission: {
              update: {
                type: MapSubmissionType.ORIGINAL,
                dates: {
                  create: [
                    {
                      status: MapStatus.APPROVED,
                      date: new Date(Date.now() - 3000),
                      user: { connect: { id: u1.id } }
                    },
                    {
                      status: MapStatus.DISABLED,
                      date: new Date(Date.now() - 2000),
                      user: { connect: { id: u1.id } }
                    },
                    {
                      status: MapStatus.PRIVATE_TESTING,
                      date: new Date(Date.now() - 1000),
                      user: { connect: { id: u1.id } }
                    }
                  ]
                }
              }
            },
            info: {
              update: {
                data: {
                  approvedDate: new Date(Date.now() - 3000)
                }
              }
            }
          }
        });

        await prisma.leaderboard.create({
          data: {
            mmap: { connect: { id: map.id } },
            gamemode: Gamemode.AHOP,
            trackType: TrackType.MAIN,
            trackNum: 1,
            style: Style.NORMAL,
            type: LeaderboardType.IN_SUBMISSION,
            runs: {
              create: {
                userID: u1.id,
                time: 1,
                splits: {}
              }
            }
          }
        });

        assert.equal(
          (
            await prisma.leaderboardRun.findMany({
              where: { mapID: map.id }
            })
          ).length,
          1
        );

        await uploadBspToPreSignedUrl(bspBuffer, u1Token);

        await req.postAttach({
          url: `maps/${map.id}`,
          status: 403,
          data: {
            changelog: 'PLEASE let me delete these runs',
            resetLeaderboards: true,
            hasBSP: true
          },
          token: u1Token
        });

        assert.equal(
          (
            await prisma.leaderboardRun.findMany({
              where: { mapID: map.id }
            })
          ).length,
          1
        );
      });

      it('should 400 if map id is bigger then max 32-bit integer', async () => {
        await req.post({ url: `maps/${2 ** 31}`, status: 400, token: u1Token });
      });

      it('should 401 when no access token is provided', async () => {
        await req.unauthorizedTest('maps/1', 'post');
      });
    });

    describe('PATCH', () => {
      let user: User,
        token: string,
        u2: User,
        u2Token: string,
        adminToken: string,
        mod: User,
        modToken: string;
      let createMapData = undefined satisfies Partial<Prisma.MMapCreateInput>;

      before(async () => {
        [[user, token], [u2, u2Token], adminToken, [mod, modToken]] =
          await Promise.all([
            db.createAndLoginUser(),
            db.createAndLoginUser(),
            db.loginNewUser({ data: { roles: Role.ADMIN } }),
            db.createAndLoginUser({ data: { roles: Role.MODERATOR } })
          ]);

        createMapData = {
          name: 'surf_map',
          submitter: { connect: { id: user.id } },
          submission: {
            create: {
              type: MapSubmissionType.ORIGINAL,
              dates: {
                create: [
                  {
                    status: MapStatus.PRIVATE_TESTING,
                    date: new Date(),
                    user: { connect: { id: user.id } }
                  }
                ]
              },
              suggestions: [
                {
                  trackType: TrackType.MAIN,
                  trackNum: 1,
                  gamemode: Gamemode.RJ,
                  tier: 1,
                  type: LeaderboardType.RANKED,
                  tags: [MapTag.Sync]
                },
                {
                  trackType: TrackType.BONUS,
                  trackNum: 1,
                  gamemode: Gamemode.DEFRAG_CPM,
                  tier: 1,
                  type: LeaderboardType.UNRANKED
                }
              ]
            }
          },
          versions: {
            create: {
              zones: ZonesStubString,
              versionNum: 1,
              bspHash: createSha1Hash(Buffer.from('shashashs')),
              submitter: { connect: { id: user.id } }
            }
          },
          leaderboards: { createMany: { data: [] } },
          reviews: {
            createMany: {
              // Create approving review by default so can enter FA
              data: [{ mainText: 'good', approves: true, reviewerID: u2.id }]
            }
          }
        };
      });

      after(async () => {
        await db.cleanup('user');
      });

      afterEach(async () => {
        await Promise.all([
          db.cleanup('mMap'),
          fileStore.deleteDirectory('maplist')
        ]);
      });

      for (const status of MapStatuses.IN_SUBMISSION) {
        it(`should allow the submitter to change most data during ${MapStatus[status]}`, async () => {
          const map = await db.createMap({ ...createMapData, status });

          await req.patch({
            url: `maps/${map.id}`,
            status: 204,
            body: {
              name: 'surf_ostrich',
              submissionType: MapSubmissionType.PORT,
              info: {
                description:
                  'Ostriches are large flightless birds. They are the heaviest living birds, and lay the largest eggs of any living land animal.',
                youtubeID: '8k-zNGuiatA'
              },
              suggestions: [
                {
                  trackType: TrackType.MAIN,
                  trackNum: 1,
                  gamemode: Gamemode.CONC,
                  tier: 1,
                  type: LeaderboardType.RANKED,
                  tags: [MapTag.Juggle]
                },
                {
                  trackType: TrackType.BONUS,
                  trackNum: 1,
                  gamemode: Gamemode.DEFRAG_CPM,
                  tier: 1,
                  type: LeaderboardType.UNRANKED
                }
              ],
              placeholders: [{ type: MapCreditType.CONTRIBUTOR, alias: 'eee' }]
            },
            token
          });

          const updatedMap = await prisma.mMap.findUnique({
            where: { id: map.id },
            include: { info: true, submission: true }
          });

          assert.partialDeepStrictEqual(updatedMap, {
            name: 'surf_ostrich',
            info: {
              description:
                'Ostriches are large flightless birds. They are the heaviest living birds, and lay the largest eggs of any living land animal.',
              youtubeID: '8k-zNGuiatA'
            },
            submission: {
              type: MapSubmissionType.PORT,
              suggestions: [
                {
                  trackType: TrackType.MAIN,
                  trackNum: 1,
                  gamemode: Gamemode.CONC,
                  tier: 1,
                  type: LeaderboardType.RANKED,
                  tags: [MapTag.Juggle]
                },
                {
                  trackType: TrackType.BONUS,
                  trackNum: 1,
                  gamemode: Gamemode.DEFRAG_CPM,
                  tier: 1,
                  type: LeaderboardType.UNRANKED
                }
              ],
              placeholders: [{ type: MapCreditType.CONTRIBUTOR, alias: 'eee' }]
            }
          });
        });
      }

      it('should always 403 if map is APPROVED', async () => {
        const map = await db.createMap({
          ...createMapData,
          status: MapStatus.APPROVED,
          info: {
            create: {
              creationDate: new Date(),
              description: 'Maps have a minimum description length now!!',
              approvedDate: new Date()
            }
          }
        });

        await req.patch({
          url: `maps/${map.id}`,
          status: 403,
          body: {
            info: {
              description: 'Fuck ostriches fuck ostriches fuck ostriches'
            }
          },
          token
        });
      });

      it('should always 403 if map is DISABLED', async () => {
        const map = await db.createMap({
          ...createMapData,
          status: MapStatus.DISABLED
        });

        await req.patch({
          url: `maps/${map.id}`,
          status: 403,
          body: { info: { youtubeID: 'rq9WnDq0ap8' } },
          token
        });
      });

      const statuses = Enum.values(MapStatus);
      // Storing number tuple won't pass .has
      const validChanges = new Set([
        MapStatus.PRIVATE_TESTING + ',' + MapStatus.CONTENT_APPROVAL,
        MapStatus.CONTENT_APPROVAL + ',' + MapStatus.PRIVATE_TESTING,
        MapStatus.FINAL_APPROVAL + ',' + MapStatus.PUBLIC_TESTING
      ]);

      for (const s1 of statuses) {
        for (const s2 of statuses.filter((s) => s !== s1)) {
          const shouldPass = validChanges.has(s1 + ',' + s2);

          it(`should ${
            shouldPass ? '' : 'not '
          }allow a user to change their map from ${MapStatus[s1]} to ${
            MapStatus[s2]
          }`, async () => {
            const map = await db.createMap({
              ...createMapData,
              status: s1,
              submission: {
                create: {
                  type: MapSubmissionType.PORT,
                  suggestions: [
                    {
                      trackType: TrackType.MAIN,
                      trackNum: 1,
                      gamemode: Gamemode.CONC,
                      tier: 1,
                      rtype: LeaderboardType.RANKED
                    },
                    {
                      trackType: TrackType.BONUS,
                      trackNum: 1,
                      gamemode: Gamemode.DEFRAG_CPM,
                      tier: 1,
                      type: LeaderboardType.RANKED
                    }
                  ],
                  dates: {
                    create: [
                      {
                        status: s1,
                        date: new Date(),
                        user: { connect: { id: user.id } }
                      }
                    ]
                  }
                }
              },
              versions: {
                create: {
                  zones: ZonesStubString,
                  versionNum: 1,
                  bspHash: createSha1Hash(Buffer.from('shashashs')),
                  submitter: { connect: { id: user.id } }
                }
              }
            });

            await req.patch({
              url: `maps/${map.id}`,
              status: shouldPass ? 204 : 403,
              body: { status: s2 },
              token
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

      it('should delete pending test requests and their notifications changing from PRIVATE_TESTING to CONTENT_APPROVAL', async () => {
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
                  userID: mod.id,
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
          url: `maps/${map.id}`,
          status: 204,
          body: { status: MapStatus.CONTENT_APPROVAL },
          token
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
          { userID: mod.id, state: MapTestInviteState.ACCEPTED }
        ]);
      });

      it("should allow a user to change to their map from PUBLIC_TESTING to FINAL_APPROVAL if it's been in testing for required time period", async () => {
        const map = await db.createMap({
          ...createMapData,
          status: MapStatus.PUBLIC_TESTING,
          submission: {
            create: {
              dates: {
                create: [
                  {
                    status: MapStatus.PUBLIC_TESTING,
                    date: new Date(
                      Date.now() - (MIN_PUBLIC_TESTING_DURATION + 1000)
                    ),
                    user: { connect: { id: user.id } }
                  }
                ]
              },
              type: MapSubmissionType.PORT,
              suggestions: [
                {
                  trackType: TrackType.MAIN,
                  trackNum: 1,
                  gamemode: Gamemode.DEFRAG_CPM,
                  tier: 10,
                  type: LeaderboardType.RANKED
                },
                {
                  trackType: TrackType.BONUS,
                  trackNum: 1,
                  gamemode: Gamemode.DEFRAG_CPM,
                  tier: 1,
                  type: LeaderboardType.RANKED
                }
              ]
            }
          },
          versions: {
            create: {
              zones: ZonesStubString,
              versionNum: 1,
              bspHash: createSha1Hash(Buffer.from('shashashs')),
              submitter: { connect: { id: user.id } }
            }
          }
        });

        await req.patch({
          url: `maps/${map.id}`,
          status: 204,
          body: { status: MapStatus.FINAL_APPROVAL },
          token
        });

        const updatedMap = await prisma.mMap.findUnique({
          where: { id: map.id }
        });
        assert.equal(updatedMap.status, MapStatus.FINAL_APPROVAL);
      });

      it("should not allow a user to change to their map from PUBLIC_TESTING to FINAL_APPROVAL if it's not been in testing for required time period", async () => {
        const map = await db.createMap({
          ...createMapData,
          status: MapStatus.PUBLIC_TESTING,
          submission: {
            create: {
              dates: {
                create: [
                  {
                    status: MapStatus.PUBLIC_TESTING,
                    date: new Date(Date.now() - 1000),
                    user: { connect: { id: user.id } }
                  }
                ]
              },
              type: MapSubmissionType.PORT,
              suggestions: [
                {
                  trackType: TrackType.MAIN,
                  trackNum: 1,
                  gamemode: Gamemode.DEFRAG_CPM,
                  tier: 10,
                  type: LeaderboardType.RANKED
                },
                {
                  trackType: TrackType.BONUS,
                  trackNum: 1,
                  gamemode: Gamemode.DEFRAG_CPM,
                  tier: 1,
                  type: LeaderboardType.RANKED
                }
              ]
            }
          },
          versions: {
            create: {
              zones: ZonesStubString,
              versionNum: 1,
              bspHash: createSha1Hash(Buffer.from('shashashs')),
              submitter: { connect: { id: user.id } }
            }
          }
        });

        await req.patch({
          url: `maps/${map.id}`,
          status: 403,
          body: { status: MapStatus.FINAL_APPROVAL },
          token
        });
      });

      it("should allow a mod to change to their map from PUBLIC_TESTING to FINAL_APPROVAL if it's not been in testing for required time period", async () => {
        const map = await db.createMap({
          ...createMapData,
          status: MapStatus.PUBLIC_TESTING,
          submitter: { connect: { id: mod.id } },
          submission: {
            create: {
              dates: {
                create: [
                  {
                    status: MapStatus.PUBLIC_TESTING,
                    date: new Date(Date.now() - 1000),
                    user: { connect: { id: mod.id } }
                  }
                ]
              },
              type: MapSubmissionType.PORT,
              suggestions: [
                {
                  trackType: TrackType.MAIN,
                  trackNum: 1,
                  gamemode: Gamemode.DEFRAG_CPM,
                  tier: 10,
                  type: LeaderboardType.RANKED
                },
                {
                  trackType: TrackType.BONUS,
                  trackNum: 1,
                  gamemode: Gamemode.DEFRAG_CPM,
                  tier: 1,
                  type: LeaderboardType.RANKED
                }
              ]
            }
          },
          versions: {
            create: {
              zones: ZonesStubString,
              versionNum: 1,
              bspHash: createSha1Hash(Buffer.from('shashashs')),
              submitter: { connect: { id: user.id } }
            }
          }
        });

        await req.patch({
          url: `maps/${map.id}`,
          status: 204,
          body: { status: MapStatus.FINAL_APPROVAL },
          token: modToken
        });
      });

      it('should allow changing from PUBLIC_TESTING to FINAL_APPROVAL if it has a resolved review', async () => {
        const map = await db.createMap({
          ...createMapData,
          status: MapStatus.PUBLIC_TESTING,
          submission: {
            create: {
              dates: {
                create: [
                  {
                    status: MapStatus.PUBLIC_TESTING,
                    date: new Date(
                      Date.now() - (MIN_PUBLIC_TESTING_DURATION + 1000)
                    ),
                    user: { connect: { id: user.id } }
                  }
                ]
              },
              type: MapSubmissionType.PORT,
              suggestions: [
                {
                  trackType: TrackType.MAIN,
                  trackNum: 1,
                  gamemode: Gamemode.DEFRAG_CPM,
                  tier: 10,
                  type: LeaderboardType.RANKED
                },
                {
                  trackType: TrackType.BONUS,
                  trackNum: 1,
                  gamemode: Gamemode.DEFRAG_CPM,
                  tier: 1,
                  type: LeaderboardType.RANKED
                }
              ]
            }
          }
        });

        await prisma.mapReview.create({
          data: {
            mapID: map.id,
            reviewerID: mod.id,
            mainText: 'help me',
            resolved: true
          }
        });

        await req.patch({
          url: `maps/${map.id}`,
          status: 204,
          body: { status: MapStatus.FINAL_APPROVAL },
          token
        });
      });

      it('should allow changing from PUBLIC_TESTING to FINAL_APPROVAL if it has a neutral review', async () => {
        const data = structuredClone(createMapData);

        data.submission.create.dates.create.push({
          status: MapStatus.PUBLIC_TESTING,
          date: new Date(Date.now() - (MIN_PUBLIC_TESTING_DURATION + 1000)),
          user: { connect: { id: user.id } }
        });

        const map = await db.createMap({
          ...data,
          status: MapStatus.PUBLIC_TESTING
        });

        await prisma.mapReview.create({
          data: {
            mapID: map.id,
            reviewerID: mod.id,
            mainText: 'where am i',
            resolved: null
          }
        });

        await req.patch({
          url: `maps/${map.id}`,
          status: 204,
          body: { status: MapStatus.FINAL_APPROVAL },
          token
        });
      });

      it('should not allow changing from PUBLIC_TESTING to FINAL_APPROVAL if it has unresolved reviews', async () => {
        const data = structuredClone(createMapData);
        data.submission.create.dates.create.push({
          status: MapStatus.PUBLIC_TESTING,
          date: new Date(Date.now() - (MIN_PUBLIC_TESTING_DURATION + 1000)),
          user: { connect: { id: user.id } }
        });

        const map = await db.createMap({
          ...data,
          status: MapStatus.PUBLIC_TESTING
        });

        await prisma.mapReview.create({
          data: {
            mapID: map.id,
            reviewerID: mod.id,
            mainText: 'theres a bomb in my car',
            resolved: false
          }
        });

        await req.patch({
          url: `maps/${map.id}`,
          status: 403,
          body: { status: MapStatus.FINAL_APPROVAL },
          token
        });
      });

      it("should not allow changing from PUBLIC_TESTING to FINAL_APPROVAL if map doesn't have at least one approving review", async () => {
        const data = structuredClone(createMapData);
        data.status = MapStatus.PUBLIC_TESTING;
        data.reviews = { createMany: { data: [] } };
        data.submission.create.dates.create.push({
          status: MapStatus.PUBLIC_TESTING,
          date: new Date(Date.now() - (MIN_PUBLIC_TESTING_DURATION + 1000)),
          user: { connect: { id: user.id } }
        });

        const map = await db.createMap(data);

        await req.patch({
          url: `maps/${map.id}`,
          status: 403,
          body: { status: MapStatus.FINAL_APPROVAL },
          token
        });
      });

      it("should allow changing from PUBLIC_TESTING to FINAL_APPROVAL if map doesn't have at least one approving review if submitter is a mod", async () => {
        const data = structuredClone(createMapData);
        data.status = MapStatus.PUBLIC_TESTING;
        data.reviews = { createMany: { data: [] } };
        data.submitter = { connect: { id: mod.id } };
        data.submission.create.dates.create.push({
          status: MapStatus.PUBLIC_TESTING,
          date: new Date(Date.now() - (MIN_PUBLIC_TESTING_DURATION + 1000)),
          user: { connect: { id: user.id } }
        });

        const map = await db.createMap(data);

        await req.patch({
          url: `maps/${map.id}`,
          status: 204,
          body: { status: MapStatus.FINAL_APPROVAL },
          token: modToken
        });
      });

      it('should generate new leaderboards if suggestions change', async () => {
        const map = await db.createMap({
          ...createMapData,
          status: MapStatus.PRIVATE_TESTING
        });

        await prisma.leaderboard.createMany({
          data: ZonesStubLeaderboards.map((lb) => ({
            mapID: map.id,
            style: Style.NORMAL,
            type: LeaderboardType.IN_SUBMISSION,
            ...lb
          }))
        });

        await db.createLbRun({
          map,
          user,
          time: 1,
          gamemode: Gamemode.CONC,
          trackType: TrackType.MAIN
        });

        // Map starts with main track leaderboards for modes compat with RJ
        // (not bhop), main track suggestion changes to CPM Defrag,
        // which *does* support bhop, check leaderboards are created.
        // Bonus is CPM, so we should have 1 LB before, 4 after.

        assert.equal(
          (
            await prisma.leaderboard.findMany({
              where: {
                mapID: map.id,
                gamemode: Gamemode.BHOP,
                style: Style.NORMAL
              }
            })
          ).length,
          4
        );

        // Conc LBs shouldn't change

        assert.equal(
          (
            await prisma.leaderboard.findMany({
              where: { mapID: map.id, gamemode: Gamemode.CONC }
            })
          ).length,
          4
        );

        await req.patch({
          url: `maps/${map.id}`,
          status: 204,
          body: {
            info: {
              youtubeID: 'Ea992vtCqTs'
            },
            suggestions: [
              {
                trackType: TrackType.MAIN,
                trackNum: 1,
                gamemode: Gamemode.DEFRAG_CPM,
                tier: 10,
                type: LeaderboardType.RANKED
              },
              {
                trackType: TrackType.BONUS,
                trackNum: 1,
                gamemode: Gamemode.DEFRAG_CPM,
                tier: 1,
                type: LeaderboardType.RANKED
              }
            ]
          },
          token
        });

        assert.equal(
          (
            await prisma.leaderboard.findMany({
              where: {
                mapID: map.id,
                gamemode: Gamemode.BHOP,
                style: Style.NORMAL,
                type: LeaderboardType.IN_SUBMISSION
              }
            })
          ).length,
          4
        );

        assert.equal(
          (
            await prisma.leaderboard.findMany({
              where: {
                mapID: map.id,
                gamemode: Gamemode.CONC,
                style: Style.NORMAL,
                type: LeaderboardType.IN_SUBMISSION
              }
            })
          ).length,
          4
        );

        // Check existing runs weren't deleted

        assert.equal(
          (
            await prisma.leaderboardRun.findMany({
              where: { mapID: map.id, gamemode: Gamemode.CONC }
            })
          ).length,
          1
        );
      });

      it('should not allow updating live leaderabords even when in testing', async () => {
        const map = await db.createMap({
          ...createMapData,
          status: MapStatus.PUBLIC_TESTING
        });

        await req.patch({
          url: `maps/${map.id}`,
          status: 403,
          body: {
            leaderboards: [
              {
                trackType: TrackType.MAIN,
                trackNum: 1,
                gamemode: Gamemode.RJ,
                tier: 1,
                type: LeaderboardType.RANKED
              }
            ]
          },
          token
        });
      });

      it('should update the map list version for submissions', async () => {
        const oldListVersion = await req.get({
          url: 'maps/maplistversion',
          status: 200,
          token
        });

        const map = await db.createMap({
          ...createMapData,
          status: MapStatus.PRIVATE_TESTING
        });

        await req.patch({
          url: `maps/${map.id}`,
          status: 204,
          body: { status: MapStatus.CONTENT_APPROVAL },
          token
        });

        await checkScheduledMapListUpdates();

        const newListVersion = await req.get({
          url: 'maps/maplistversion',
          status: 200,
          token
        });

        assert.equal(
          newListVersion.body.approved,
          oldListVersion.body.approved
        );
        assert.equal(
          newListVersion.body.submissions,
          oldListVersion.body.submissions + 1
        );
      });

      it('should not update the map list version if the status doesnt change', async () => {
        const oldListVersion = await req.get({
          url: 'maps/maplistversion',
          status: 200,
          token
        });

        const map = await db.createMap({
          ...createMapData,
          status: MapStatus.PRIVATE_TESTING
        });

        await req.patch({
          url: `maps/${map.id}`,
          status: 204,
          body: {
            status: MapStatus.PRIVATE_TESTING,
            info: {
              youtubeID: '64X4cuAR2fI'
            }
          },
          token
        });

        await checkScheduledMapListUpdates();

        const newListVersion = await req.get({
          url: 'maps/maplistversion',
          status: 200,
          token
        });

        assert.equal(
          newListVersion.body.approved,
          oldListVersion.body.approved
        );
        assert.equal(
          newListVersion.body.submissions,
          oldListVersion.body.submissions
        );
      });

      it('should 400 for invalid suggestions', async () => {
        const map = await db.createMap({
          ...createMapData,
          submitter: { connect: { id: user.id } },
          status: MapStatus.PRIVATE_TESTING
        });

        // Lots of checks here but is unit tested, just remove the bonus
        await req.patch({
          url: `maps/${map.id}`,
          status: 400,
          body: {
            suggestions: [
              {
                trackType: TrackType.MAIN,
                trackNum: 1,
                gamemode: Gamemode.DEFRAG_CPM,
                comment: 'FUCK!!!!',
                tier: 10,
                type: LeaderboardType.RANKED
              }
            ]
          },
          token
        });

        await req.patch({
          url: `maps/${map.id}`,
          status: 400,
          body: {
            suggestions: [
              {
                trackType: TrackType.MAIN,
                trackNum: 1,
                gamemode: Gamemode.DEFRAG_CPM,
                comment: 'FUCK!!!!',
                tier: 10,
                type: LeaderboardType.HIDDEN
              },
              {
                trackType: TrackType.BONUS,
                trackNum: 1,
                gamemode: Gamemode.DEFRAG_CPM,
                tier: 1,
                type: LeaderboardType.IN_SUBMISSION
              }
            ]
          },
          token
        });
      });

      for (const type of [
        MapCreditType.CONTRIBUTOR,
        MapCreditType.SPECIAL_THANKS
      ]) {
        it(`should 400 if there are more than ${MAX_CREDITS_EXCEPT_TESTERS} ${MapCreditType[type]} credits or placeholders`, async () => {
          const map = await db.createMap({
            ...createMapData,
            submitter: { connect: { id: user.id } },
            status: MapStatus.PRIVATE_TESTING,
            credits: {
              create: [
                {
                  userID: u2.id,
                  description: 'Walrus 2',
                  type
                }
              ]
            }
          });

          await req.patch({
            url: `maps/${map.id}`,
            status: 400,
            body: {
              placeholders: arrayFrom(MAX_CREDITS_EXCEPT_TESTERS, () => ({
                alias: randomString(),
                type
              }))
            },
            token
          });
        });
      }

      it('should 400 if suggestions and zones dont match up', async () => {
        const map = await db.createMap({
          ...createMapData,
          status: MapStatus.PRIVATE_TESTING,
          submission: {
            create: {
              type: MapSubmissionType.PORT,
              // No bonus, so should fail
              suggestions: [
                {
                  trackType: TrackType.MAIN,
                  trackNum: 1,
                  gamemode: Gamemode.SURF,
                  tier: 10,
                  type: LeaderboardType.RANKED
                }
              ]
            }
          },
          versions: {
            create: {
              // Has a bonus
              zones: ZonesStubString,
              versionNum: 1,
              bspHash: createSha1Hash(Buffer.from('shashashs')),
              submitter: { connect: { id: user.id } }
            }
          }
        });

        // Try change literally anything, it should 400.
        await req.patch({
          url: `maps/${map.id}`,
          status: 400,
          body: { submission: MapSubmissionType.ORIGINAL },
          token
        });
      });

      it('should return 400 if the status flag is invalid', async () => {
        const map = await db.createMap({
          submitter: { connect: { id: user.id } }
        });

        await req.patch({
          url: `maps/${map.id}`,
          status: 400,
          body: { status: 3000 },
          token
        });
      });

      it('should return 403 if the map was not submitted by that user', async () => {
        const map = await db.createMap({
          status: MapStatus.PRIVATE_TESTING
        });

        await req.patch({
          url: `maps/${map.id}`,
          status: 403,
          body: { status: MapStatus.CONTENT_APPROVAL },
          token: u2Token
        });
      });

      it('should return 403 if the map was not submitted by that user even for an admin', async () => {
        const map = await db.createMap({
          status: MapStatus.PRIVATE_TESTING
        });

        await req.patch({
          url: `maps/${map.id}`,
          status: 403,
          body: { status: MapStatus.CONTENT_APPROVAL },
          token: adminToken
        });
      });

      it('should 404 when the map is not found', async () => {
        await req.patch({
          url: `maps/${NULL_ID}`,
          status: 404,
          body: { status: MapStatus.CONTENT_APPROVAL },
          token
        });
      });

      it('should 401 when no access token is provided', async () => {
        await req.unauthorizedTest('maps/1', 'patch');
      });
    });

    describe('DELETE', () => {
      let user: User,
        token: string,
        map: MMap & {
          currentVersion: MapVersion;
        };

      before(async () => {
        [user, token] = await db.createAndLoginUser();
      });

      beforeEach(async () => {
        map = await db.createMap({
          name: 'surf_man',
          status: MapStatus.CONTENT_APPROVAL,
          submitter: { connect: { id: user.id } },
          versions: {
            create: {
              zones: ZonesStubString,
              versionNum: 1,
              bspDownloadId: db.uuid(),
              vmfDownloadId: db.uuid(),
              bspHash: createSha1Hash(Buffer.from('shashashs')),
              submitter: { connect: { id: user.id } }
            }
          }
        });
      });

      afterEach(async () => {
        await Promise.all([
          db.cleanup('mMap', 'leaderboardRun'),
          fileStore.deleteDirectory('/maplist')
        ]);
      });

      after(async () => {
        await db.cleanup('leaderboardRun', 'user', 'mMap');
      });

      it('should successfully delete a map and all related stored data if map is in submission', async () => {
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
          url: `maps/${map.id}`,
          status: 204,
          token
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
      });

      it('should update the map list version', async () => {
        await checkScheduledMapListUpdates();

        const oldVersion = await req.get({
          url: 'maps/maplistversion',
          status: 200,
          token
        });

        await req.del({
          url: `maps/${map.id}`,
          status: 204,
          token
        });

        await checkScheduledMapListUpdates();

        const newVersion = await req.get({
          url: 'maps/maplistversion',
          status: 200,
          token
        });

        assert.equal(
          newVersion.body.submissions,
          oldVersion.body.submissions + 1
        );
        assert.equal(newVersion.body.approved, oldVersion.body.approved);

        const { ident, numMaps, data } = await fileStore.getMapListVersion(
          FlatMapList.SUBMISSION,
          newVersion.body.submissions
        );
        assert.equal(ident, 'MSML');
        assert.equal(numMaps, 0);
        assert.equal(data.length, 0);
      });

      it('should 403 if map is approved', async () => {
        await prisma.mMap.update({
          where: { id: map.id },
          data: {
            status: MapStatus.APPROVED,
            info: { update: { approvedDate: new Date() } }
          }
        });

        await req.del({
          url: `maps/${map.id}`,
          status: 403,
          token
        });
      });

      it('should 403 if map was ever approved', async () => {
        await prisma.mapInfo.update({
          where: { mapID: map.id },
          data: { approvedDate: new Date() }
        });

        await req.del({
          url: `maps/${map.id}`,
          status: 403,
          token
        });
      });

      it('should 403 if user is not a submitter of the map', async () => {
        const u1Token = await db.loginNewUser();

        await req.del({
          url: `maps/${map.id}`,
          status: 403,
          token: u1Token
        });
      });

      it('should 404 when the map is not found', async () => {
        await req.del({
          url: `maps/${NULL_ID}`,
          status: 404,
          token
        });
      });

      it('should 401 when no access token is provided', async () => {
        await req.unauthorizedTest('maps/1', 'del');
      });
    });
  });
});
