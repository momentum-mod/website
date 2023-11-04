/**
 * Ugly script for seeding the DB with faker.js data, useful for frontend developers.
 */

import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';
import * as Random from '@momentum/random';
import { ZoneUtil } from '@momentum/formats';
import {
  ActivityType,
  Ban,
  Gamemode,
  MapCreditType,
  MapStatusNew,
  MapSubmissionSuggestion,
  MapSubmissionDate,
  MapSubmissionType,
  MAX_BIO_LENGTH,
  ReportCategory,
  ReportType,
  Role,
  TrackType,
  MapZones
} from '@momentum/constants';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Bitflags } from '@momentum/bitflags';
import { from, parallel } from '@momentum/util-fn';
import axios from 'axios';
import sharp from 'sharp';
import { nuke } from '../prisma/utils';
import { prismaWrapper } from './prisma-wrapper';
import { createHash } from 'node:crypto';
import { JsonValue } from 'type-fest';
import { readFileSync } from 'node:fs';
import path = require('node:path');

//#region Configuration
const vars = {
  imageFetches: 25,
  users: { min: 100, max: 100 },
  maps: { min: 20, max: 20 },
  usersThatSubmitMaps: { min: 15, max: 20 },
  randomImagesToDownload: { min: 20, max: 20 },
  credits: { min: 2, max: 20 },
  images: { min: 1, max: 5 },
  modesPerLeaderboard: { min: 1, max: 3 },
  majorCPs: { min: 0, max: 5 },
  minorCPs: { min: 0, max: 5 },
  bonusesPerMap: { min: 0, max: 3 },
  testingRequestsPerMap: { min: 0, max: 10 },
  reviewsPerMap: { min: 0, max: 5 },
  submissionPlaceholders: { min: 0, max: 2 },
  submissionVersions: { min: 1, max: 5 },
  suggestions: { min: 1, max: 5 },
  runsPerMap: { min: 1, max: 30 },
  pastRunsPerMap: { min: 1, max: 100 },
  userReportChance: 0.05, // Chance that u1 reports u2 (this game is TOXIC)
  userFollowChance: 0.01,
  mapReportChance: 0.005,
  mapFollowChance: 0.05,
  mapFavoriteChance: 0.05,
  mapStatusWeights: [
    [MapStatusNew.APPROVED, 1],
    [MapStatusNew.PUBLIC_TESTING, 0.2],
    [MapStatusNew.DISABLED, 0.2],
    [MapStatusNew.CONTENT_APPROVAL, 0.2],
    [MapStatusNew.PRIVATE_TESTING, 0.2],
    [MapStatusNew.FINAL_APPROVAL, 0.2]
  ],
  submissionGraphWeights: {
    [MapStatusNew.PRIVATE_TESTING]: [
      [null, 0.3],
      [MapStatusNew.CONTENT_APPROVAL, 1],
      [MapStatusNew.DISABLED, 0.05]
    ],
    [MapStatusNew.CONTENT_APPROVAL]: [
      [null, 0.3],
      [MapStatusNew.PRIVATE_TESTING, 0.2],
      [MapStatusNew.PUBLIC_TESTING, 1],
      [MapStatusNew.FINAL_APPROVAL, 0.2],
      [MapStatusNew.DISABLED, 0.1]
    ],
    [MapStatusNew.PUBLIC_TESTING]: [
      [null, 0.3],
      [MapStatusNew.CONTENT_APPROVAL, 0.15],
      [MapStatusNew.FINAL_APPROVAL, 1],
      [MapStatusNew.DISABLED, 0.1]
    ],
    [MapStatusNew.FINAL_APPROVAL]: [
      [null, 0.3],
      [MapStatusNew.APPROVED, 1],
      [MapStatusNew.PUBLIC_TESTING, 0.2],
      [MapStatusNew.DISABLED, 0.1]
    ],
    [MapStatusNew.APPROVED]: [
      [null, 1],
      [MapStatusNew.DISABLED, 0.2]
    ],
    [MapStatusNew.DISABLED]: [
      [null, 1],
      [MapStatusNew.APPROVED, 0.5],
      [MapStatusNew.PRIVATE_TESTING, 0.5],
      [MapStatusNew.CONTENT_APPROVAL, 0.5],
      [MapStatusNew.PUBLIC_TESTING, 0.5],
      [MapStatusNew.FINAL_APPROVAL, 0.5]
    ]
  } as Record<MapStatusNew, [null | MapStatusNew, number][]>
};

//#endregion

//#region Utils

const randRange = ({ min, max }: { min: number; max: number }) =>
  Random.int(max, min);

//#endregion

//#region Setup
prismaWrapper(async (prisma: PrismaClient) => {
  const args = new Set(process.argv.slice(1));
  if (args.has('-h') || args.has('--help')) {
    console.log('usage: seed.js [-h] [--s3files] [--reset]');
  }

  const dir = path.join(__dirname, '../../../../libs/db/src/scripts/assets');
  const mapBuffer = readFileSync(path.join(dir, '/flat_devgrid.bsp'));
  const mapHash = createHash('sha1').update(mapBuffer).digest('hex');

  const doFileUploads = args.has('--s3files');
  let imageBuffers: { small: Buffer; medium: Buffer; large: Buffer }[];
  const s3 = doFileUploads
    ? new S3Client({
        region: process.env['STORAGE_REGION'],
        endpoint: process.env['STORAGE_ENDPOINT_URL'],
        credentials: {
          accessKeyId: process.env['STORAGE_ACCESS_KEY_ID'],
          secretAccessKey: process.env['STORAGE_SECRET_ACCESS_KEY']
        },
        forcePathStyle: true
      })
    : undefined;

  if (args.has('--reset')) {
    console.log('Resetting DB');
    await nuke(prisma);
  }

  //#endregion

  //#region Users

  console.log('Creating users');
  const usersToCreate = randRange(vars.users);
  await parallel(
    async () => {
      for (let i = 0; i < usersToCreate; i++)
        await prisma.user.create({
          data: {
            steamID: Random.int(1000000000, 99999999999),
            alias: faker.internet.userName(),
            avatar: '0227a240393e6d62f539ee7b306dd048b0830eeb',
            country: faker.location.countryCode(),
            roles: Bitflags.join(
              Random.chance(0.1) ? Role.VERIFIED : 0,
              Random.chance(0.1) ? Role.PLACEHOLDER : 0,
              Random.chance(0.1) ? Role.ADMIN : 0,
              Random.chance(0.1) ? Role.MODERATOR : 0
            ),
            bans: Bitflags.join(
              Random.chance(0.1) ? Ban.BIO : 0,
              Random.chance(0.1) ? Ban.AVATAR : 0,
              Random.chance(0.1) ? Ban.LEADERBOARDS : 0,
              Random.chance(0.1) ? Ban.ALIAS : 0
            ),
            profile: {
              create: {
                bio: faker.lorem
                  .paragraphs({ min: 1, max: 2 })
                  .slice(0, MAX_BIO_LENGTH)
              }
            },
            userStats: {
              create: {
                totalJumps: Random.int(10000),
                totalStrafes: Random.int(10000),
                level: Random.int(0, 1000),
                cosXP: Random.int(10000),
                mapsCompleted: Random.int(10000),
                runsSubmitted: Random.int(10000)
              }
          createdAt: Random.pastDateInYears(2),
            }
          }
        });
    },

    doFileUploads
      ? async () => {
          imageBuffers = await Promise.all(
            from(vars.imageFetches, () =>
              axios
                .get('https://picsum.photos/1920/1080', {
                  responseType: 'arraybuffer'
                })
                .then(async (res) => ({
                  small: await sharp(res.data)
                    .resize(480, 360, { fit: 'inside' })
                    .jpeg({ mozjpeg: true })
                    .toBuffer(),
                  medium: await sharp(res.data)
                    .resize(1280, 720, { fit: 'inside' })
                    .jpeg({ mozjpeg: true })
                    .toBuffer(),
                  large: res.data
                }))
            )
          );
          console.log('Fetched map images');
        }
      : undefined
  );

  const users = Random.shuffle(await prisma.user.findMany());
  const userIDs = users.map(({ id }) => id);

  //#region Interactions

  console.log('Creating user interactions');
  await Promise.all(
    userIDs.flatMap((id1) =>
      userIDs.map(async (id2) => {
        if (id1 === id2) return;
        if (Random.chance(vars.userReportChance))
          await prisma.follow.create({
            data: {
              followeeID: id1,
              followedID: id2,
              notifyOn: Random.int(0, 127),
              ...Random.createdUpdatedDates()
            }
          });

        if (Random.chance(vars.userFollowChance))
          await prisma.report.create({
            data: {
              type: ReportType.USER_PROFILE_REPORT,
              data: id2,
              category: Random.enumValue(ReportCategory),
              message: faker.lorem.paragraph(),
              resolved: faker.datatype.boolean(),
              resolutionMessage: faker.lorem.sentence(),
              submitterID: id1,
              resolverID: Random.element(
                userIDs.filter((u) => u !== id1 && u !== id2)
              )
            }
          });
      })
    )
  );

  //#endregion

  //#endregion

  //#region Maps

  const potentialMappers = Random.shuffle(
    await prisma.user.findMany({
      select: { id: true },
      take: randRange(vars.usersThatSubmitMaps)
    })
  );
  // () =>
  //   s3.send(
  //     new PutObjectCommand({
  //       Bucket: process.env['STORAGE_BUCKET_NAME'],
  //       Key: approvedBspPath('dev_flatgrid'),
  //       Body: mapFile
  //     })
  //   )();

  const mapsToCreate = randRange(vars.maps);
  for (let i = 0; i < mapsToCreate; i++) {
    console.log(`Adding maps (${i + 1}/${mapsToCreate})`);
    const name = faker.lorem.word();

    const majCps = randRange(vars.majorCPs);
    const randomZones = () =>
      ZoneUtil.generateRandomMapZones(
        majCps,
        from(majCps, () => randRange(vars.minorCPs)),
        randRange(vars.bonusesPerMap),
        2 ** 16 - 64,
        1024,
        512
      );

    const randomSuggestion = (): MapSubmissionSuggestion => ({
      trackType: TrackType.MAIN, // Not bothering with bonuses
      trackNum: 0,
      gamemode: Random.enumValue(Gamemode),
      ranked: Random.chance(),
      tier: Random.int(10, 1),
      comment: faker.lorem.sentence()
    });

    const submissionsDates = () => {
      const dates: MapSubmissionDate[] = [];

      let currStatus: MapStatusNew = Random.chance()
        ? MapStatusNew.PRIVATE_TESTING
        : MapStatusNew.CONTENT_APPROVAL;
      let currDate = Random.pastDateSince(1e6).toDateString();

      while (currStatus !== null) {
        dates.push({
          status: currStatus,
          date: currDate
        });

        currDate = new Date(
          new Date(currDate).getTime() + Random.int(1e4)
        ).toDateString();
        currStatus = Random.weighted(vars.submissionGraphWeights[currStatus]);
      }

      return dates;
    };

    const [map] = await parallel(
      prisma.mMap.create({
        data: {
          name,
          status: Random.weighted([
            [MapStatusNew.APPROVED, 1],
            [MapStatusNew.PUBLIC_TESTING, 0.2],
            [MapStatusNew.DISABLED, 0.2],
            [MapStatusNew.CONTENT_APPROVAL, 0.2],
            [MapStatusNew.PRIVATE_TESTING, 0.2],
            [MapStatusNew.FINAL_APPROVAL, 0.2]
          ]),
          fileName: 'flat_devgrid',
          submitterID: Random.element(potentialMappers).id,
          ...Random.createdUpdatedDates(),
          info: {
            create: {
              description: faker.lorem.paragraphs().slice(0, 999),
              creationDate: Random.pastDateInYears(),
              youtubeID: Math.random() < 0.01 ? 'kahsl8rggF4' : undefined
            }
          },
          stats: {
            create: {
              reviews: Random.int(10000),
              downloads: Random.int(10000),
              subscriptions: Random.int(10000),
              plays: Random.int(10000),
              favorites: Random.int(10000),
              completions: Random.int(10000),
              uniqueCompletions: Random.int(10000),
              timePlayed: Random.int(10000)
            }
          },

          reviews: {
            createMany: {
              data: from(randRange(vars.reviewsPerMap), () => ({
                reviewerID: Random.element(userIDs),
                mainText: faker.lorem.paragraphs({ min: 1, max: 3 }),
                ...(Random.chance()
                  ? { resolved: true, resolverID: Random.element(userIDs) }
                  : {})
              }))
            }
          },
          submission: {
            create: {
              type: Random.weighted([
                [MapSubmissionType.ORIGINAL, 1],
                [MapSubmissionType.PORT, 1],
                [MapSubmissionType.SPECIAL, 0.2]
              ]),
              placeholders: from(randRange(vars.submissionPlaceholders), () => [
                {
                  alias: faker.internet.userName(),
                  type: Random.enumValue(MapCreditType),
                  description: faker.lorem.sentence()
                }
              ]),
              dates: submissionsDates(),
              versions: {
                createMany: {
                  data: from(randRange(vars.submissionVersions), (_, i) => ({
                    // TODO: We'd have to upload the same BSP 50 or so times
                    // for submissions here, since submissions use the UUID
                    // of this entry. If we really want to test BSP downloads
                    // for map submission ingame, copy 'maps/dev_flatgrid' to
                    // `submissions/${uuid of each submission version}.bsp`
                    versionNum: i + 1,
                    hash: mapHash,
                    hasVmf: false, // Could add a VMF if we really want but leaving for now
                    zones: randomZones() as unknown as JsonValue, // TODO: #855,
                    changelog: faker.lorem.paragraphs({ min: 1, max: 10 })
                  }))
                }
              },
              suggestions: from(
                randRange(vars.suggestions),
                () => randomSuggestion() as unknown as JsonValue
              )
            }
          }
        },
        include: { submission: { include: { versions: true } } }
      })
    );

    const lastVersion = map.submission.versions.at(-1);
    await prisma.mapSubmission.update({
      where: { mapID: map.id },
      data: { currentVersion: { connect: { id: lastVersion.id } } }
    });

    if ([MapStatusNew.APPROVED, MapStatusNew.DISABLED].includes(map.status))
      await prisma.mMap.update({
        where: { id: map.id },
        data: {
          hash: lastVersion.hash,
          zones: lastVersion.zones,
          hasVmf: false
        }
      });

    const { roles } = await prisma.user.findUnique({
      where: { id: map.submitterID },
      select: { roles: true }
    });

    await prisma.user.update({
      where: { id: map.submitterID },
      data: {
        roles: Bitflags.add(
          roles,
          map.submission.type === MapSubmissionType.PORT
            ? Role.PORTER
            : Role.MAPPER
        )
      }
    });

    await prisma.activity.createMany({
      data: [
        {
          userID: map.submitterID,
          type: ActivityType.MAP_UPLOADED,
          data: map.id,
          ...Random.createdUpdatedDates()
        },
        map.status === MapStatusNew.APPROVED
          ? {
              userID: map.submitterID,
              type: ActivityType.MAP_APPROVED,
              data: map.id,
              ...Random.createdUpdatedDates()
            }
          : undefined
      ]
    });

    //#region Leaderboards

    console.log('Creating leaderboards');
    const zones = lastVersion.zones as unknown as MapZones; // TODO: #855

    const numModes = randRange(vars.modesPerLeaderboard);
    const modesSet = new Set<Gamemode>();
    while (modesSet.size < numModes) {
      modesSet.add(Random.enumValue(Gamemode));
    }
    const modes = [...modesSet.values()];

    // Keep main track and stage ranked-ness synced up
    const rankedMainTracks = new Map(modes.map((m) => [m, Random.chance()]));

    await prisma.leaderboard.createMany({
      data: modes.flatMap((m) =>
        [
          {
            trackType: TrackType.MAIN,
            trackNum: 0
          },
          ...from(zones.tracks.stages.length, (_, i) => ({
            trackType: TrackType.STAGE,
            trackNum: i
          })),
          ...from(zones.tracks.bonuses.length, (_, i) => ({
            trackType: TrackType.BONUS,
            trackNum: i
          }))
        ].map(({ trackType, trackNum }) => ({
          trackType,
          trackNum,
          mapID: map.id,
          gamemode: m,
          style: 0,
          linear:
            trackType === TrackType.MAIN
              ? ZoneUtil.isLinearMainTrack(zones)
              : undefined,
          tier: trackType === TrackType.STAGE ? undefined : Random.int(10, 1),
          ranked:
            trackType === TrackType.BONUS
              ? Random.chance()
              : rankedMainTracks.get(m)
        }))
      )
    });

    //#endregion
    //#region Runs

    console.log('Creating runs');
    for (const {
      mapID,
      gamemode,
      trackType,
      trackNum,
      style
    } of await prisma.leaderboard.findMany({
      where: { mapID: map.id }
    })) {
      const numRuns = randRange(vars.runsPerMap);
      const numPastRuns = Math.max(randRange(vars.pastRunsPerMap), numRuns);

      const possibleUserIDs = Random.shuffle(userIDs);
      const usedUserIDs = [];

      let rank = 1;
      let time = Random.int(0, 1000);

      await Promise.all(
        from(numPastRuns, (_, i) => {
          time += Random.int(100);

          const createLbRun = i < numRuns;
          let userID: number;
          if (createLbRun) {
            userID = possibleUserIDs.pop();
            usedUserIDs.push(userID);
          } else {
            userID = Random.element(usedUserIDs);
            if (!userID) console.log({ possibleUserIDs, usedUserIDs });
          }

          return prisma.pastRun.create({
            data: {
              mmap: { connect: { id: mapID } },
              user: { connect: { id: userID } },
              gamemode,
              trackType,
              trackNum,
              style,
              time,
              leaderboardRun: createLbRun
                ? {
                    create: {
                      mmap: { connect: { id: mapID } },
                      user: { connect: { id: userID } },
                      time,
                      rank: rank++,
                      stats: {}, // TODO: Add proper stats here when we actually do stats seriously
                      leaderboard: {
                        connect: {
                          mapID_gamemode_trackType_trackNum_style: {
                            mapID,
                            trackType,
                            trackNum,
                            gamemode,
                            style
                          }
                        }
                      }
                    }
                  }
                : undefined
            }
          });
        })
      );
    }

    //#endregion
    //#region Images

    const images = await Promise.all(
      from(randRange(vars.images), async () => {
        const image = await prisma.mapImage.create({
          data: { mapID: map.id }
        });

        if (!doFileUploads) return image;

        const buffer = Random.element(imageBuffers);

        // Could be fancy and bubble up all the promises here to do in parallel
        // but not worth the insane code
        await Promise.all(
          ['small', 'medium', 'large'].map((size) =>
            s3.send(
              new PutObjectCommand({
                Bucket: process.env['STORAGE_BUCKET_NAME'],
                Key: `img/${image.id}-${size}.jpg`,
                Body: buffer[size]
              })
            )
          )
        );

        return image;
      })
    );

    await prisma.mMap.update({
      where: { id: map.id },
      data: { thumbnailID: images[0].id }
    });

    //#endregion
    //#region Credits

    const createCredit = (
      mapID: number,
      userID: number,
      type?: MapCreditType
    ) =>
      prisma.mapCredit
        .create({
          data: {
            type: type ?? Random.enumValue(MapCreditType),
            mapID,
            userID,
            description: faker.lorem.words({ min: 1, max: 2 })
          }
        })
        .catch(); // Ignore any creates that violate uniqueness

    const unusedUserIDs = Random.shuffle(userIDs);
    await parallel(
      // A map should always have at least one author
      () => createCredit(map.id, unusedUserIDs.pop(), MapCreditType.AUTHOR),
      ...from(randRange(vars.credits) - 1, () =>
        createCredit(map.id, unusedUserIDs.pop())
      )
    );

    //#endregion
    //#region User Interactions

    for (const userID of userIDs) {
      if (Random.chance(vars.mapFavoriteChance))
        await prisma.mapFavorite.create({
          data: {
            userID,
            mapID: map.id,
            ...Random.createdUpdatedDates()
          }
        });

      if (Random.chance(vars.mapReportChance)) {
        await prisma.report.create({
          data: {
            data: map.id,
            category: Random.enumValue(ReportCategory),
            type: ReportType.MAP_REPORT,
            message: faker.lorem.paragraph(),
            submitterID: userID,
            ...(Random.chance()
              ? {
                  resolved: true,
                  resolverID: Random.element(
                    userIDs.filter((u) => u !== userID)
                  ),
                  resolutionMessage: faker.lorem.paragraph()
                }
              : { resolved: false })
          }
        });
      }
    }

    //#endregion
  }

  //#region Make me admin

  const personalSteamIDs = process.env['ADMIN_STEAM_ID64S'];
  if (!personalSteamIDs) return;

  const steamIDs = personalSteamIDs.split(',');
  for (const [i, steamID] of steamIDs.entries()) {
    console.log(`Making user ${steamID} an admin`);
    await prisma.user.create({
      data: {
        steamID: BigInt(steamID),
        roles: Role.ADMIN,
        alias: `Admin User ${i + 1}`,
        profile: { create: {} },
        userStats: { create: {} }
      }
    });
  }

  //#endregion
  //#endregion

  console.log('Done!');
});
