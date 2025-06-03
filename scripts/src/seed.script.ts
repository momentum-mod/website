/**
 * Script for seeding the DB with faker.js data, useful for frontend developers.
 *
 * This script is my evil little JS monster, and I love it very much.
 */

import { createHash, randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import zlib from 'node:zlib';
import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import {
  ActivityType,
  Ban,
  MapStatuses,
  Gamemode,
  LeaderboardType,
  MapCreditType,
  mapReviewAssetPath,
  MapStatus,
  MapSubmissionDate,
  MapSubmissionType,
  MAX_BIO_LENGTH,
  ReportCategory,
  ReportType,
  Role,
  TrackType,
  FlatMapList,
  mapListPath,
  imgSmallPath,
  imgMediumPath,
  imgLargePath,
  AdminActivityType,
  imgXlPath,
  GamemodeInfo,
  bspPath,
  steamAvatarUrl,
  MapTags
} from '@momentum/constants';
import * as Bitflags from '@momentum/bitflags';
import { nuke } from '@momentum/db';
import * as Random from '@momentum/random';
import * as Zone from '@momentum/formats/zone';
import { arrayFrom, parallel, promiseAllSync } from '@momentum/util-fn';
import { COS_XP_PARAMS, XpSystems } from '@momentum/xp-systems';
import axios from 'axios';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import { prismaWrapper } from './prisma-wrapper.util';

//#region Configuration
// Can be overridden with --key=N or --key=N-M
const defaultVars = {
  imageFetches: { min: 25, max: 25 },
  users: { min: 100, max: 100 },
  maps: { min: 50, max: 50 },
  adminActivities: { min: 30, max: 50 },
  usersThatSubmitMaps: { min: 15, max: 20 },
  randomImagesToDownload: { min: 20, max: 20 },
  credits: { min: 2, max: 20 },
  images: { min: 1, max: 5 },
  modesPerLeaderboard: { min: 1, max: 3 },
  majorCPs: { min: 0, max: 5 },
  minorCPs: { min: 0, max: 5 },
  bonusesPerMap: { min: 0, max: 3 },
  reviewsPerMap: { min: 0, max: 10 },
  imagesPerReview: { min: 1, max: 5 }, // 80% chance for no images
  commentsPerReview: { min: 0, max: 5 },
  submissionPlaceholders: { min: 0, max: 2 },
  submissionVersions: { min: 1, max: 5 },
  runsPerLeaderboard: { min: 1, max: 10 },
  pastRunsPerLeaderboard: { min: 1, max: 25 },
  userReports: { min: 50, max: 50 },
  userFollows: { min: 50, max: 50 },
  mapReportChance: { min: 0.005, max: 0.005 },
  mapFollowChance: { min: 0.05, max: 0.05 },
  mapFavoriteChance: { min: 0.05, max: 0.05 }
};

const weights = {
  mapStatusWeights: [
    [MapStatus.APPROVED, 1],
    [MapStatus.PUBLIC_TESTING, 0.2],
    [MapStatus.DISABLED, 0.2],
    [MapStatus.CONTENT_APPROVAL, 0.2],
    [MapStatus.PRIVATE_TESTING, 0.2],
    [MapStatus.FINAL_APPROVAL, 0.2]
  ] as [MapStatus, number][],
  submissionGraphWeights: {
    [MapStatus.PRIVATE_TESTING]: [
      [null, 0.3],
      [MapStatus.CONTENT_APPROVAL, 1],
      [MapStatus.DISABLED, 0.05]
    ],
    [MapStatus.CONTENT_APPROVAL]: [
      [null, 0.3],
      [MapStatus.PRIVATE_TESTING, 0.2],
      [MapStatus.PUBLIC_TESTING, 1],
      [MapStatus.FINAL_APPROVAL, 0.2],
      [MapStatus.DISABLED, 0.1]
    ],
    [MapStatus.PUBLIC_TESTING]: [
      [null, 0.3],
      [MapStatus.CONTENT_APPROVAL, 0.15],
      [MapStatus.FINAL_APPROVAL, 1],
      [MapStatus.DISABLED, 0.1]
    ],
    [MapStatus.FINAL_APPROVAL]: [
      [null, 0.3],
      [MapStatus.APPROVED, 1],
      [MapStatus.PUBLIC_TESTING, 0.2],
      [MapStatus.DISABLED, 0.1]
    ],
    [MapStatus.APPROVED]: [
      [null, 1],
      [MapStatus.DISABLED, 0.2]
    ],
    [MapStatus.DISABLED]: [
      [null, 1],
      [MapStatus.APPROVED, 0.5],
      [MapStatus.PRIVATE_TESTING, 0.5],
      [MapStatus.CONTENT_APPROVAL, 0.5],
      [MapStatus.PUBLIC_TESTING, 0.5],
      [MapStatus.FINAL_APPROVAL, 0.5]
    ]
  } as Record<MapStatus, [null | MapStatus, number][]>
};

//#endregion

//#region Utils

const randRange = ({ min, max }: { min: number; max: number }) =>
  Random.int(max, min);

const xpSystems = new XpSystems();
const randomLevelAndXp = () => {
  const level = Random.int(1, COS_XP_PARAMS.levels.maxLevels);
  return {
    level,
    cosXP:
      xpSystems.getCosmeticXpForLevel(level) +
      Random.int(0, xpSystems.getCosmeticXpInLevel(level))
  };
};

//#endregion

//#region Setup
prismaWrapper(async (prisma: PrismaClient) => {
  const args = new Set(process.argv.slice(1));

  const vars = Object.fromEntries(
    Object.entries(defaultVars).map(([varName, defaults]) => {
      const arg = [...args].find(
        (a) => new RegExp(`--${varName}=`).exec(a)?.[0]
      );
      if (!arg) return [varName, defaults];
      const [minOrBoth, max] = arg.split('=')[1].split('-').map(Number);
      return [
        varName,
        max ? { min: minOrBoth, max } : { min: minOrBoth, max: minOrBoth }
      ];
    })
  );

  if (args.has('-h') || args.has('--help')) {
    console.log(
      'usage: seed.js [-h] [--reset] [--dump-map-list]\n\t' +
        Object.keys(defaultVars)
          .map((v) => `--${v}=N (or N-M for min-max)`)
          .join('\n\t')
    );

    return;
  }

  const dir = path.join(__dirname, '../../scripts/assets');
  const mapBuffer = readFileSync(path.join(dir, '/flat_devgrid.bsp'));
  const mapHash = createHash('sha1').update(mapBuffer).digest('hex');

  let imageBuffers: Array<{
    small: Buffer;
    medium: Buffer;
    large: Buffer;
    xl: Buffer;
  }>;

  const s3EndpointUrl = process.env['STORAGE_ENDPOINT_URL'];
  const s3BucketName = process.env['STORAGE_BUCKET_NAME'];
  const cdnUrl = process.env['CDN_URL'] ?? `${s3EndpointUrl}/${s3BucketName}`;
  const s3Url = (str: string) => `${cdnUrl}/${str}`;

  const s3 = new S3Client({
    region: process.env['STORAGE_REGION'],
    endpoint: s3EndpointUrl,
    credentials: {
      accessKeyId: process.env['STORAGE_ACCESS_KEY_ID'],
      secretAccessKey: process.env['STORAGE_SECRET_ACCESS_KEY']
    },
    forcePathStyle: true
  });

  if (args.has('--reset')) {
    console.log('Resetting DB');
    await nuke(prisma);
  }

  //#endregion

  //#region Users

  console.log('Creating users');
  const usersToCreate = randRange(vars.users);
  await parallel(
    promiseAllSync(
      arrayFrom(
        usersToCreate,
        () => () =>
          prisma.user.create({
            data: {
              steamID: Random.int(1000000000, 99999999999),
              alias: faker.internet.username(),
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
                  mapsCompleted: Random.int(10000),
                  runsSubmitted: Random.int(10000),
                  ...randomLevelAndXp()
                }
              }
            }
          })
      )
    ),

    async () => {
      imageBuffers = await Promise.all(
        arrayFrom(randRange(vars.imageFetches), () =>
          axios
            .get('https://picsum.photos/2560/1440', {
              responseType: 'arraybuffer'
            })
            .then(async (res) => ({
              small: await sharp(res.data)
                .resize(480, 360, { fit: 'inside' })
                .jpeg({ mozjpeg: true, quality: 90 })
                .toBuffer(),
              medium: await sharp(res.data)
                .resize(1280, 720, { fit: 'inside' })
                .jpeg({ mozjpeg: true, quality: 90 })
                .toBuffer(),
              large: await sharp(res.data)
                .resize(1920, 1080, { fit: 'inside' })
                .jpeg({ mozjpeg: true, quality: 90 })
                .toBuffer(),
              xl: await sharp(res.data)
                .resize(2560, 1440, { fit: 'inside' })
                .jpeg({ mozjpeg: true, quality: 90 })
                .toBuffer()
            }))
        )
      );
      console.log('Fetched map images');
    }
  );

  const users = Random.shuffle(
    await prisma.user.findMany({ include: { profile: true } })
  );
  const userIDs = users.map(({ id }) => id);

  //#region Interactions

  console.log('Creating user interactions');

  await Promise.all(
    Random.uniquePairs(userIDs, randRange(vars.userFollows)).flatMap(
      ([id1, id2]) =>
        prisma.follow
          .create({
            data: {
              followeeID: id1,
              followedID: id2,
              notifyOn: Random.int(0, 127),
              ...Random.createdUpdatedDates()
            }
          })
          .catch(() => {})
    )
  );

  await promiseAllSync(
    Random.uniquePairs(userIDs, randRange(vars.userFollows)).flatMap(
      ([id1, id2]) =>
        () =>
          prisma.follow
            .create({
              data: {
                followeeID: id1,
                followedID: id2,
                notifyOn: Random.int(0, 127),
                ...Random.createdUpdatedDates()
              }
            })
            .catch(() => {})
    )
  );

  await promiseAllSync(
    Random.uniquePairs(userIDs, randRange(vars.userReports)).flatMap(
      ([id1, id2]) =>
        () =>
          prisma.report
            .create({
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
            })
            .catch(() => {})
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

  const mapsToCreate = randRange(vars.maps);
  const usedNames = await prisma.mMap
    .findMany()
    .then((maps) => (maps ?? []).map(({ name }) => name));
  const prefixes = [
    ...new Set(GamemodeInfo.values().map(({ prefix }) => prefix))
  ];
  try {
    for (let i = 0; i < mapsToCreate; i++) {
      console.log(`Adding map (${i + 1}/${mapsToCreate})`);
      console.time('Added map');
      // Make sure name always <= 32 chars (16 + 11 + 5 = 32)
      let name =
        faker.lorem.word({ length: { min: 3, max: 16 } }) +
        faker.lorem.word({ length: { min: 3, max: 11 } });
      // Most maps have a gamemode prefix, some don't, want to be able to test
      // with both.
      const prefix = Random.element(prefixes);
      if (Random.chance(0.75)) {
        name = `${prefix}_${name}`;
      }

      // This is so unlikely to happen, but if we ever get a duplicate name,
      // just scramble some chars until we get a unique one.
      while (usedNames.includes(name)) {
        const idx = Random.int(0, 27);
        name = name.slice(0, idx) + Random.char() + name.slice(idx + 1);
      }

      usedNames.push(name);

      const majCps = randRange(vars.majorCPs);
      const randomZones = () =>
        Zone.generateRandomMapZones(
          majCps,
          arrayFrom(majCps, () => randRange(vars.minorCPs)),
          arrayFrom(randRange(vars.bonusesPerMap), (_) =>
            randRange({ min: 1, max: 3 })
          ),
          512,
          64,
          64
        );

      const submissionsDates = () => {
        const dates: MapSubmissionDate[] = [];

        let currStatus: MapStatus = Random.chance()
          ? MapStatus.PRIVATE_TESTING
          : MapStatus.CONTENT_APPROVAL;
        let currDate = Random.pastDateSince(1e6).toDateString();

        while (currStatus !== null) {
          dates.push({
            status: currStatus,
            date: currDate
          });

          currDate = new Date(
            new Date(currDate).getTime() + Random.int(1000 * 60 * 60 * 24 * 30) // Monf
          ).toDateString();
          currStatus = Random.weighted(
            weights.submissionGraphWeights[currStatus]
          );
        }

        return dates;
      };

      const versions = arrayFrom(randRange(vars.submissionVersions), (i) => {
        const zones = JSON.stringify(randomZones());
        return {
          versionNum: i + 1,
          bspHash: mapHash,
          bspDownloadId: randomUUID(),
          vmfDownloadId: null, // Could add a VMF if we really want but leaving for now
          zones,
          zoneHash: createHash('sha1').update(zones).digest('hex'),
          changelog: faker.lorem.paragraphs({ min: 1, max: 10 })
        };
      });

      const status = Random.weighted(weights.mapStatusWeights);
      const inSubmission = MapStatuses.IN_SUBMISSION.includes(status);

      //#region Leaderboards, suggestions, etc...

      const zones = JSON.parse(versions.at(-1).zones);
      const numModes = randRange(vars.modesPerLeaderboard);
      const modesSet = new Set<Gamemode>();
      while (modesSet.size < numModes) {
        modesSet.add(Random.enumValue(Gamemode));
      }
      const modes = modesSet.values().toArray();

      // Keep main track and stage ranked-ness synced up
      const rankedMainTracks = new Map(
        modes.map((m) => [
          m,
          Random.chance() ? LeaderboardType.RANKED : LeaderboardType.UNRANKED
        ])
      );

      const leaderboards = modes.flatMap((m) =>
        [
          {
            trackType: TrackType.MAIN,
            trackNum: 1
          },
          ...arrayFrom(zones.tracks.main.zones.segments.length, (i) => ({
            trackType: TrackType.STAGE,
            trackNum: i + 1
          })),
          ...arrayFrom(zones.tracks.bonuses.length, (i) => ({
            trackType: TrackType.BONUS,
            trackNum: i + 1
          }))
        ].map(({ trackType, trackNum }) => {
          const leaderboard = {
            trackType,
            trackNum,
            gamemode: m,
            style: 0,
            linear:
              trackType === TrackType.MAIN
                ? Zone.isLinearMainTrack(zones)
                : undefined,
            tier:
              trackType !== TrackType.STAGE && !inSubmission
                ? Random.int(10, 1)
                : undefined,
            type: inSubmission
              ? LeaderboardType.IN_SUBMISSION
              : trackType === TrackType.BONUS
                ? Random.chance()
                  ? LeaderboardType.RANKED
                  : LeaderboardType.UNRANKED
                : rankedMainTracks.get(m),
            tags:
              trackType === TrackType.MAIN && !inSubmission
                ? Random.elements(MapTags.get(m), Random.int(4))
                : []
          };

          if (trackType === TrackType.MAIN) {
            leaderboard.linear = Zone.isLinearMainTrack(zones);
          }

          if (trackType !== TrackType.STAGE && !inSubmission) {
            leaderboard.tier = Random.int(10, 1);
          }

          return leaderboard;
        })
      );

      const submissionSuggestions = () =>
        leaderboards
          .filter(({ trackType }) => trackType !== TrackType.STAGE)
          .map(({ gamemode, trackType, trackNum }) => ({
            gamemode,
            trackType,
            trackNum,
            tier: Random.int(10, 1),
            comment: faker.lorem.sentence(),
            type: Random.chance()
              ? LeaderboardType.RANKED
              : LeaderboardType.UNRANKED,
            tags: Random.elements(MapTags.get(gamemode), Random.int(3))
          }));

      const review = async () => ({
        reviewerID: Random.element(userIDs),
        mainText: faker.lorem.paragraphs({ min: 1, max: 3 }),
        imageIDs: Random.chance(0.2)
          ? await Promise.all(
              arrayFrom(randRange(vars.imagesPerReview), async () => {
                const id = `${uuidv4()}.jpeg`;
                await s3.send(
                  new PutObjectCommand({
                    Bucket: s3BucketName,
                    Key: mapReviewAssetPath(id),
                    Body: Random.element(imageBuffers).medium,
                    ContentType: 'image/jpeg'
                  })
                );
                return id;
              })
            )
          : undefined,
        suggestions: leaderboards
          .filter(({ trackType }) => trackType !== TrackType.STAGE)
          .filter(() => Random.chance())
          .map(({ gamemode, trackType, trackNum }) => ({
            gamemode,
            trackType,
            trackNum,
            tier: Random.int(10, 1),
            gameplayRating: Random.int(10, 1)
          })),
        editHistory: Random.chance()
          ? arrayFrom(Random.int(5), () => ({
              mainText: faker.lorem.paragraph(),
              date: Random.pastDateInYears()
            }))
          : null,
        ...(Random.chance()
          ? { resolved: true, resolverID: Random.element(userIDs) }
          : {})
      });

      //#endregion

      const map = await prisma.mMap.create({
        data: {
          name,
          status,
          submitterID: Random.element(potentialMappers).id,
          ...Random.createdUpdatedDates(),
          info: {
            create: {
              description: faker.lorem.paragraphs().slice(0, 999),
              creationDate: Random.pastDateInYears(),
              youtubeID: Math.random() < 0.01 ? 'kahsl8rggF4' : undefined
            }
          },
          images: await Promise.all(
            arrayFrom(randRange(vars.images), async () => {
              const id = uuidv4();

              const buffer = Random.element(imageBuffers);

              // Could be fancy and bubble up all the promises here to do in parallel
              // but not worth the insane code
              await Promise.all(
                ['small', 'medium', 'large', 'xl'].map((size) =>
                  s3.send(
                    new PutObjectCommand({
                      Bucket: s3BucketName,
                      Key: `img/${id}-${size}.jpg`,
                      Body: buffer[size],
                      ContentType: 'image/jpeg'
                    })
                  )
                )
              );

              return id;
            })
          ),
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
              data: await Promise.all(
                arrayFrom(randRange(vars.reviewsPerMap), review)
              )
            }
          },
          versions: { createMany: { data: versions } },
          submission: {
            create: {
              type: Random.weighted([
                [MapSubmissionType.ORIGINAL, 1],
                [MapSubmissionType.PORT, 1],
                [MapSubmissionType.SPECIAL, 0.2]
              ]),
              placeholders: arrayFrom(
                randRange(vars.submissionPlaceholders),
                () => ({
                  alias: faker.internet.username(),
                  type: Random.enumValue(MapCreditType),
                  description: faker.lorem.words({ min: 1, max: 4 })
                })
              ),
              dates: submissionsDates(),
              suggestions: submissionSuggestions()
            }
          },
          leaderboards: { createMany: { data: leaderboards } }
        },
        include: {
          versions: true,
          submission: true,
          reviews: { include: { comments: true } }
        }
      });

      const lastVersion = map.versions.at(-1);
      await prisma.mMap.update({
        where: { id: map.id },
        data: { currentVersion: { connect: { id: lastVersion.id } } }
      });

      await s3.send(
        new PutObjectCommand({
          Bucket: s3BucketName,
          Key: bspPath(lastVersion.bspDownloadId),
          Body: mapBuffer
        })
      );

      for (const review of map.reviews) {
        await prisma.mapReviewComment.createMany({
          data: arrayFrom(randRange(vars.commentsPerReview), () => ({
            userID: Random.element(users).id,
            text: faker.lorem.sentence(),
            reviewID: review.id
          }))
        });
      }

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

      await prisma.activity.create({
        data: {
          userID: map.submitterID,
          type: ActivityType.MAP_UPLOADED,
          data: map.id,
          ...Random.createdUpdatedDates()
        }
      });

      if (map.status === MapStatus.APPROVED) {
        await prisma.activity.create({
          data: {
            userID: map.submitterID,
            type: ActivityType.MAP_APPROVED,
            data: map.id,
            ...Random.createdUpdatedDates()
          }
        });
      }

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
        const numRuns = randRange(vars.runsPerLeaderboard);
        const numPastRuns = Math.max(
          randRange(vars.pastRunsPerLeaderboard),
          numRuns
        );

        const possibleUserIDs = Random.shuffle(userIDs);
        const usedUserIDs = [];

        let rank = 1;
        let time = Random.int(0, 1000);

        await Promise.all(
          arrayFrom(numPastRuns, (i) => {
            time += Random.int(100);

            const createLbRun = i < numRuns;
            let userID: number;
            if (createLbRun) {
              userID = possibleUserIDs.pop();
              usedUserIDs.push(userID);
            } else {
              userID = Random.element(usedUserIDs);
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
                        // Just any SHA1 hash is fine so long as unique, so game
                        // can use for unique compator on these
                        replayHash: createHash('sha1')
                          .update(Math.random().toString())
                          .digest('hex'),
                        splits: {},
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
              description: faker.lorem.words({ min: 1, max: 4 })
            }
          })
          .catch(); // Ignore any creates that violate uniqueness

      const unusedUserIDs = Random.shuffle(userIDs);
      await parallel(
        // A map should always have at least one author
        () => createCredit(map.id, unusedUserIDs.pop(), MapCreditType.AUTHOR),
        ...arrayFrom(randRange(vars.credits) - 1, () =>
          createCredit(map.id, unusedUserIDs.pop())
        )
      );

      //#endregion
      //#region User Interactions

      for (const userID of userIDs) {
        if (Random.chance(randRange(vars.mapFavoriteChance)))
          await prisma.mapFavorite.create({ data: { userID, mapID: map.id } });

        if (Random.chance(randRange(vars.mapReportChance))) {
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

      console.timeEnd('Added map');
      //#endregion
    }
  } catch (error) {
    console.warn(`Failed creating a map: ${error.message}`);
  }

  //#region Admin Activity

  console.log('Creating admin activity');
  const maps = Random.shuffle(await prisma.mMap.findMany());
  const reports = Random.shuffle(await prisma.report.findMany());
  const adminActivitiesToCreate = users.some(
    ({ roles }) => (roles & Role.ADMIN) !== 0
  )
    ? randRange(vars.adminActivities)
    : 0;
  for (let i = 0; i < adminActivitiesToCreate; i++) {
    const adminID = Random.element(userIDs);
    const type = Random.element([
      AdminActivityType.USER_UPDATE,
      AdminActivityType.USER_CREATE_PLACEHOLDER,
      // AdminActivityType.USER_MERGE, // I don't want to simulate the whole merge logic
      AdminActivityType.USER_DELETE,
      AdminActivityType.MAP_UPDATE,
      AdminActivityType.MAP_CONTENT_DELETE,
      AdminActivityType.REPORT_UPDATE,
      AdminActivityType.REPORT_RESOLVE
      // AdminActivityType.REVIEW_DELETED,
      // AdminActivityType.REVIEW_COMMENT_DELETED
    ]);

    let target = 0;
    let oldData: any = {};
    let newData: any = {};
    switch (type) {
      case AdminActivityType.USER_UPDATE:
        switch (Random.int(3)) {
          case 0:
            oldData = Random.element(users.filter((u) => u.id !== adminID));
            target = oldData.id;
            newData = await prisma.user.update({
              where: { id: oldData.id },
              data: {
                roles: Bitflags.join(
                  Random.chance(0.1) ? Role.VERIFIED : 0,
                  Random.chance(0.1) ? Role.ADMIN : 0,
                  Random.chance(0.1) ? Role.MODERATOR : 0
                )
              }
            });
            break;
          case 1:
            oldData = Random.element(users.filter((u) => u.id !== adminID));
            target = oldData.id;
            newData = await prisma.user.update({
              where: { id: oldData.id },
              data: {
                bans: Bitflags.join(
                  Random.chance(0.1) ? Ban.BIO : 0,
                  Random.chance(0.1) ? Ban.AVATAR : 0,
                  Random.chance(0.1) ? Ban.LEADERBOARDS : 0,
                  Random.chance(0.1) ? Ban.ALIAS : 0
                )
              }
            });
            break;
          case 2:
            oldData = Random.element(users.filter((u) => u.id !== adminID));
            target = oldData.id;
            newData = await prisma.user.update({
              where: { id: oldData.id },
              data: {
                alias: faker.internet.username()
              }
            });
            break;
          case 3:
            oldData = Random.element(users.filter((u) => u.id !== adminID));
            target = oldData.id;
            newData = await prisma.user.update({
              where: { id: oldData.id },
              data: {
                profile: {
                  update: {
                    bio: faker.lorem
                      .paragraphs({ min: 1, max: 2 })
                      .slice(0, MAX_BIO_LENGTH)
                  }
                }
              },
              include: { profile: true }
            });
            break;
        }
        break;

      case AdminActivityType.USER_CREATE_PLACEHOLDER:
        newData = await prisma.user.create({
          data: {
            alias: faker.internet.username(),
            roles: Role.PLACEHOLDER,
            profile: { create: {} },
            userStats: { create: {} }
          }
        });
        target = newData.id;
        break;
      case AdminActivityType.USER_MERGE: // No
        break;
      case AdminActivityType.USER_DELETE:
        oldData = Random.element(users.filter((u) => u.id !== adminID));
        target = oldData.id;
        newData = await prisma.user.update({
          where: { id: oldData.id },
          data: {
            roles: Bitflags.join(oldData.roles, Role.DELETED)
          }
        });
        break;
      case AdminActivityType.MAP_UPDATE:
        oldData = Random.element(maps);
        target = oldData.id;
        newData = await prisma.mMap.update({
          where: { id: oldData.id },
          data: {
            status: Random.weighted(
              weights.mapStatusWeights.filter(
                (weight) => weight[0] !== oldData.status
              )
            )
          }
        });
        break;
      case AdminActivityType.MAP_CONTENT_DELETE:
        oldData = Random.element(maps);
        target = oldData.id;
        break;
      case AdminActivityType.REPORT_UPDATE:
        oldData = Random.element(reports);
        target = oldData.id;
        newData = await prisma.report.update({
          where: { id: oldData.id },
          data: {
            resolutionMessage: faker.lorem.paragraph()
          }
        });
        break;
      case AdminActivityType.REPORT_RESOLVE:
        oldData = Random.element(reports);
        target = oldData.id;
        newData = await prisma.report.update({
          where: { id: oldData.id },
          data: {
            resolutionMessage: faker.lorem.paragraph(),
            resolved: true
          }
        });
        break;
    }
    await prisma.adminActivity.create({
      data: { type, target, newData, oldData, userID: adminID }
    });
  }

  //#endregion

  // Now that we FINALLY have every map added, generate the static map lists
  // Code here is derived from map-list.service.ts
  for (const type of [FlatMapList.APPROVED, FlatMapList.SUBMISSION]) {
    const maps = await prisma.mMap.findMany({
      where: {
        status:
          type === FlatMapList.APPROVED
            ? MapStatus.APPROVED
            : { in: [MapStatus.PUBLIC_TESTING, MapStatus.FINAL_APPROVAL] }
      },
      select: {
        id: true,
        name: true,
        status: true,
        images: true,
        info: true,
        leaderboards: true,
        credits: {
          select: {
            type: true,
            description: true,
            user: {
              select: { id: true, alias: true, avatar: true, steamID: true }
            }
          }
        },
        createdAt: true,
        currentVersion: { omit: { zones: true, changelog: true, mapID: true } },
        ...(type === FlatMapList.SUBMISSION
          ? {
              submission: true,
              versions: { omit: { zones: true, mapID: true } }
            }
          : {})
      }
    });

    // Unless we illegally cross some module boundaries, we can't use
    // class-transformer @Transform/@Expose/@Excludes here. Trust me, I tried
    // getting CT working, but doesn't even seem possible with esbuild.
    for (const map of maps as any[]) {
      delete map.info.mapID;

      map.currentVersion.downloadURL = `${cdnUrl}/${bspPath(
        map.currentVersion.bspDownloadId
      )}`;

      map.images = map.images.map((image) => ({
        id: image,
        small: s3Url(imgSmallPath(image)),
        medium: s3Url(imgMediumPath(image)),
        large: s3Url(imgLargePath(image)),
        xl: s3Url(imgXlPath(image))
      }));

      map.thumbnail = map.images[0];

      for (const credit of map.credits as any[]) {
        credit.user.steamID = credit.user.steamID?.toString();
        credit.user.avatarURL = steamAvatarUrl(credit.user.avatar);
        delete credit.user.avatar;
        delete credit.mapID;
      }

      for (const leaderboard of map.leaderboards) {
        delete leaderboard.mapID;
      }
    }

    const mapListJson = JSON.stringify(maps);

    if (args.has('--dump-map-list')) {
      writeFileSync(`./map-list-${type}.json`, mapListJson);
    }

    // This is copied directly from map-list-service.ts, see there
    const t1 = Date.now();

    const uncompressed = Buffer.from(mapListJson);
    const header = Buffer.alloc(12);

    header.write('MSML', 0, 'utf8');
    header.writeUInt32LE(uncompressed.length, 4);
    header.writeUInt32LE(maps.length, 8);

    const compressed = await promisify(zlib.deflate)(uncompressed);

    const outBuf = Buffer.concat([header, compressed]);

    console.log(`Generated map list, encoding took ${Date.now() - t1}ms`);

    await s3.send(
      new PutObjectCommand({
        Bucket: s3BucketName,
        Key: mapListPath(type, 1),
        Body: outBuf
      })
    );
  }

  //#region Make me admin

  const personalSteamIDs = process.env['ADMIN_STEAM_ID64S'];
  if (!personalSteamIDs) return;

  const steamIDs = personalSteamIDs.split(',');
  for (const [i, steamID] of steamIDs.entries()) {
    console.log(`Making user ${steamID} an admin`);
    await prisma.user
      .create({
        data: {
          steamID: BigInt(steamID),
          roles: Role.ADMIN,
          alias: `Admin User ${i + 1}`,
          profile: { create: {} },
          userStats: {
            create: randomLevelAndXp()
          }
        }
      })
      .catch(() => {});
  }

  //#endregion

  //#endregion

  console.log('Done!');
});
