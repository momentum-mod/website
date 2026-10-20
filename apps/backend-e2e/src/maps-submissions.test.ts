import { after, afterEach, before, describe, it } from 'node:test';
import {
  arrayContaining,
  createSha1Hash,
  matchesPartial,
  objectContaining
} from '@momentum/test-utils';
import * as assert from 'node:assert/strict';
import { MapDto } from '../../backend/src/app/dto';
import {
  Gamemode,
  MapCreditType,
  MapStatus,
  MapSubmissionType,
  MapTestInviteState,
  Role,
  TrackType,
  LeaderboardType
} from '@momentum/constants';
import { Prisma, User } from '@momentum/db';
import {
  prisma,
  req,
  db,
  registerE2ETestFile
} from './support/e2e-environment';

describe('Maps', () => {
  registerE2ETestFile();

  describe('maps/submissions', () => {
    describe('GET', () => {
      let u1: User,
        u1Token: string,
        u2: User,
        pubMap1,
        pubMap2,
        privMap,
        caMap,
        faMap,
        mapCreate: Partial<Prisma.MMapCreateInput>;

      before(async () => {
        [[u1, u1Token], u2] = await Promise.all([
          db.createAndLoginUser(),
          db.createUser()
        ]);

        mapCreate = {
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
                  track: 1,
                  trackType: TrackType.MAIN,
                  trackNum: 1,
                  gamemode: Gamemode.CONC,
                  tier: 1,
                  type: LeaderboardType.RANKED,
                  comment: 'My dad made this'
                }
              ]
            }
          },
          versions: {
            createMany: {
              data: [
                {
                  versionNum: 1,
                  bspHash: createSha1Hash('dogs'),
                  submitterID: u1.id
                },
                {
                  versionNum: 2,
                  bspHash: createSha1Hash('elves'),
                  submitterID: u1.id
                }
              ]
            }
          }
        };

        await db.createMap({ status: MapStatus.APPROVED });
        pubMap1 = await db.createMap({
          status: MapStatus.PUBLIC_TESTING,
          ...mapCreate,
          reviews: {
            create: {
              mainText: 'Appalling',
              reviewer: { connect: { id: u2.id } }
            }
          }
        });
        pubMap2 = await db.createMap({
          status: MapStatus.PUBLIC_TESTING,
          ...mapCreate
        });
        privMap = await db.createMap({
          status: MapStatus.PRIVATE_TESTING,
          ...mapCreate
        });
        faMap = await db.createMap({
          status: MapStatus.FINAL_APPROVAL,
          ...mapCreate
        });
        caMap = await db.createMap({
          status: MapStatus.CONTENT_APPROVAL,
          ...mapCreate
        });

        await Promise.all(
          [pubMap1, pubMap2, privMap].map((map) =>
            prisma.mMap.update({
              where: { id: map.id },
              data: { currentVersion: { connect: { id: map.versions[1].id } } }
            })
          )
        );
      });

      after(async () => {
        await db.cleanup('pastRun', 'leaderboardRun', 'user', 'mMap');
      });
      afterEach(async () => {
        await db.cleanup('mapTestInvite', 'mapCredit');
      });

      it('should respond with map data', async () => {
        const res = await req.get({
          url: 'maps/submissions',
          status: 200,
          validatePaged: { type: MapDto },
          token: u1Token
        });

        for (const item of res.body.data) {
          [
            'submission',
            'id',
            'name',
            'status',
            'submitterID',
            'createdAt',
            'updatedAt'
          ].forEach((prop) => assert.ok(Object.hasOwn(item, prop)));
        }
      });

      it('should be ordered by date', async () => {
        await req.sortByDateTest({
          url: 'maps/submissions',
          validate: MapDto,
          token: u1Token
        });
      });

      it('should respond with filtered map data using the take parameter', async () => {
        await req.takeTest({
          url: 'maps/submissions',
          validate: MapDto,
          token: u1Token
        });
      });

      it('should respond with filtered map data using the skip parameter', async () => {
        await req.skipTest({
          url: 'maps/submissions',
          validate: MapDto,
          token: u1Token
        });
      });

      it('should respond with filtered map data using the search parameter', async () => {
        const map = await db.createMap({
          name: 'ahop_asdf',
          status: MapStatus.PUBLIC_TESTING,
          ...mapCreate
        });

        await prisma.mMap.update({
          where: { id: map.id },
          data: { name: 'aaaaa' }
        });

        await req.searchTest({
          url: 'maps/submissions',
          token: u1Token,
          searchMethod: 'contains',
          searchString: 'aa',
          searchPropertyName: 'name',
          validate: { type: MapDto, count: 1 }
        });

        await prisma.mMap.delete({
          where: { id: map.id }
        });
      });

      it('should respond with filtered map data using the searchStartsWith parameter', async () => {
        const map = await db.createMap({
          name: 'surf_the_dog',
          status: MapStatus.PUBLIC_TESTING,
          ...mapCreate
        });

        await prisma.mMap.update({
          where: { id: map.id },
          data: { name: 'bingus' }
        });

        await req.searchTest({
          url: 'maps/submissions',
          token: u1Token,
          searchMethod: 'startsWith',
          searchString: 'bingu',
          searchPropertyName: 'name',
          searchQueryName: 'searchStartsWith',
          validate: { type: MapDto, count: 1 }
        });

        await prisma.mMap.delete({
          where: { id: map.id }
        });
      });

      it('should respond with filtered map data using the submitter id parameter', async () => {
        await prisma.mMap.update({
          where: { id: pubMap1.id },
          data: { submitterID: u2.id }
        });

        const res = await req.get({
          url: 'maps/submissions',
          status: 200,
          query: { submitterID: u2.id },
          validatePaged: { type: MapDto, count: 1 },
          token: u1Token
        });

        assert.partialDeepStrictEqual(res.body.data[0], {
          submitterID: u2.id,
          id: pubMap1.id
        });

        await prisma.mMap.update({
          where: { id: pubMap1.id },
          data: { submitterID: null }
        });
      });

      it('should respond with expanded current version data using the currentVersion expand parameter', async () => {
        await req.expandTest({
          url: 'maps/submissions',
          expand: 'currentVersion',
          paged: true,
          validate: MapDto,
          token: u1Token
        });
      });

      it('should respond with expanded current version data using the currentVersionWithZones expand parameter', async () => {
        await req.expandTest({
          url: 'maps/submissions',
          expand: 'currentVersionWithZones',
          expectedPropertyName: 'currentVersion.zones',
          paged: true,
          validate: MapDto,
          token: u1Token
        });
      });

      it('should respond with expanded versions data using the version expand parameter', async () => {
        const res = await req.expandTest({
          url: 'maps/submissions',
          expand: 'versions',
          expectedPropertyName: 'versions[1]',
          paged: true,
          validate: MapDto,
          token: u1Token
        });

        for (const item of res.body.data) {
          for (const version of item.versions) {
            assert.ok(Object.hasOwn(version, 'id'));
            assert.ok(Object.hasOwn(version, 'downloadURL'));
            assert.ok(Object.hasOwn(version, 'bspHash'));
            assert.ok(Object.hasOwn(version, 'zoneHash'));
            assert.ok(Object.hasOwn(version, 'versionNum'));
            assert.ok(Object.hasOwn(version, 'createdAt'));
            assert.ok(Object.hasOwn(version, 'changelog'));
            assert.ok(!Object.hasOwn(version, 'zones'));
          }
        }
      });

      it('should respond with expanded versions data using the versionsWithZones expand parameter', async () => {
        const res = await req.expandTest({
          url: 'maps/submissions',
          expand: 'versionsWithZones',
          expectedPropertyName: 'versions[1]',
          paged: true,
          validate: MapDto,
          token: u1Token
        });

        for (const item of res.body.data) {
          for (const version of item.versions) {
            assert.ok(Object.hasOwn(version, 'id'));
            assert.ok(Object.hasOwn(version, 'downloadURL'));
            assert.ok(Object.hasOwn(version, 'bspHash'));
            assert.ok(Object.hasOwn(version, 'zoneHash'));
            assert.ok(Object.hasOwn(version, 'versionNum'));
            assert.ok(Object.hasOwn(version, 'createdAt'));
            assert.ok(Object.hasOwn(version, 'changelog'));
            assert.ok(Object.hasOwn(version, 'zones'));
          }
        }
      });

      it('should respond with expanded review data using the reviews expand parameter', async () => {
        await req.expandTest({
          url: 'maps/submissions',
          expand: 'reviews',
          paged: true,
          some: true,
          validate: MapDto,
          token: u1Token
        });
      });

      it('should respond with expanded map data using the credits expand parameter', async () => {
        await prisma.mapCredit.createMany({
          data: [
            { mapID: pubMap1.id, userID: u2.id, type: MapCreditType.AUTHOR }
          ]
        });

        await req.expandTest({
          url: 'maps/submissions',
          expand: 'credits',
          expectedPropertyName: 'credits[0].user', // This should always include user as well
          paged: true,
          some: true,
          validate: MapDto,
          token: u1Token
        });

        await db.cleanup('mapCredit');
      });

      it('should respond with expanded submitter data using the submitter expand parameter', async () => {
        await prisma.mMap.update({
          where: { id: pubMap1.id },
          data: { submitterID: u2.id }
        });

        await req.expandTest({
          url: 'maps/submissions',
          expand: 'submitter',
          paged: true,
          validate: MapDto,
          token: u1Token
        });

        await prisma.mMap.update({
          where: { id: pubMap1.id },
          data: { submitterID: null }
        });
      });

      it('should respond with expanded map data using the stats expand parameter', async () => {
        await req.expandTest({
          url: 'maps/submissions',
          expand: 'stats',
          paged: true,
          validate: MapDto,
          token: u1Token
        });
      });

      it('should respond with expanded map data using the info expand parameter', async () => {
        await req.expandTest({
          url: 'maps/submissions',
          expand: 'info',
          paged: true,
          validate: MapDto,
          token: u1Token
        });
      });

      it("should respond with expanded map data if the map is in the logged in user's favorites when using the inFavorites expansion", async () => {
        await prisma.mapFavorite.create({
          data: { userID: u1.id, mapID: pubMap1.id }
        });

        await req.expandTest({
          url: 'maps/submissions',
          expand: 'inFavorites',
          paged: true,
          validate: MapDto,
          expectedPropertyName: 'favorites',
          token: u1Token,
          some: true
        });
      });

      it('should respond with only pub and fa maps if the user has no special relations', async () => {
        const res = await req.get({
          url: 'maps/submissions',
          status: 200,
          validatePaged: { type: MapDto, count: 3 },
          token: u1Token
        });

        assert.ok(
          matchesPartial(
            res.body.data,
            arrayContaining([
              objectContaining({ id: pubMap1.id }),
              objectContaining({ id: pubMap2.id }),
              objectContaining({ id: faMap.id })
            ])
          )
        );
      });

      it('should include private testing maps for which the user has an accepted invite', async () => {
        await prisma.mapTestInvite.create({
          data: {
            userID: u1.id,
            mapID: privMap.id,
            state: MapTestInviteState.ACCEPTED
          }
        });

        const res = await req.get({
          url: 'maps/submissions',
          status: 200,
          validatePaged: { type: MapDto, count: 4 },
          token: u1Token
        });

        assert.ok(
          matchesPartial(
            res.body.data,
            arrayContaining([
              objectContaining({ id: pubMap1.id }),
              objectContaining({ id: pubMap2.id }),
              objectContaining({ id: faMap.id }),
              objectContaining({ id: privMap.id })
            ])
          )
        );
      });

      it('should not include a private testing map if the user has an declined invite', async () => {
        await prisma.mapTestInvite.create({
          data: {
            userID: u1.id,
            mapID: privMap.id,
            state: MapTestInviteState.DECLINED
          }
        });

        const res = await req.get({
          url: 'maps/submissions',
          status: 200,
          validatePaged: { type: MapDto, count: 3 },
          token: u1Token
        });

        assert.ok(
          matchesPartial(
            res.body.data,
            arrayContaining([
              objectContaining({ id: pubMap1.id }),
              objectContaining({ id: pubMap2.id }),
              objectContaining({ id: faMap.id })
            ])
          )
        );
      });

      it('should include private testing maps for which the user is in the credits', async () => {
        await prisma.mapCredit.create({
          data: {
            userID: u1.id,
            mapID: privMap.id,
            type: MapCreditType.TESTER
          }
        });

        const res = await req.get({
          url: 'maps/submissions',
          status: 200,
          validatePaged: { type: MapDto, count: 4 },
          token: u1Token
        });

        assert.ok(
          matchesPartial(
            res.body.data,
            arrayContaining([
              objectContaining({ id: pubMap1.id }),
              objectContaining({ id: pubMap2.id }),
              objectContaining({ id: faMap.id }),
              objectContaining({ id: privMap.id })
            ])
          )
        );
      });

      it('should include private testing maps for which the user is the submitter', async () => {
        await prisma.mMap.update({
          where: { id: privMap.id },
          data: { submitter: { connect: { id: u1.id } } }
        });

        const res = await req.get({
          url: 'maps/submissions',
          status: 200,
          validatePaged: { type: MapDto, count: 4 },
          token: u1Token
        });

        assert.ok(
          matchesPartial(
            res.body.data,
            arrayContaining([
              objectContaining({ id: pubMap1.id }),
              objectContaining({ id: pubMap2.id }),
              objectContaining({ id: faMap.id }),
              objectContaining({ id: privMap.id })
            ])
          )
        );

        await prisma.mMap.update({
          where: { id: privMap.id },
          data: { submitter: { disconnect: true } }
        });
      });

      it('should include content approval maps for which the user has an accepted invite', async () => {
        await prisma.mapTestInvite.create({
          data: {
            userID: u1.id,
            mapID: caMap.id,
            state: MapTestInviteState.ACCEPTED
          }
        });

        const res = await req.get({
          url: 'maps/submissions',
          status: 200,
          validatePaged: { type: MapDto, count: 4 },
          token: u1Token
        });

        assert.ok(
          matchesPartial(
            res.body.data,
            arrayContaining([
              objectContaining({ id: pubMap1.id }),
              objectContaining({ id: pubMap2.id }),
              objectContaining({ id: faMap.id }),
              objectContaining({ id: caMap.id })
            ])
          )
        );
      });

      it('should not include content approval maps if the user has an declined invite', async () => {
        await prisma.mapTestInvite.create({
          data: {
            userID: u1.id,
            mapID: caMap.id,
            state: MapTestInviteState.DECLINED
          }
        });

        const res = await req.get({
          url: 'maps/submissions',
          status: 200,
          validatePaged: { type: MapDto, count: 3 },
          token: u1Token
        });

        assert.ok(
          matchesPartial(
            res.body.data,
            arrayContaining([
              objectContaining({ id: pubMap1.id }),
              objectContaining({ id: pubMap2.id }),
              objectContaining({ id: faMap.id })
            ])
          )
        );
      });

      it('should include content approval maps for which the user is in the credits', async () => {
        await prisma.mapCredit.create({
          data: {
            userID: u1.id,
            mapID: caMap.id,
            type: MapCreditType.TESTER
          }
        });

        const res = await req.get({
          url: 'maps/submissions',
          status: 200,
          validatePaged: { type: MapDto, count: 4 },
          token: u1Token
        });

        assert.ok(
          matchesPartial(
            res.body.data,
            arrayContaining([
              objectContaining({ id: pubMap1.id }),
              objectContaining({ id: pubMap2.id }),
              objectContaining({ id: faMap.id }),
              objectContaining({ id: caMap.id })
            ])
          )
        );
      });

      it('should include content approval maps for which the user is the submitter', async () => {
        await prisma.mMap.update({
          where: { id: caMap.id },
          data: { submitter: { connect: { id: u1.id } } }
        });

        const res = await req.get({
          url: 'maps/submissions',
          status: 200,
          validatePaged: { type: MapDto, count: 4 },
          token: u1Token
        });

        assert.ok(
          matchesPartial(
            res.body.data,
            arrayContaining([
              objectContaining({ id: pubMap1.id }),
              objectContaining({ id: pubMap2.id }),
              objectContaining({ id: faMap.id }),
              objectContaining({ id: caMap.id })
            ])
          )
        );

        await prisma.mMap.update({
          where: { id: caMap.id },
          data: { submitter: { disconnect: true } }
        });
      });

      it('should filter by public maps when given the public filter', async () => {
        const res = await req.get({
          url: 'maps/submissions',
          status: 200,
          query: { filter: MapStatus.PUBLIC_TESTING },
          validatePaged: { type: MapDto, count: 2 },
          token: u1Token
        });

        assert.ok(
          matchesPartial(
            res.body.data,
            arrayContaining([
              objectContaining({ id: pubMap1.id }),
              objectContaining({ id: pubMap2.id })
            ])
          )
        );
      });

      it('should filter by private maps when given the private filter', async () => {
        await prisma.mapTestInvite.create({
          data: {
            mapID: privMap.id,
            userID: u1.id,
            state: MapTestInviteState.ACCEPTED
          }
        });

        const res = await req.get({
          url: 'maps/submissions',
          status: 200,
          query: { filter: MapStatus.PRIVATE_TESTING },
          validatePaged: { type: MapDto, count: 1 },
          token: u1Token
        });

        assert.ok(
          matchesPartial(res.body.data[0], objectContaining({ id: privMap.id }))
        );
      });

      it('should filter by content approval maps when given the content approval filter', async () => {
        await prisma.user.update({
          where: { id: u1.id },
          data: { roles: Role.REVIEWER }
        });

        const res = await req.get({
          url: 'maps/submissions',
          status: 200,
          query: { filter: MapStatus.CONTENT_APPROVAL },
          validatePaged: { type: MapDto, count: 1 },
          token: u1Token
        });

        assert.ok(
          matchesPartial(res.body.data[0], objectContaining({ id: caMap.id }))
        );

        await prisma.user.update({
          where: { id: u1.id },
          data: { roles: 0 }
        });
      });

      it('should filter by final approval maps when given the final approval filter', async () => {
        const res = await req.get({
          url: 'maps/submissions',
          status: 200,
          query: { filter: MapStatus.FINAL_APPROVAL },
          validatePaged: { type: MapDto, count: 1 },
          token: u1Token
        });

        assert.ok(
          matchesPartial(res.body.data[0], objectContaining({ id: faMap.id }))
        );
      });

      it('should filter by approving reviews when given hasApprovingReview filter', async () => {
        await req.get({
          url: 'maps/submissions',
          status: 200,
          query: { hasApprovingReview: true },
          validatePaged: { type: MapDto, count: 0 },
          token: u1Token
        });

        await prisma.mapReviewStats.update({
          where: { mapID: pubMap1.id },
          data: { approvals: 2, total: { increment: 2 } }
        });

        await req.get({
          url: 'maps/submissions',
          status: 200,
          query: { hasApprovingReview: true },
          validatePaged: { type: MapDto, count: 1 },
          token: u1Token
        });

        await req.get({
          url: 'maps/submissions',
          status: 200,
          query: { hasApprovingReview: false },
          validatePaged: { type: MapDto, count: 2 },
          token: u1Token
        });

        // Cleanup
        await prisma.mapReviewStats.update({
          where: { mapID: pubMap1.id },
          data: { approvals: 0, total: { decrement: 2 } }
        });
      });

      it('should limit -1 take to 100 for non-reviewers', async () => {
        // Magic number sorry, if additional maps are added above in setup
        // this'll break.
        const newMaps = await db
          .createMaps(98, {
            status: MapStatus.PUBLIC_TESTING
          })
          .then((maps) => maps.map((m) => m.id));

        await req.get({
          url: 'maps/submissions',
          status: 200,
          query: { take: -1 },
          validatePaged: { type: MapDto, returnCount: 100, totalCount: 101 },
          token: u1Token
        });

        await prisma.mMap.deleteMany({ where: { id: { in: newMaps } } });
      });

      it('should not limit -1 take reviewers', async () => {
        await prisma.user.update({
          where: { id: u1.id },
          data: { roles: Role.REVIEWER }
        });

        const newMaps = await db
          .createMaps(97, {
            status: MapStatus.PUBLIC_TESTING
          })
          .then((maps) => maps.map((m) => m.id));

        await req.get({
          url: 'maps/submissions',
          status: 200,
          query: { take: -1 },
          validatePaged: { type: MapDto, returnCount: 101, totalCount: 101 },
          token: u1Token
        });

        await prisma.mMap.deleteMany({ where: { id: { in: newMaps } } });
        await prisma.user.update({
          where: { id: u1.id },
          data: { roles: 0 }
        });
      });

      it('should 401 when no access token is provided', async () => {
        await req.unauthorizedTest('maps/submissions', 'get');
      });
    });
  });
});
