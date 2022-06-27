import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';
import { ReportCategory, ReportType } from '../src/@common/enums/report.enum';
import { MapStatus, MapType, MapCreditType } from '../src/@common/enums/map.enum';
import { Roles } from '../src/@common/enums/user.enum';
import { ActivityTypes } from '../src/@common/enums/activity.enum';

const prisma = new PrismaClient();

// Seed Configuration
const NUM_OF_USERS_TO_CREATE = 50,
    NUM_OF_USERS_TO_MAKE_MAPPERS = 5,
    NUM_OF_MAPPERS_TO_UPLOAD_MAPS = 10,
    MIN_NUM_OF_MAPS_TO_UPLOAD_EACH = 1,
    MAX_NUM_OF_MAPS_TO_UPLOAD_EACH = 4,
    MIN_NUM_OF_TRACKS_PER_MAP = 1,
    MAX_NUM_OF_TRACKS_PER_MAP = 20,
    MIN_NUM_OF_MAP_IMAGES_PER_MAP = 2,
    MAX_NUM_OF_MAP_IMAGES_PER_MAP = 5,
    MIN_NUM_OF_CREDITS_PER_MAP = 1,
    MAX_NUM_OF_CREDITS_PER_MAP = 10;

// Arrays below are used to prevent many queries to get currently existing user IDs and map IDs
const existingUserIDs = [],
    existingMapIDs = [];

async function main() {
    console.log('Clearing tables');
    await ClearTables();

    console.log('manyUsersJoin');
    await manyUsersJoin();
    console.log('updateExistingUserIDsArray');
    await updateExistingUserIDsArray();
    console.log('makeRandomUsersAMapper');
    await makeRandomUsersAMapper();
    console.log('mappersUploadMaps');
    await mappersUploadMaps(); // TODO: Replace with actual map data and files?
    console.log('updateExistingMapIDsArray');
    await updateExistingMapIDsArray();
    console.log('usersFollowOtherUsers');
    await usersFollowOtherUsers();
    console.log('usersPlayMaps');
    await usersPlayMaps();
    console.log('usersFavoriteMaps');
    await usersFavoriteMaps();
    console.log('usersReviewMaps');
    await usersReviewMaps();
    console.log('reportsAreMade');
    await reportsAreMade();

    console.log('done!');
}

async function ClearTables() {
    await prisma.activity.deleteMany();
    await prisma.badge.deleteMany();
    await prisma.baseStats.deleteMany();
    await prisma.discordAuth.deleteMany();
    await prisma.follow.deleteMany();
    await prisma.map.deleteMany();
    await prisma.mapCredit.deleteMany();
    await prisma.mapFavorite.deleteMany();
    await prisma.mapImage.deleteMany();
    await prisma.mapInfo.deleteMany();
    await prisma.mapLibraryEntry.deleteMany();
    await prisma.mapNotify.deleteMany();
    await prisma.userMapRank.deleteMany();
    await prisma.mapStats.deleteMany();
    await prisma.mapTrack.deleteMany();
    await prisma.mapTrackStats.deleteMany();
    await prisma.mapZone.deleteMany();
    await prisma.mapZoneTriggerProperties.deleteMany();
    await prisma.mapZoneStats.deleteMany();
    await prisma.mapZoneTrigger.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.profile.deleteMany();
    await prisma.report.deleteMany();
    await prisma.run.deleteMany();
    await prisma.runSession.deleteMany();
    await prisma.runSessionTimestamp.deleteMany();
    await prisma.runZoneStats.deleteMany();
    await prisma.twitchAuth.deleteMany();
    await prisma.twitterAuth.deleteMany();
    await prisma.user.deleteMany();
    await prisma.userAuth.deleteMany();
    await prisma.userBadge.deleteMany();
    await prisma.userStats.deleteMany();
    await prisma.xpSystems.deleteMany();
}

function randomIntFromInterval(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

function randomFloatFromInterval(min: number, max: number, decimalPlaces: number): number {
    const rand = Math.random() * (max - min) + min;
    const power = Math.pow(10, decimalPlaces);
    return Math.floor(rand * power) / power;
}

function randomCreatedUpdatedDate(startDate?: Date) {
    const createdAtDate = faker.date.past(1, startDate ?? null);
    const updatedAtDate = faker.date.between(createdAtDate, new Date());

    return {
        createdAtDate: createdAtDate,
        updatedAtDate: updatedAtDate
    };
}

function randomEnumIntValue(enumeration, retryCatch?: number): number {
    if (retryCatch === null) {
        retryCatch = 0;
    }
    if (retryCatch >= 10) {
        throw new Error('Stack Overflow Save: Are you sure this Enum has number values?');
    }
    const values = Object.keys(enumeration);
    const enumKey = values[Math.floor(Math.random() * values.length)];
    const result = enumeration[enumKey];
    if (typeof result != 'number') {
        return randomEnumIntValue(enumeration, retryCatch++);
    }
    return result;
}

function randomEnumStringValue(enumeration, retryCatch?: number): string {
    if (retryCatch === null) {
        retryCatch = 0;
    }
    if (retryCatch >= 10) {
        throw new Error('Stack Overflow Save: Are you sure this Enum has string values?');
    }
    const values = Object.keys(enumeration);
    const enumKey = values[Math.floor(Math.random() * values.length)];
    const result = enumeration[enumKey];
    if (typeof result != 'number') {
        return randomEnumStringValue(enumeration, retryCatch++);
    }
    return result.toString();
}

async function createRandomUser() {
    const dates = randomCreatedUpdatedDate();

    return await prisma.user.create({
        data: {
            steamID: randomIntFromInterval(1000000000, 99999999999).toString(),
            alias: faker.name.findName(),
            aliasLocked: faker.datatype.boolean(),
            avatar: '0d/0d0f330f84ceea21f04c65bd4c1efbff6172c519_full.jpg', // Currently can't use random user image from faker.js
            roles: randomIntFromInterval(0, 64),
            bans: randomIntFromInterval(0, 64),
            country: faker.address.countryCode()
        }
    });
}

async function createRandomUserProfile(userID) {
    const dates = randomCreatedUpdatedDate();

    return await prisma.profile.create({
        data: {
            userID: userID,
            bio: faker.lorem.paragraphs()
        }
    });
}

async function createRandomUserStats(userID) {
    const dates = randomCreatedUpdatedDate();

    return await prisma.userStats.create({
        data: {
            userID: userID,
            totalJumps: faker.datatype.number(),
            totalStrafes: faker.datatype.number(),
            level: randomIntFromInterval(0, 1000),
            cosXP: faker.datatype.number(),
            mapsCompleted: faker.datatype.number(),
            runsSubmitted: faker.datatype.number()
        }
    });
}

async function createRandomMap(submitterID) {
    const dates = randomCreatedUpdatedDate();

    return await prisma.map.create({
        data: {
            name: faker.lorem.word(),
            type: randomEnumIntValue(MapType),
            statusFlag: randomEnumIntValue(MapStatus),
            downloadURL: faker.image.cats(),
            hash: faker.random.alphaNumeric(),
            submitterID: submitterID
        }
    });
}

async function createRandomMapInfo(mapID) {
    const dates = randomCreatedUpdatedDate();

    return await prisma.mapInfo.create({
        data: {
            mapID: mapID,
            description: faker.lorem.paragraphs(),
            numTracks: randomIntFromInterval(1, 100),
            creationDate: faker.date.past()
        }
    });
}

async function createRandomMapImage(mapID) {
    const imageURL = faker.image.image();
    const dates = randomCreatedUpdatedDate();

    return await prisma.mapImage.create({
        data: {
            small: imageURL,
            medium: imageURL,
            large: imageURL,
            mapID: mapID
        }
    });
}

async function createRandomMapCredit(mapID, userID) {
    const dates = randomCreatedUpdatedDate();

    return await prisma.mapCredit.create({
        data: {
            type: randomEnumIntValue(MapCreditType),
            mapID: mapID,
            userID: userID
        }
    });
}

async function createRandomBaseStats() {
    const dates = randomCreatedUpdatedDate();

    return await prisma.baseStats.create({
        data: {
            jumps: faker.datatype.number(),
            strafes: faker.datatype.number(),
            avgStrafeSync: randomFloatFromInterval(1, 120, 4),
            avgStrafeSync2: randomFloatFromInterval(1, 120, 4),
            enterTime: randomFloatFromInterval(1, 5, 4),
            totalTime: randomFloatFromInterval(30, 99999999, 2),
            velAvg3D: randomFloatFromInterval(1, 9001, 2),
            velAvg2D: randomFloatFromInterval(1, 9001, 2),
            velMax3D: randomFloatFromInterval(1, 9001, 2),
            velMax2D: randomFloatFromInterval(1, 9001, 2),
            velEnter3D: randomFloatFromInterval(1, 9001, 2),
            velEnter2D: randomFloatFromInterval(1, 9001, 2),
            velExit3D: randomFloatFromInterval(1, 9001, 2),
            velExit2D: randomFloatFromInterval(1, 9001, 2)
        }
    });
}

async function createRandomMapStats(mapID, baseStatsID) {
    const dates = randomCreatedUpdatedDate();

    return await prisma.mapStats.create({
        data: {
            mapID: mapID,
            baseStatsID: baseStatsID,
            reviews: faker.datatype.number(),
            downloads: faker.datatype.number(),
            subscriptions: faker.datatype.number(),
            plays: faker.datatype.number(),
            favorites: faker.datatype.number(),
            completions: faker.datatype.number(),
            uniqueCompletions: faker.datatype.number(),
            timePlayed: faker.datatype.number()
        }
    });
}

async function createRandomMapTrack(mapID) {
    const dates = randomCreatedUpdatedDate();

    return await prisma.mapTrack.create({
        data: {
            mapID: mapID,
            trackNum: randomIntFromInterval(0, 127),
            numZones: randomIntFromInterval(5, 127),
            isLinear: faker.datatype.boolean(),
            difficulty: randomIntFromInterval(1, 8)
        }
    });
}

async function createRandomMapTrackStats(mapTrackID, baseStatsID) {
    const dates = randomCreatedUpdatedDate();

    return await prisma.mapTrackStats.create({
        data: {
            mapTrackID: mapTrackID,
            baseStatsID: baseStatsID,
            completions: faker.datatype.number(),
            uniqueCompletions: faker.datatype.number()
        }
    });
}

async function createRandomMapZone(mapTrackID) {
    const dates = randomCreatedUpdatedDate();

    return await prisma.mapZone.create({
        data: {
            trackID: mapTrackID,
            zoneNum: randomIntFromInterval(0, 127)
        }
    });
}

async function createRandomMapZoneStats(mapZoneID, baseStatsID) {
    const dates = randomCreatedUpdatedDate();

    return await prisma.mapZoneStats.create({
        data: {
            zoneID: mapZoneID,
            baseStatsID: baseStatsID,
            completions: faker.datatype.number(),
            uniqueCompletions: faker.datatype.number()
        }
    });
}

async function createRandomRun(mapID, playerID, baseStatsID) {
    const dates = randomCreatedUpdatedDate();

    return await prisma.run.create({
        data: {
            mapID: mapID,
            playerID: playerID,
            baseStatsID: baseStatsID,
            trackNum: randomIntFromInterval(0, 127),
            zoneNum: randomIntFromInterval(0, 127),
            ticks: faker.datatype.number(),
            tickRate: randomIntFromInterval(24, 1000),
            flags: 0,
            file: faker.image.cats(),
            hash: faker.random.alphaNumeric()
        }
    });
}

async function createRandomRunZoneStats(runID, baseStatsID) {
    const dates = randomCreatedUpdatedDate();

    return await prisma.runZoneStats.create({
        data: {
            runID: runID,
            baseStatsID: baseStatsID,
            zoneNum: randomIntFromInterval(0, 127)
        }
    });
}

async function createRandomMapRank(mapID, userID, runID) {
    const dates = randomCreatedUpdatedDate();

    return await prisma.userMapRank.create({
        data: {
            mapID: mapID,
            userID: userID,
            runID: runID,
            gameType: randomIntFromInterval(0, 127),
            flags: 0,
            trackNum: randomIntFromInterval(0, 127),
            zoneNum: randomIntFromInterval(0, 127),
            rank: faker.datatype.number(),
            rankXP: faker.datatype.number()
        }
    });
}

async function createRandomUserFollow(followeeID, followedID) {
    const dates = randomCreatedUpdatedDate();

    return await prisma.follow.create({
        data: {
            followeeID: followeeID,
            followedID: followedID,
            notifyOn: randomIntFromInterval(0, 127)
        }
    });
}

async function createRandomMapReview(userID, mapID) {
    const dates = randomCreatedUpdatedDate();

    return await prisma.mapReview.create({
        data: {
            reviewerID: userID,
            mapID: mapID,
            text: faker.lorem.sentences()
        }
    });
}

async function createRandomActivity(userID, type, data) {
    const dates = randomCreatedUpdatedDate();

    return await prisma.activity.create({
        data: {
            userID: userID,
            type: type,
            data: data
        }
    });
}

async function createRandomReport(reportType, data, submitterID, resolverID) {
    const dates = randomCreatedUpdatedDate();

    return await prisma.report.create({
        data: {
            type: reportType,
            data: data.toString(),
            category: randomEnumIntValue(ReportCategory),
            message: faker.lorem.paragraph(),
            resolved: faker.datatype.boolean(),
            resolutionMessage: faker.lorem.sentence(),
            submitterID: submitterID,
            resolverID: resolverID
        }
    });
}

async function manyUsersJoin() {
    const userJoins = [];
    for (let i = 0; i < NUM_OF_USERS_TO_CREATE; i++) {
        userJoins.push(
            createRandomUser().then((newUser) => {
                return createRandomUserProfile(newUser.id).then(() => {
                    return createRandomUserStats(newUser.id);
                });
            })
        );
    }
    return Promise.all(userJoins);
}

async function makeRandomUsersAMapper() {
    return await prisma.user
        .findMany({
            select: {
                id: true,
                roles: true
            },
            take: NUM_OF_USERS_TO_MAKE_MAPPERS
        })
        .then((users) => {
            const userUpdates = [];
            for (const usr of users)
                userUpdates.push(
                    prisma.user.update({
                        where: {
                            id: usr.id
                        },
                        data: {
                            roles: usr.roles | Roles.MAPPER
                        }
                    })
                );
            return Promise.all(userUpdates);
        });
}

async function mappersUploadMaps() {
    return await prisma.user
        .findMany({
            select: {
                id: true
            },
            where: {
                roles: Roles.MAPPER
            },
            take: NUM_OF_MAPPERS_TO_UPLOAD_MAPS
        })
        .then((mappers) => {
            const mapperMapUploads = [];
            for (const mapper of mappers) {
                for (
                    let i = 0;
                    i < randomIntFromInterval(MIN_NUM_OF_MAPS_TO_UPLOAD_EACH, MAX_NUM_OF_MAPS_TO_UPLOAD_EACH);
                    i++
                ) {
                    mapperMapUploads.push(
                        createRandomMap(mapper.id).then((createdMap) => {
                            return createRandomMapInfo(createdMap.id)
                                .then(() => {
                                    const mapTrackCreations = [];
                                    for (
                                        let i = 0;
                                        i < randomIntFromInterval(MIN_NUM_OF_TRACKS_PER_MAP, MAX_NUM_OF_TRACKS_PER_MAP);
                                        i++
                                    )
                                        mapTrackCreations.push(createRandomMapTrack(createdMap.id));
                                    return Promise.all(mapTrackCreations);
                                })
                                .then((createdMapTracks) => {
                                    const baseStatsCreations = [];
                                    for (const createdMapTrack of createdMapTracks)
                                        baseStatsCreations.push(createRandomBaseStats());
                                    return Promise.all(baseStatsCreations).then((createdBaseStats) => {
                                        const mapTrackStatsCreations = [];
                                        for (let i = 0; i < createdBaseStats.length; i++)
                                            mapTrackStatsCreations.push(
                                                createRandomMapTrackStats(
                                                    createdMapTracks[i].id,
                                                    createdBaseStats[i].id
                                                )
                                            );
                                        return Promise.all(mapTrackStatsCreations);
                                    });
                                })
                                .then((createdMapTrackStats) => {
                                    const mapZoneCreations = []; // Could probably handle this more realistically x)
                                    for (const createdMapTrackStat of createdMapTrackStats)
                                        mapZoneCreations.push(createRandomMapZone(createdMapTrackStat.mapTrackID));
                                    return Promise.all(mapZoneCreations);
                                })
                                .then((createdMapZones) => {
                                    const mapImageCreations = [];
                                    for (
                                        let i = 0;
                                        i <
                                        randomIntFromInterval(
                                            MIN_NUM_OF_MAP_IMAGES_PER_MAP,
                                            MAX_NUM_OF_MAP_IMAGES_PER_MAP
                                        );
                                        i++
                                    )
                                        mapImageCreations.push(createRandomMapImage(createdMap.id));
                                    return Promise.all(mapImageCreations);
                                })
                                .then((createdMapImages) => {
                                    return prisma.map.update({
                                        where: {
                                            id: createdMap.id
                                        },
                                        data: {
                                            thumbnailID: createdMapImages[0].id
                                        }
                                    });
                                })
                                .then(() => {
                                    const mapCreditCreations = [];
                                    for (
                                        let i = 0;
                                        i <
                                        randomIntFromInterval(MIN_NUM_OF_CREDITS_PER_MAP, MAX_NUM_OF_CREDITS_PER_MAP);
                                        i++
                                    )
                                        mapCreditCreations.push(
                                            createRandomMapCredit(
                                                createdMap.id,
                                                faker.helpers.arrayElement(existingUserIDs)
                                            )
                                        );
                                    return Promise.all(mapCreditCreations);
                                })
                                .then(() => {
                                    return createRandomBaseStats();
                                })
                                .then((createdBaseStats) => {
                                    return createRandomMapStats(createdMap.id, createdBaseStats.id);
                                })
                                .then(() => {
                                    return createRandomActivity(
                                        createdMap.submitterID,
                                        ActivityTypes.MAP_UPLOADED,
                                        createdMap.id
                                    );
                                })
                                .then(() => {
                                    return createRandomActivity(
                                        createdMap.submitterID,
                                        ActivityTypes.MAP_APPROVED,
                                        createdMap.id
                                    );
                                })
                                .catch((err) => {
                                    return Promise.reject(err);
                                });
                        })
                    );
                }
            }
            return Promise.all(mapperMapUploads);
        });
}

const usersFollowOtherUsers = () => {
    const userFollowCreations = [];
    for (let i = 0; i < existingUserIDs.length; i++) {
        for (let j = 0; j < existingUserIDs.length; j++) {
            if (i !== j && randomIntFromInterval(1, 100) <= 5)
                userFollowCreations.push(createRandomUserFollow(existingUserIDs[i], existingUserIDs[j]));
        }
    }
    return Promise.all(userFollowCreations);
};

const usersPlayMaps = () => {
    const userMapPlays = [];
    for (let i = 0; i < existingUserIDs.length; i++) {
        for (let j = 0; j < existingMapIDs.length; j++) {
            if (randomIntFromInterval(1, 100) <= 25) {
                let createdBaseStatsID;
                let createdRunID;
                userMapPlays.push(
                    createRandomBaseStats()
                        .then((createdBaseStats) => {
                            createdBaseStatsID = createdBaseStats.id;
                            return createRandomRun(existingMapIDs[j], existingUserIDs[i], createdBaseStats.id);
                        })
                        .then((createdRun) => {
                            createdRunID = createdRun.id;
                            const runZoneStatCreations = [];
                            for (let k = 0; k < randomIntFromInterval(1, 10); k++) {
                                runZoneStatCreations.push(
                                    createRandomBaseStats().then((createdBaseStats) => {
                                        return createRandomRunZoneStats(createdRun.id, createdBaseStats.id);
                                    })
                                );
                            }
                            return Promise.all(runZoneStatCreations);
                        })
                        .then((createdRunZoneStats) => {
                            return createRandomMapRank(existingMapIDs[j], existingUserIDs[i], createdRunID);
                        })
                );
            }
        }
    }
    return Promise.all(userMapPlays);
};

const usersFavoriteMaps = () => {
    const mapFavoriteCreations = [];
    for (let i = 0; i < existingUserIDs.length; i++) {
        for (let j = 0; j < existingMapIDs.length; j++) {
            if (randomIntFromInterval(1, 100) <= 5) {
                mapFavoriteCreations.push(() => {
                    const dates = randomCreatedUpdatedDate();
                    prisma.mapFavorite.create({
                        data: {
                            userID: existingUserIDs[i],
                            mapID: existingMapIDs[j],
                            createdAt: dates.createdAtDate,
                            updatedAt: dates.updatedAtDate
                        }
                    });
                });
            }
        }
    }
    Promise.all(mapFavoriteCreations);
};

const usersReviewMaps = () => {
    const mapReviewCreations = [];
    for (let i = 0; i < existingUserIDs.length; i++) {
        for (let j = 0; j < existingMapIDs.length; j++) {
            if (randomIntFromInterval(1, 100) <= 5) {
                mapReviewCreations.push(createRandomMapReview(existingUserIDs[i], existingMapIDs[j]));
            }
        }
    }
    return Promise.all(mapReviewCreations);
};

const reportsAreMade = () => {
    const reportCreations = [];
    for (let i = 0; i < existingUserIDs.length; i++) {
        for (let j = 0; j < existingMapIDs.length; j++) {
            if (randomIntFromInterval(1, 100) <= 5) {
                reportCreations.push(
                    createRandomReport(
                        ReportType.MAP_REPORT,
                        existingMapIDs[j],
                        existingUserIDs[i],
                        faker.helpers.arrayElement(existingUserIDs)
                    )
                );
            }
        }
    }
    for (let i = 0; i < existingUserIDs.length; i++) {
        for (let j = 0; j < existingUserIDs.length; j++) {
            if (existingUserIDs[i] !== existingUserIDs[j] && randomIntFromInterval(1, 100) <= 5) {
                reportCreations.push(
                    createRandomReport(
                        ReportType.USER_PROFILE_REPORT,
                        existingUserIDs[j],
                        existingUserIDs[i],
                        faker.helpers.arrayElement(existingUserIDs)
                    )
                );
            }
        }
    }
    return Promise.all(reportCreations);
};

async function updateExistingUserIDsArray() {
    return prisma.user
        .findMany({
            select: {
                id: true
            }
        })
        .then((allUsers) => {
            for (const u of allUsers) existingUserIDs.push(u.id);
        });
}

async function updateExistingMapIDsArray() {
    return await prisma.map
        .findMany({
            select: {
                id: true
            }
        })
        .then((allMaps) => {
            for (const m of allMaps) existingMapIDs.push(m.id);
        });
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
