/**
 * Script for seeding the DB with faker.js data, useful for frontend developers.
 *
 * This script is my evil little JS monster, and I love it very much.
 */

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';
import * as Random from '@momentum/random';
import { ZoneUtil } from '@momentum/formats/zone';
import {
  ActivityType,
  Ban,
  CombinedMapStatuses,
  Gamemode,
  GamemodePrefix,
  LeaderboardType,
  MapCreditType,
  mapReviewAssetPath,
  MapStatusNew,
  MapSubmissionDate,
  MapSubmissionType,
  MapZones,
  MAX_BIO_LENGTH,
  ReportCategory,
  ReportType,
  Role,
  TrackType,
  AdminActivityType
} from '@momentum/constants';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Bitflags } from '@momentum/bitflags';
import { from, parallel, promiseAllSync } from '@momentum/util-fn';
import axios from 'axios';
import sharp from 'sharp';
import { JsonValue } from 'type-fest';
import { COS_XP_PARAMS, XpSystems } from '@momentum/xp-systems';
import { nuke } from '../prisma/utils';
import { prismaWrapper } from './prisma-wrapper';
import path = require('node:path');
import { v4 as uuidv4 } from 'uuid';

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
  testingRequestsPerMap: { min: 0, max: 10 },
  reviewsPerMap: { min: 0, max: 5 },
  imagesPerReview: { min: 1, max: 20 }, // 50% chance for no images
  commentsPerReview: { min: 0, max: 5 },
  submissionPlaceholders: { min: 0, max: 2 },
  submissionVersions: { min: 1, max: 5 },
  runsPerLeaderboard: { min: 1, max: 30 },
  pastRunsPerLeaderboard: { min: 1, max: 100 },
  userReportChance: { min: 0.05, max: 0.05 }, // Chance that u1 reports u2 (this game is TOXIC)
  userFollowChance: { min: 0.01, max: 0.01 },
  mapReportChance: { min: 0.005, max: 0.005 },
  mapFollowChance: { min: 0.05, max: 0.05 },
  mapFavoriteChance: { min: 0.05, max: 0.05 }
};

const weights = {
  mapStatusWeights: [
    [MapStatusNew.APPROVED, 1],
    [MapStatusNew.PUBLIC_TESTING, 0.2],
    [MapStatusNew.DISABLED, 0.2],
    [MapStatusNew.CONTENT_APPROVAL, 0.2],
    [MapStatusNew.PRIVATE_TESTING, 0.2],
    [MapStatusNew.FINAL_APPROVAL, 0.2]
  ] as [MapStatusNew, number][],
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
      'usage: seed.js [-h] [--reset]\n\t' +
        Object.keys(defaultVars)
          .map((v) => `--${v}=N (or N-M for min-max)`)
          .join('\n\t')
    );

    return;
  }

  const dir = path.join(__dirname, '../../../../libs/db/src/scripts/assets');
  const mapBuffer = readFileSync(path.join(dir, '/flat_devgrid.bsp'));
  const mapHash = createHash('sha1').update(mapBuffer).digest('hex');

  let imageBuffers: {
    small: Buffer;
    medium: Buffer;
    large: Buffer;
    xl: Buffer;
  }[];
  const s3 = new S3Client({
    region: process.env['STORAGE_REGION'],
    endpoint: process.env['STORAGE_ENDPOINT_URL'],
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
      from(
        usersToCreate,
        () => () =>
          prisma.user.create({
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
              }
            }
          })
      )
    ),

    async () => {
      imageBuffers = await Promise.all(
        from(randRange(vars.imageFetches), () =>
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
  await promiseAllSync(
    userIDs.flatMap((id1) =>
      userIDs.map((id2) => async () => {
        if (id1 === id2) return;
        if (Random.chance(randRange(vars.userFollowChance)))
          await prisma.follow
            .create({
              data: {
                followeeID: id1,
                followedID: id2,
                notifyOn: Random.int(0, 127),
                ...Random.createdUpdatedDates()
              }
            })
            .catch(() => {});

        if (Random.chance(randRange(vars.userReportChance)))
          await prisma.report
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
            .catch(() => {});
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
  const existingMaps = await prisma.mMap.findMany();
  const usedNames = (existingMaps ?? []).map(({ name }) => name);
  try {
    for (let i = 0; i < mapsToCreate; i++) {
      console.log(`Adding maps (${i + 1}/${mapsToCreate})`);
      let name: string;
      while (!name || usedNames.includes(name)) {
        // Most maps have a gamemode prefix, some don't, want to be able to test
        // with both.
        const prefix = Random.element([...new Set(GamemodePrefix.values())]);
        name = faker.lorem.word();
        if (Random.chance(0.75)) {
          name = `${prefix}_${name}`;
        }
      }

      usedNames.push(name);

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
            new Date(currDate).getTime() + Random.int(1000 * 60 * 60 * 24 * 30) // Monf
          ).toDateString();
          currStatus = Random.weighted(
            weights.submissionGraphWeights[currStatus]
          );
        }

        return dates;
      };

      const versions = from(randRange(vars.submissionVersions), (_, i) => ({
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
      }));

      const status = Random.weighted(weights.mapStatusWeights);
      const inSubmission = CombinedMapStatuses.IN_SUBMISSION.includes(status);

      //#region Leaderboards, suggestions, etc...

      const zones = versions.at(-1).zones as unknown as MapZones; // TODO: #855
      const numModes = randRange(vars.modesPerLeaderboard);
      const modesSet = new Set<Gamemode>();
      while (modesSet.size < numModes) {
        modesSet.add(Random.enumValue(Gamemode));
      }
      const modes = [...modesSet.values()];

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
        ].map(({ trackType, trackNum }) => {
          const leaderboard = {
            trackType,
            trackNum,
            gamemode: m,
            style: 0,
            linear:
              trackType === TrackType.MAIN
                ? ZoneUtil.isLinearMainTrack(zones)
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
                : rankedMainTracks.get(m)
          };

          if (trackType === TrackType.MAIN) {
            leaderboard.linear = ZoneUtil.isLinearMainTrack(zones);
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
              : LeaderboardType.UNRANKED
          }));

      const review = async () => ({
        reviewerID: Random.element(userIDs),
        mainText: faker.lorem.paragraphs({ min: 1, max: 3 }),
        imageIDs: Random.chance()
          ? await Promise.all(
              from(randRange(vars.imagesPerReview), async () => {
                const id = `${uuidv4()}.jpeg`;
                await s3.send(
                  new PutObjectCommand({
                    Bucket: process.env['STORAGE_BUCKET_NAME'],
                    Key: mapReviewAssetPath(id),
                    Body: Random.element(imageBuffers).medium
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
          ? from(Random.int(5), () => ({
              mainText: faker.lorem.paragraph(),
              date: Random.pastDateInYears()
            }))
          : null,
        ...(Random.chance()
          ? { resolved: true, resolverID: Random.element(userIDs) }
          : {})
      });

      //#endregion

      const [map] = await parallel(
        prisma.mMap.create({
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
              from(randRange(vars.images), async () => {
                const id = uuidv4();

                const buffer = Random.element(imageBuffers);

                // Could be fancy and bubble up all the promises here to do in parallel
                // but not worth the insane code
                await Promise.all(
                  ['small', 'medium', 'large', 'xl'].map((size) =>
                    s3.send(
                      new PutObjectCommand({
                        Bucket: process.env['STORAGE_BUCKET_NAME'],
                        Key: `img/${id}-${size}.jpg`,
                        Body: buffer[size]
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
                  from(randRange(vars.reviewsPerMap), review)
                )
              }
            },
            submission: {
              create: {
                type: Random.weighted([
                  [MapSubmissionType.ORIGINAL, 1],
                  [MapSubmissionType.PORT, 1],
                  [MapSubmissionType.SPECIAL, 0.2]
                ]),
                placeholders: from(
                  randRange(vars.submissionPlaceholders),
                  () => [
                    {
                      alias: faker.internet.userName(),
                      type: Random.enumValue(MapCreditType),
                      description: faker.lorem.sentence()
                    }
                  ]
                ),
                dates: submissionsDates(),
                versions: { createMany: { data: versions } },
                suggestions: submissionSuggestions()
              }
            },
            leaderboards: { createMany: { data: leaderboards } }
          },
          include: {
            submission: { include: { versions: true } },
            reviews: { include: { comments: true } }
          }
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

      for (const review of map.reviews) {
        await prisma.mapReviewComment.createMany({
          data: from(randRange(vars.commentsPerReview), () => ({
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

      if (map.status === MapStatusNew.APPROVED) {
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
          from(numPastRuns, (_, i) => {
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

      //#endregion
    }
  } catch (error) {
    console.warn(`Failed creating a map: ${error.message}`);
  }

  //#region Admin Activity

  console.log('Creating admin activity');
  const maps = Random.shuffle(await prisma.mMap.findMany());
  const reports = Random.shuffle(await prisma.report.findMany());
  const adminActivitiesToCreate = randRange(vars.adminActivities);
  for (let i = 0; i < adminActivitiesToCreate; i++) {
    const adminID = Random.element(userIDs);
    const type = Random.element([
      AdminActivityType.USER_UPDATE_ROLES,
      AdminActivityType.USER_UPDATE_BANS,
      AdminActivityType.USER_UPDATE_ALIAS,
      AdminActivityType.USER_UPDATE_BIO,
      AdminActivityType.USER_CREATE_PLACEHOLDER,
      // AdminActivityType.USER_MERGE, // I don't want to simulate the whole merge logic
      AdminActivityType.USER_DELETE,
      AdminActivityType.MAP_UPDATE,
      AdminActivityType.MAP_CONTENT_DELETE,
      AdminActivityType.REPORT_UPDATE,
      AdminActivityType.REPORT_RESOLVE
    ]);

    let target = 0;
    let oldData: any = {};
    let newData: any = {};
    switch (type) {
      case AdminActivityType.USER_UPDATE_ROLES:
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
      case AdminActivityType.USER_UPDATE_BANS:
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
      case AdminActivityType.USER_UPDATE_ALIAS:
        oldData = Random.element(users.filter((u) => u.id !== adminID));
        target = oldData.id;
        newData = await prisma.user.update({
          where: { id: oldData.id },
          data: {
            alias: faker.internet.userName()
          }
        });
        break;
      case AdminActivityType.USER_UPDATE_BIO:
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
      case AdminActivityType.USER_CREATE_PLACEHOLDER:
        newData = await prisma.user.create({
          data: {
            alias: faker.internet.userName(),
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

  //#region Make me admin

  const personalSteamIDs = process.env['ADMIN_STEAM_ID64S'];
  if (!personalSteamIDs) return;

  const xp = new XpSystems();
  const steamIDs = personalSteamIDs.split(',');
  for (const [i, steamID] of steamIDs.entries()) {
    console.log(`Making user ${steamID} an admin`);
    const level = Random.int(COS_XP_PARAMS.levels.maxLevels, 1);
    await prisma.user
      .create({
        data: {
          steamID: BigInt(steamID),
          roles: Role.ADMIN,
          alias: `Admin User ${i + 1}`,
          profile: { create: {} },
          userStats: {
            create: {
              level,
              cosXP: Math.floor(
                xp.getCosmeticXpForLevel(level) +
                  Math.random() *
                    (xp.getCosmeticXpForLevel(level + 1) -
                      xp.getCosmeticXpForLevel(level))
              )
            }
          }
        }
      })
      .catch(() => {});
  }

  //#endregion

  //#endregion

  console.log('Done!');
});
