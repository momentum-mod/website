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
  createSha1Hash,
  FILES_PATH,
  futureDateOffset,
  mockDiscordService,
  NULL_ID,
  resetKillswitches
} from '@momentum/test-utils';
import * as assert from 'node:assert/strict';

// See auth.e2e-spec.ts for justification of this sin
import { MapReviewDto } from '../../backend/src/app/dto';
import { readFileSync } from 'node:fs';
import { MMap, User } from '@momentum/db';
import {
  Gamemode,
  MapStatus,
  NotificationType,
  Role,
  TrackType,
  MapSubmissionType
} from '@momentum/constants';
import path from 'node:path';
import * as rxjs from 'rxjs';
import {
  app,
  prisma,
  req,
  db,
  fileStore,
  registerE2ETestFile
} from './support/test-environment';

describe('Maps Part 2', () => {
  registerE2ETestFile();

  describe('maps/{mapID}/reviews', () => {
    describe('GET', () => {
      let u1, u1Token, u2, u2Token, map, reviewOfficial, reviewUnofficial;
      before(async () => {
        [[u1, u1Token], [u2, u2Token]] = await Promise.all([
          db.createAndLoginUser({ data: { roles: Role.MAPPER } }),
          db.createAndLoginUser({ data: { roles: Role.REVIEWER } })
        ]);

        map = await db.createMap({
          status: MapStatus.PUBLIC_TESTING,
          submitter: { connect: { id: u1.id } }
        });

        // Official review
        reviewOfficial = await prisma.mapReview.create({
          data: {
            mainText: 'Great map!',
            suggestions: [
              {
                trackType: TrackType.MAIN,
                trackNum: 1,
                gamemode: Gamemode.SURF,
                tier: 2,
                comment: 'What',
                gameplayRating: 5
              }
            ],
            mmap: { connect: { id: map.id } },
            reviewer: { connect: { id: u2.id } },
            resolver: { connect: { id: u1.id } },
            resolved: true
          }
        });

        // Unofficial review
        reviewUnofficial = await prisma.mapReview.create({
          data: {
            mainText: 'Wow, what a shit map.',
            suggestions: [
              {
                trackType: TrackType.MAIN,
                trackNum: 1,
                gamemode: Gamemode.SURF,
                tier: 9,
                comment: 'The second ramp gave me cholera',
                gameplayRating: 1
              }
            ],
            mmap: { connect: { id: map.id } },
            reviewer: { connect: { id: u1.id } },
            resolved: true,
            createdAt: futureDateOffset(1000),
            comments: {
              createMany: {
                data: [
                  { text: 'idiot', userID: u2.id },
                  { text: 'why would you write this', userID: u2.id },
                  { text: 'get off your computer', userID: u2.id },
                  { text: 'people like you make me sick', userID: u2.id },
                  { text: 'sorry just kidding', userID: u2.id }
                ]
              }
            }
          }
        });
      });

      after(async () => {
        await db.cleanup('mMap', 'user');
      });

      it('should return all reviews associated to the given map', async () => {
        const response = await req.get({
          url: `maps/${map.id}/reviews`,
          status: 200,
          validatePaged: { type: MapReviewDto, count: 2 },
          token: u1Token
        });
        assert.partialDeepStrictEqual(response.body.data[0], {
          mainText: 'Wow, what a shit map.',
          mapID: map.id
        });
      });

      it('should include a given number of comments', async () => {
        const response = await req.get({
          url: `maps/${map.id}/reviews`,
          query: { comments: 5 },
          status: 200,
          validatePaged: { type: MapReviewDto, count: 2 },
          token: u1Token
        });

        assert.partialDeepStrictEqual(response.body.data, [
          {
            mainText: 'Wow, what a shit map.',
            numComments: 5,
            comments: [
              { userID: u2.id },
              { userID: u2.id },
              { userID: u2.id },
              { userID: u2.id },
              { userID: u2.id }
            ]
          },
          {
            mainText: 'Great map!',
            mapID: map.id,
            numComments: 0
          }
        ]);
      });

      it('should return the reviews associated to the given map expanding the map information', async () => {
        await req.expandTest({
          url: `maps/${map.id}/reviews`,
          token: u1Token,
          expand: 'map',
          validate: MapReviewDto,
          paged: true,
          expectedPropertyName: 'map'
        });
      });

      it('should return the reviews associated to the given map expanding the author information', async () => {
        await req.expandTest({
          url: `maps/${map.id}/reviews`,
          token: u1Token,
          expand: 'reviewer',
          validate: MapReviewDto,
          paged: true,
          expectedPropertyName: 'reviewer'
        });
      });

      it('should return the reviews associated to the given map expanding the resolver information', async () => {
        await req.expandTest({
          url: `maps/${map.id}/reviews`,
          token: u1Token,
          expand: 'resolver',
          validate: MapReviewDto,
          paged: true,
          some: true,
          expectedPropertyName: 'resolver'
        });
      });

      it('should return the official reviews associated to the given map', async () => {
        const response = await req.get({
          url: `maps/${map.id}/reviews`,
          status: 200,
          validatePaged: { type: MapReviewDto, count: 1 },
          query: { official: true },
          token: u1Token
        });
        assert.partialDeepStrictEqual(response.body.data[0], {
          mainText: reviewOfficial.mainText,
          mapID: reviewOfficial.mapID
        });
      });

      it('should return the unofficial reviews associated to the given map', async () => {
        const response = await req.get({
          url: `maps/${map.id}/reviews`,
          status: 200,
          validatePaged: { type: MapReviewDto, count: 1 },
          query: { official: false },
          token: u2Token
        });
        assert.partialDeepStrictEqual(response.body.data[0], {
          mainText: reviewUnofficial.mainText,
          mapID: reviewUnofficial.mapID
        });
      });

      it('should return the official reviews including reviewers', async () => {
        const response = await req.get({
          url: `maps/${map.id}/reviews`,
          status: 200,
          validatePaged: { type: MapReviewDto, count: 1 },
          query: { official: true, expand: 'reviewer' },
          token: u1Token
        });
        assert.ok(Object.hasOwn(response.body.data[0], 'reviewer'));
        assert.partialDeepStrictEqual(response.body.data[0], {
          mainText: reviewOfficial.mainText,
          mapID: reviewOfficial.mapID
        });
      });

      // Test that permissions checks are getting called
      it('should 403 if the user does not have permission to access to the map', async () => {
        await prisma.mMap.update({
          where: { id: map.id },
          data: { status: MapStatus.PRIVATE_TESTING }
        });

        await req.get({
          url: `maps/${map.id}/reviews`,
          status: 403,
          token: u2Token
        });

        await prisma.mMap.update({
          where: { id: map.id },
          data: { status: MapStatus.APPROVED }
        });
      });

      it('should return 404 for a nonexistent map', async () => {
        await req.get({
          url: `maps/${NULL_ID}/reviews`,
          status: 404,
          token: u1Token
        });
      });
    });

    describe('POST', () => {
      let normalUser: User,
        normalToken: string,
        reviewerToken: string,
        miscUser: User,
        pubTestMap: MMap,
        privTestMap: MMap;

      before(async () => {
        [[normalUser, normalToken], reviewerToken, miscUser] =
          await Promise.all([
            db.createAndLoginUser(),
            db.loginNewUser({ data: { roles: Role.REVIEWER } }),
            db.createUser()
          ]);
      });

      beforeEach(async () => {
        pubTestMap = await db.createMap({
          status: MapStatus.PUBLIC_TESTING,
          submission: { create: { type: MapSubmissionType.ORIGINAL } },
          submitter: { connect: { id: miscUser.id } },
          reviewStats: { create: {} }
        });

        privTestMap = await db.createMap({
          status: MapStatus.PRIVATE_TESTING,
          submitter: { connect: { id: miscUser.id } },
          reviewStats: { create: {} }
        });
      });

      after(async () => {
        await db.cleanup('user');
      });

      afterEach(async () => {
        await db.cleanup('mMap', 'notification');
      });

      it('should successfully create a review', async () => {
        const imageBuffer = readFileSync(
          path.join(FILES_PATH, 'image_jpg.jpg')
        );
        const imageHash = createSha1Hash(imageBuffer);

        const res = await req.postAttach({
          url: `maps/${pubTestMap.id}/reviews`,
          status: 201,
          files: [
            { file: imageBuffer, field: 'images', fileName: 'hello.jpg' }
          ],
          data: {
            mainText: 'Please add conc',
            suggestions: [
              {
                gamemode: Gamemode.AHOP,
                trackType: 0,
                trackNum: 1,
                tier: 1,
                gameplayRating: 1
              }
            ]
          },
          validate: MapReviewDto,
          token: normalToken
        });

        const imageUrl = res.body.images[0];
        const image = await fileStore.downloadHttp(imageUrl);
        assert.equal(createSha1Hash(image), imageHash);
      });

      it('should create a MAP_REVIEW_POSTED notification for the submitter', async () => {
        const res = await req.postAttach({
          url: `maps/${pubTestMap.id}/reviews`,
          status: 201,
          data: {
            mainText:
              'course 1 gave me an anuyresm anurism thing when ur braign pops',
            suggestions: [
              {
                gamemode: Gamemode.AHOP,
                trackType: 0,
                trackNum: 1,
                tier: 1,
                gameplayRating: 1
              }
            ]
          },
          validate: MapReviewDto,
          token: normalToken
        });
        const notifs = await prisma.notification.findMany({
          where: {
            notifiedUserID: miscUser.id,
            type: NotificationType.MAP_REVIEW_POSTED,
            userID: normalUser.id,
            mapID: pubTestMap.id,
            reviewID: res.body.id
          }
        });
        assert.partialDeepStrictEqual(notifs, [
          {
            notifiedUserID: miscUser.id,
            type: NotificationType.MAP_REVIEW_POSTED,
            userID: normalUser.id,
            mapID: pubTestMap.id,
            reviewID: res.body.id
          }
        ]);
      });

      it('should 503 if killswitch guard is active for maps', async () => {
        const adminToken = await db.loginNewUser({
          data: { roles: Role.ADMIN }
        });

        await req.patch({
          url: 'admin/killswitch',
          status: 204,
          body: {
            MAP_REVIEWS: true
          },
          token: adminToken
        });

        const imageBuffer = readFileSync(
          path.join(FILES_PATH, 'image_jpg.jpg')
        );

        await req.postAttach({
          url: `maps/${pubTestMap.id}/reviews`,
          status: 503,
          files: [
            { file: imageBuffer, field: 'images', fileName: 'hello.jpg' }
          ],
          data: {
            mainText: 'Please add conc',
            suggestions: [
              {
                gamemode: Gamemode.AHOP,
                trackType: 0,
                trackNum: 1,
                tier: 1,
                gameplayRating: 1
              }
            ]
          },
          token: normalToken
        });

        await resetKillswitches(req, adminToken);
      });

      it('should succeed with no images', async () => {
        await req.postAttach({
          url: `maps/${pubTestMap.id}/reviews`,
          status: 201,
          data: {
            mainText: 'Please add conc',
            suggestions: [
              {
                gamemode: Gamemode.AHOP,
                trackType: 0,
                trackNum: 1,
                tier: 1,
                gameplayRating: 1
              }
            ]
          },
          validate: MapReviewDto,
          token: normalToken
        });
      });

      it('should 400 for bad suggestions', async () => {
        await req.postAttach({
          url: `maps/${pubTestMap.id}/reviews`,
          status: 400,
          data: {
            mainText: 'Please add conc',
            suggestions: [
              {
                gamemode: Gamemode.AHOP,
                trackType: 0,
                trackNum: 10000,
                tier: 1,
                gameplayRating: 1
              }
            ]
          },
          token: normalToken
        });
      });

      it('should not allow a regular user to set needsResolving', async () => {
        await req.postAttach({
          url: `maps/${pubTestMap.id}/reviews`,
          status: 403,
          data: { mainText: 'Please add conc', needsResolving: true },
          token: normalToken
        });
      });

      it('should allow a reviewer user to set needsResolving', async () => {
        await req.postAttach({
          url: `maps/${pubTestMap.id}/reviews`,
          status: 201,
          data: { mainText: 'Please add conc', needsResolving: true },
          validate: MapReviewDto,
          token: reviewerToken
        });
      });

      it('should not allow a regular user to set approves', async () => {
        await req.postAttach({
          url: `maps/${pubTestMap.id}/reviews`,
          status: 403,
          data: { mainText: 'Please add gronc', approves: true },
          token: normalToken
        });
      });

      it('should allow a reviewer user to set approves', async () => {
        await req.postAttach({
          url: `maps/${pubTestMap.id}/reviews`,
          status: 201,
          data: { mainText: 'Please add gronc', approves: true },
          validate: MapReviewDto,
          token: reviewerToken
        });
      });

      it('should update stats', async () => {
        const before = await prisma.mapReviewStats.findUnique({
          where: { mapID: pubTestMap.id }
        });
        assert.partialDeepStrictEqual(before, {
          total: 0,
          approvals: 0,
          resolved: 0,
          unresolved: 0
        });

        await req.postAttach({
          url: `maps/${pubTestMap.id}/reviews`,
          status: 201,
          data: { mainText: 'Please add dogs', approves: true },
          validate: MapReviewDto,
          token: reviewerToken
        });

        const after1 = await prisma.mapReviewStats.findUnique({
          where: { mapID: pubTestMap.id }
        });
        assert.partialDeepStrictEqual(after1, {
          total: 1,
          approvals: 1,
          resolved: 0,
          unresolved: 0
        });

        await req.postAttach({
          url: `maps/${pubTestMap.id}/reviews`,
          status: 201,
          data: { mainText: 'remove the dogs idiot', needsResolving: true },
          validate: MapReviewDto,
          token: reviewerToken
        });

        const after2 = await prisma.mapReviewStats.findUnique({
          where: { mapID: pubTestMap.id }
        });
        assert.partialDeepStrictEqual(after2, {
          total: 2,
          approvals: 1,
          resolved: 0,
          unresolved: 1
        });
      });

      it('should 400 if image is too large', async () => {
        await req.postAttach({
          url: `maps/${pubTestMap.id}/reviews`,
          status: 400,
          files: [
            {
              file: readFileSync(path.join(FILES_PATH, 'very_large_image.jpg')),
              field: 'images',
              fileName: 'hello.jpg'
            }
          ],
          data: { mainText: 'Please add conc' },
          token: normalToken
        });
      });

      it('should return 404 for trying to post a review for a nonexistent map', async () => {
        await req.postAttach({
          url: `maps/${NULL_ID}/reviews`,
          status: 404,
          data: { mainText: 'let me iiiiiin' },
          token: normalToken
        });
      });

      // Sufficient to test getMapAndCheckReadAccess is being called
      it('should return 403 for a review on a map in private testing without an invite', async () => {
        await req.postAttach({
          url: `maps/${privTestMap.id}/reviews`,
          status: 403,
          data: { mainText: 'PLEAAAASE LET ME INNN' },
          token: normalToken
        });
      });

      it('should 401 when no access token is provided', async () => {
        await req.unauthorizedTest('maps/1/reviews', 'post');
      });

      describe('Discord notifications', () => {
        let restPostMock: ReturnType<typeof mock.method>,
          restPostObservable: rxjs.Subject<void>;

        before(async () => {
          const discordMock = await mockDiscordService(app);
          restPostMock = discordMock.restPostMock;
          restPostObservable = discordMock.restPostObservable;
        });

        after(async () => {
          await mock.restoreAll();
        });
        afterEach(async () => {
          await restPostMock.mock.resetCalls();
        });

        it('should send a review to discord thread', async () => {
          await prisma.mapSubmission.update({
            where: { mapID: pubTestMap.id },
            data: {
              discordReviewThread: '5242003' // Ends with 003 - public thread. See discord.util.ts
            }
          });

          const reviewDesctiption = 'Please add conc';
          void req.postAttach({
            url: `maps/${pubTestMap.id}/reviews`,
            status: 201,
            data: {
              mainText: reviewDesctiption,
              suggestions: [
                {
                  gamemode: Gamemode.AHOP,
                  trackType: 0,
                  trackNum: 1,
                  tier: 1,
                  gameplayRating: 1
                }
              ]
            },
            validate: MapReviewDto,
            token: normalToken
          });

          await rxjs.firstValueFrom(restPostObservable);
          assert.equal(restPostMock.mock.callCount(), 1);

          const requestBody = restPostMock.mock.calls.at(-1)!.arguments[1];
          const embed = requestBody.body.embeds[0];
          assert.equal(embed.description, reviewDesctiption);
        });
      });
    });
  });
});
