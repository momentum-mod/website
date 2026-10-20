import { mock, after, afterEach, before, describe, it } from 'node:test';
import {
  createSha1Hash,
  FILES_PATH,
  mockDiscordService
} from '@momentum/test-utils';
import * as assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  Gamemode,
  MapCreditType,
  MapStatus,
  MapSubmissionType,
  Role,
  TrackType,
  LeaderboardType,
  MapTag
} from '@momentum/constants';
import { User } from '@momentum/db';
import { ZonesStub, ZonesStubString } from '@momentum/formats/zone';
import * as rxjs from 'rxjs';
import { Routes } from 'discord.js';
import {
  app,
  req,
  db,
  fileStore,
  registerE2ETestFile
} from './support/test-environment';

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

  describe('Discord notifications', () => {
    let user: User,
      token: string,
      adminToken: string,
      createMapData,
      bspBuffer: Buffer,
      restPostMock: ReturnType<typeof mock.method>,
      restPostObservable: rxjs.Subject<void>;

    before(async () => {
      [[user, token], adminToken] = await Promise.all([
        db.createAndLoginUser(),
        db.loginNewUser({ data: { roles: Role.ADMIN } })
      ]);

      createMapData = {
        name: 'surf_map',
        submitter: { connect: { id: user.id } },
        credits: {
          create: {
            type: MapCreditType.AUTHOR,
            user: { connect: { id: user.id } }
          }
        },
        submission: {
          create: {
            placeholders: [
              { type: MapCreditType.AUTHOR, alias: 'The Map Author' }
            ],
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
        leaderboards: { createMany: { data: [] } }
      };

      bspBuffer = readFileSync(path.join(FILES_PATH, 'map.bsp'));

      const discordMock = await mockDiscordService(app);
      restPostMock = discordMock.restPostMock;
      restPostObservable = discordMock.restPostObservable;
    });

    after(async () => {
      await mock.restoreAll();
    });

    afterEach(async () => {
      await Promise.all([db.cleanup('mMap'), restPostMock.mock.resetCalls()]);
    });

    it('should send discord notification when map gets submitted to content approval', async () => {
      await uploadBspToPreSignedUrl(bspBuffer, token);

      await req.postAttach({
        url: 'maps',
        status: 201,
        data: {
          name: 'surf_map',
          info: {
            description: 'mampmampmampmampmampmampmampmamp',
            creationDate: '2022-07-07T18:33:33.000Z'
          },
          submissionType: MapSubmissionType.ORIGINAL,
          placeholders: [
            { alias: 'The Map Author', type: MapCreditType.AUTHOR }
          ],
          suggestions: [
            {
              trackType: TrackType.MAIN,
              trackNum: 1,
              gamemode: Gamemode.SURF,
              tier: 1,
              type: LeaderboardType.RANKED
            },
            {
              trackType: TrackType.BONUS,
              trackNum: 1,
              gamemode: Gamemode.DEFRAG_CPM,
              tier: 1,
              type: LeaderboardType.UNRANKED
            }
          ],
          wantsPrivateTesting: false,
          credits: [
            {
              userID: user.id,
              type: MapCreditType.AUTHOR
            }
          ],
          zones: structuredClone(ZonesStub)
        },
        token
      });

      if (restPostMock.mock.calls.length !== 1) {
        await rxjs.firstValueFrom(restPostObservable);
      }

      const requestBody = restPostMock.mock.calls.at(-1)!.arguments[1];

      const embed = requestBody.body.embeds[0];

      assert.equal(embed.title, createMapData.name);
      assert.equal(
        embed.description,
        `By ${[user.alias, 'The Map Author']
          .sort()
          .map((a) => `**${a}**`)
          .join(', ')}`
      );
    });
    it('should send discord notification when map moves to content approval', async () => {
      const map = await db.createMap({
        ...createMapData,
        status: MapStatus.PRIVATE_TESTING
      });

      await req.patch({
        url: `maps/${map.id}`,
        status: 204,
        body: {
          status: MapStatus.CONTENT_APPROVAL
        },
        token
      });

      if (restPostMock.mock.calls.length !== 1) {
        await rxjs.firstValueFrom(restPostObservable);
      }

      const requestBody = restPostMock.mock.calls.at(-1)!.arguments[1];

      const embed = requestBody.body.embeds[0];

      assert.equal(embed.title, map.name);
      assert.equal(
        embed.description,
        `By ${[user.alias, 'The Map Author']
          .sort()
          .map((a) => `**${a}**`)
          .join(', ')}`
      );
    });

    it('should send discord notification when map is in public testing', async () => {
      const map = await db.createMap({
        ...createMapData,
        status: MapStatus.FINAL_APPROVAL
      });

      await req.patch({
        url: `maps/${map.id}`,
        status: 204,
        body: {
          status: MapStatus.PUBLIC_TESTING
        },
        token
      });
      while (restPostMock.mock.calls.length !== 2) {
        await rxjs.firstValueFrom(restPostObservable);
      }

      const requestBody = restPostMock.mock.calls.at(-1)!.arguments[1];
      assert.ok(requestBody.body.content.includes('123/9121003')); // guild id/message id, see test util discord.util.ts

      const embed = requestBody.body.embeds[0];

      assert.equal(embed.title, map.name);
      assert.equal(
        embed.description,
        `By ${[user.alias, 'The Map Author']
          .sort()
          .map((a) => `**${a}**`)
          .join(', ')}`
      );
    });

    it('should send discord notification when map has been approved', async () => {
      const map = await db.createMap({
        ...createMapData,
        status: MapStatus.FINAL_APPROVAL,
        credits: {
          create: {
            type: MapCreditType.AUTHOR,
            user: { connect: { id: user.id } }
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
              trackType: TrackType.MAIN,
              trackNum: 1,
              gamemode: Gamemode.RJ,
              tier: 1,
              type: LeaderboardType.RANKED
            },
            {
              trackType: TrackType.BONUS,
              trackNum: 1,
              gamemode: Gamemode.DEFRAG_CPM,
              tier: 1,
              type: LeaderboardType.UNRANKED
            }
          ]
        },
        token: adminToken
      });
      if (restPostMock.mock.calls.length !== 1) {
        await rxjs.firstValueFrom(restPostObservable);
      }

      const requestBody = restPostMock.mock.calls.at(-1)!.arguments[1];
      const embed = requestBody.body.embeds[0];

      assert.equal(embed.title, map.name);
      assert.equal(
        embed.description,
        `By ${[user.alias, 'The Map Author']
          .sort()
          .map((a) => `**${a}**`)
          .join(', ')}`
      );
    });

    it('should send multiple discord notifications for different gamemodes', async () => {
      const map = await db.createMap({
        ...createMapData,
        status: MapStatus.FINAL_APPROVAL,
        submission: {
          create: {
            ...createMapData.submission.create,
            suggestions: [
              {
                trackType: TrackType.MAIN,
                trackNum: 1,
                gamemode: Gamemode.RJ,
                tier: 1,
                type: LeaderboardType.RANKED
              },
              {
                trackType: TrackType.MAIN,
                trackNum: 1,
                gamemode: Gamemode.CONC,
                tier: 1,
                type: LeaderboardType.UNRANKED
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
        }
      });

      await req.patch({
        url: `admin/maps/${map.id}`,
        status: 204,
        body: {
          status: MapStatus.APPROVED,
          finalLeaderboards: [
            {
              trackType: TrackType.MAIN,
              trackNum: 1,
              gamemode: Gamemode.RJ,
              tier: 1,
              type: LeaderboardType.RANKED
            },
            {
              trackType: TrackType.MAIN,
              trackNum: 1,
              gamemode: Gamemode.CONC,
              tier: 1,
              type: LeaderboardType.UNRANKED
            },
            {
              trackType: TrackType.BONUS,
              trackNum: 1,
              gamemode: Gamemode.DEFRAG_CPM,
              tier: 1,
              type: LeaderboardType.UNRANKED
            }
          ]
        },
        token: adminToken
      });

      while (restPostMock.mock.calls.length !== 2) {
        await rxjs.firstValueFrom(restPostObservable);
      }

      const requestUrls = restPostMock.mock.calls.map(
        (call) => call.arguments[0]
      );
      assert.deepEqual(
        requestUrls.sort(),
        [Gamemode.CONC, Gamemode.RJ].map((gm) =>
          Routes.channelMessages(gm.toString())
        )
      );

      const requestBody = restPostMock.mock.calls.at(-1)!.arguments[1];
      const embed = requestBody.body.embeds[0];

      assert.equal(embed.title, map.name);
      assert.equal(
        embed.description,
        `By ${[user.alias, 'The Map Author']
          .sort()
          .map((a) => `**${a}**`)
          .join(', ')}`
      );
    });
  });
});
