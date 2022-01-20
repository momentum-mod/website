import { PrismaClient } from "@prisma/client";
import faker from "faker";

import { EMapStatus, EMapType, EMapCreditType } from '../src/@common/enums/map.enum';

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
    await ClearTables();    

    await manyUsersJoin();
    await updateExistingUserIDsArray();
    await makeRandomUsersAMapper();
    await mappersUploadMaps(); // TODO: Replace with actual map data and files?
    await updateExistingMapIDsArray();
    await usersFollowOtherUsers();
    await usersPlayMaps();
    await usersFavoriteMaps();
    await usersReviewMaps();
    await reportsAreMade();
}

async function ClearTables() {
    await prisma.activity.deleteMany();
    await prisma.badge.deleteMany();
    await prisma.baseStat.deleteMany();
    await prisma.discordAuth.deleteMany();
    await prisma.follow.deleteMany();
    await prisma.map.deleteMany();
    await prisma.mapCredit.deleteMany();
    await prisma.mapFavorite.deleteMany();
    await prisma.mapImage.deleteMany();
    await prisma.mapInfo.deleteMany();
    await prisma.mapLibraryEntries.deleteMany();
    await prisma.mapNotify.deleteMany();
    await prisma.mapRank.deleteMany();
    await prisma.mapStats.deleteMany();
    await prisma.mapTrack.deleteMany();
    await prisma.mapTrackStat.deleteMany();
    await prisma.mapZone.deleteMany();
    await prisma.mapZoneProp.deleteMany();
    await prisma.mapZoneStat.deleteMany();
    await prisma.mapZoneTrigger.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.profile.deleteMany();
    await prisma.report.deleteMany();
    await prisma.run.deleteMany();
    await prisma.runSession.deleteMany();
    await prisma.runSessionTimestamp.deleteMany();
    await prisma.runZoneStat.deleteMany();
    await prisma.twitchAuth.deleteMany();
    await prisma.twitterAuth.deleteMany();
    await prisma.user.deleteMany();
    await prisma.userAuth.deleteMany();
    await prisma.userBadge.deleteMany();
    await prisma.userStat.deleteMany();
    await prisma.xpSystem.deleteMany();
}

function randomIntFromInterval(min:number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

function randomFloatFromInterval(min: number, max: number, decimalPlaces: number): number{
    const rand = Math.random() * (max - min) + min;
    const power = Math.pow(10, decimalPlaces);
    return Math.floor(rand * power) / power;
}

function randomCreatedUpdatedDate(startDate?: Date) {  
    if(!startDate) { startDate = new Date() }
    
    const createdAtDate = faker.date.past(startDate);
    const updatedAtDate = faker.date.future(createdAtDate);
    return {
        createdAtDate: createdAtDate,
        updatedAtDate: updatedAtDate
    }

}

async function createRandomUser() {
    const dates = randomCreatedUpdatedDate();

    return await prisma.user.create({
        data: {
            steamID: randomIntFromInterval(10000000000000000, 99999999999999999).toString(),
            alias: faker.name.findName(),
            aliasLocked: faker.random.boolean(),
            avatar: '0d/0d0f330f84ceea21f04c65bd4c1efbff6172c519_full.jpg', // Currently can't use random user image from faker.js
            roles: randomIntFromInterval(0, 64),
            bans: randomIntFromInterval(0, 64),
            country: faker.address.countryCode(),
            createdAt: dates.createdAtDate,
            updatedAt: dates.updatedAtDate,
        },
    });
}

async function createRandomUserProfile(userID) {
    const dates = randomCreatedUpdatedDate();

    return await prisma.profile.create({
        data: {
            userID: userID,
            bio: faker.lorem.paragraphs(),
            createdAt: dates.createdAtDate,
            updatedAt: dates.updatedAtDate,
        }
    });
}

async function createRandomUserStats(userID) {
    const dates = randomCreatedUpdatedDate();

    return await prisma.userStat.create({
        data: {
            userID: userID,
            totalJumps: faker.random.number(),
            totalStrafes: faker.random.number(),
            level: randomIntFromInterval(0, 1000),
            cosXP: faker.random.number(),
            mapsCompleted: faker.random.number(),
            runsSubmitted: faker.random.number(),
            createdAt: dates.createdAtDate,
            updatedAt: dates.updatedAtDate,
        }
    });
}

async function createRandomMap(submitterID) {
    const dates = randomCreatedUpdatedDate();

    return await prisma.map.create({
        data: {
            name: faker.lorem.word(),
            type: faker.random.arrayElement(Object.values(EMapType)),
            statusFlag: faker.random.arrayElement(Object.values(EMapStatus)),
            downloadURL: faker.image.cats(),
            hash: faker.random.alphaNumeric(),
            submitterID: submitterID,
            createdAt: dates.createdAtDate,
            updatedAt: dates.updatedAtDate,
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
            creationDate: faker.date.past(),
            updatedAt: dates.updatedAtDate,
            createdAt: dates.createdAtDate
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
            mapID: mapID,
            createdAt: dates.createdAtDate,
            updatedAt: dates.updatedAtDate,
        }
    });
}
async function createRandomMapCredit(mapID, userID) {
    const dates = randomCreatedUpdatedDate();

    return await prisma.mapCredit.create({
        data: {
            type: faker.random.arrayElement(Object.values(EMapCreditType)),
            mapID: mapID,
            userID: userID,
            createdAt: dates.createdAtDate,
            updatedAt: dates.updatedAtDate,
        }
    });
}

async function createRandomBaseStats() {
    const dates = randomCreatedUpdatedDate();

    return await prisma.baseStat.create({
        data:{
            jumps: faker.random.number(),
            strafes: faker.random.number(),
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
            velExit2D: randomFloatFromInterval(1, 9001, 2),
            createdAt: dates.createdAtDate,
            updatedAt: dates.updatedAtDate,
        }
    });
}

async function createRandomMapStats(mapID, baseStatsID) {
    const dates = randomCreatedUpdatedDate();

    return await prisma.mapStats.create({
        data: {
            mapID: mapID,
            baseStatsID: baseStatsID,
            totalReviews: faker.random.number(),
            totalDownloads: faker.random.number(),
            totalSubscriptions: faker.random.number(),
            totalPlays: faker.random.number(),
            totalFavorites: faker.random.number(),
            totalCompletions: faker.random.number(),
            totalUniqueCompletions: faker.random.number(),
            totalTimePlayed: faker.random.number(),
            createdAt: dates.createdAtDate,
            updatedAt: dates.updatedAtDate,
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
            isLinear: faker.random.boolean(),
            difficulty: randomIntFromInterval(1, 8),            
            createdAt: dates.createdAtDate,
            updatedAt: dates.updatedAtDate,
        }
    });
}

const createRandomMapTrackStats = (mapTrackID, baseStatsID) => {
    return MapTrackStats.create({
        mapTrackID: mapTrackID,
        baseStatsID: baseStatsID,
        completions: faker.random.number(),
        uniqueCompletions: faker.random.number(),
    }, { raw: true });
};

const createRandomMapZone = (mapTrackID) => {
    return MapZone.create({
        mapTrackID: mapTrackID,
        zoneNum: randomIntFromInterval(0, 127),
    }, { raw: true });
};

const createRandomMapZoneStats = (mapZoneID, baseStatsID) => {
    return MapZoneStats.create({
        mapZoneID: mapZoneID,
        baseStatsID: baseStatsID,
        completions: faker.random.number(),
        uniqueCompletions: faker.random.number(),
    }, { raw: true });
};

const createRandomRun = (mapID, playerID, baseStatsID) => {
    return Run.create({
        mapID: mapID,
        playerID: playerID,
        baseStatsID: baseStatsID,
        trackNum: randomIntFromInterval(0, 127),
        zoneNum: randomIntFromInterval(0, 127),
        ticks: faker.random.number(),
        tickRate: randomIntFromInterval(24, 1000),
        flags: 0,
        file: faker.image.cats(),
        hash: faker.random.alphaNumeric(),
    }, { raw: true });
};

const createRandomRunZoneStats = (runID, baseStatsID) => {
    return RunZoneStats.create({
        runID: runID,
        baseStatsID: baseStatsID,
        zoneNum: randomIntFromInterval(0, 127),
    }, { raw: true });
};

const createRandomMapRank = (mapID, userID, runID) => {
    return UserMapRank.create({
        mapID: mapID,
        userID: userID,
        runID: runID,
        gameType: randomIntFromInterval(0, 127),
        flags: 0,
            trackNum: randomIntFromInterval(0, 127),
        zoneNum: randomIntFromInterval(0, 127),
        rank: faker.random.number(),
        rankXP: faker.random.number(),
    }, { raw: true });
};

const createRandomUserFollow = (followeeID, followedID) => {
    return UserFollows.create({
        followeeID: followeeID,
        followedID: followedID,
        notifyOn: randomIntFromInterval(0, 127),
    }, { raw: true });
};

const createRandomMapReview = (userID, mapID) => {
    return MapReview.create({
        reviewerID: userID,
        mapID: mapID,
        text: faker.lorem.sentences(),
    }, { raw: true })
};

const createRandomActivity = (userID, type, data) => {
    return Activity.create({
        userID: userID,
        type: type,
        data: data,
    }, { raw: true});
};

const createRandomReport = (reportType, data, submitterID, resolverID) => {
    return Report.create({
        type: reportType,
        data: data,
        category: faker.random.arrayElement(Object.values(report.ReportCategory)),
        message: faker.lorem.paragraph(),
        resolved: randomIntFromInterval(0, 1),
        resolutionMessage: faker.lorem.sentence(),
        submitterID: submitterID,
        resolverID: resolverID,
    }, { raw: true });
};

const manyUsersJoin = () => {
    const userJoins = [];
    for (let i = 0; i < NUM_OF_USERS_TO_CREATE; i++) {
        userJoins.push(
            createRandomUser().then(newUser => {
                return createRandomUserProfile(newUser.id).then(() => {
                    return createRandomUserStats(newUser.id);
                })
            })
        );
    }
    return Promise.all(userJoins);
};

const makeRandomUsersAMapper = () => {
    return User.findAll({
        attributes: ['id', 'roles'],
        limit: NUM_OF_USERS_TO_MAKE_MAPPERS,
        raw: true,
    }).then(users => {
        const userUpdates = [];
        for (const usr of users)
            userUpdates.push(User.update({ roles: usr.roles | user.Role.MAPPER }, { where: { id: usr.id }}));
        return Promise.all(userUpdates);
    });
};

const mappersUploadMaps = () => {
    return User.findAll({
        attributes: ['id'],
        where: sequelize.where(sequelize.literal('roles & ' + user.Role.MAPPER), user.Role.MAPPER),
        limit: NUM_OF_MAPPERS_TO_UPLOAD_MAPS,
        raw: true,
    }).then(mappers => {
        const mapperMapUploads = [];
        for (const mapper of mappers) {
            for (let i = 0; i < randomIntFromInterval(MIN_NUM_OF_MAPS_TO_UPLOAD_EACH, MAX_NUM_OF_MAPS_TO_UPLOAD_EACH); i++) {
                mapperMapUploads.push(
                    createRandomMap(mapper.id).then(createdMap => {
                        return createRandomMapInfo(createdMap.id).then(() => {
                            const mapTrackCreations = [];
                            for (let i = 0; i < randomIntFromInterval(MIN_NUM_OF_TRACKS_PER_MAP, MAX_NUM_OF_TRACKS_PER_MAP); i++)
                                mapTrackCreations.push(createRandomMapTrack(createdMap.id));
                            return Promise.all(mapTrackCreations);
                        }).then(createdMapTracks => {
                            const baseStatsCreations = [];
                            for (const createdMapTrack of createdMapTracks)
                                baseStatsCreations.push(createRandomBaseStats());
                            return Promise.all(baseStatsCreations).then(createdBaseStats => {
                                const mapTrackStatsCreations = [];
                                for (let i = 0; i < createdBaseStats.length; i++)
                                    mapTrackStatsCreations.push(createRandomMapTrackStats(createdMapTracks[i].id, createdBaseStats[i].id));
                                return Promise.all(mapTrackStatsCreations);
                            });
                        }).then(createdMapTrackStats => {
                            const mapZoneCreations = []; // Could probably handle this more realistically x)
                            for (const createdMapTrackStat of createdMapTrackStats)
                                mapZoneCreations.push(createRandomMapZone(createdMapTrackStat.mapTrackID));
                            return Promise.all(mapZoneCreations);
                        }).then(createdMapZones => {
                            const mapImageCreations = [];
                            for (let i = 0; i < randomIntFromInterval(MIN_NUM_OF_MAP_IMAGES_PER_MAP, MAX_NUM_OF_MAP_IMAGES_PER_MAP); i++)
                                mapImageCreations.push(createRandomMapImage(createdMap.id));
                            return Promise.all(mapImageCreations);
                        }).then(createdMapImages => {
                            return Map.update({
                                thumbnailID: createdMapImages[0].id,
                            }, { where: { id: createdMap.id }});
                        }).then(() => {
                            const mapCreditCreations = [];
                            for (let i = 0; i < randomIntFromInterval(MIN_NUM_OF_CREDITS_PER_MAP, MAX_NUM_OF_CREDITS_PER_MAP); i++)
                                mapCreditCreations.push(createRandomMapCredit(createdMap.id, faker.random.arrayElement(existingUserIDs)));
                            return Promise.all(mapCreditCreations);
                        }).then(() => {
                            return createRandomBaseStats();
                        }).then(createdBaseStats => {
                            return createRandomMapStats(createdMap.id, createdBaseStats.id);
                        }).then(() => {
                            return createRandomActivity(createdMap.submitterID, activity.ACTIVITY_TYPES.MAP_UPLOADED, createdMap.id);
                        }).then(() => {
                            return createRandomActivity(createdMap.submitterID, activity.ACTIVITY_TYPES.MAP_APPROVED, createdMap.id);
                        }).catch(err => {
                            return Promise.reject(err);
                        });
                    })
                );
            }
        }
        return Promise.all(mapperMapUploads);
    });
};

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
                    createRandomBaseStats().then(createdBaseStats => {
                        createdBaseStatsID = createdBaseStats.id;
                        return createRandomRun(existingMapIDs[j], existingUserIDs[i], createdBaseStats.id);
                    }).then(createdRun => {
                        createdRunID = createdRun.id;
                        const runZoneStatCreations = [];
                        for (let k = 0; k < randomIntFromInterval(1, 10); k++) {
                            runZoneStatCreations.push(
                                createRandomBaseStats().then(createdBaseStats => {
                                    return createRandomRunZoneStats(createdRun.id, createdBaseStats.id);
                                })
                            );
                        }
                        return Promise.all(runZoneStatCreations);
                    }).then(createdRunZoneStats => {
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
                mapFavoriteCreations.push(
                    MapFavorite.create({
                        userID: existingUserIDs[i],
                        mapID: existingMapIDs[j],
                    })
                );
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
                    createRandomReport(report.ReportType.MAP_REPORT, existingMapIDs[j],
                        existingUserIDs[i], faker.random.arrayElement(existingUserIDs))
                );
            }

        }
    }
    for (let i = 0; i < existingUserIDs.length; i++) {
        for (let j = 0; j < existingUserIDs.length; j++) {
            if (existingUserIDs[i] !== existingUserIDs[j] && randomIntFromInterval(1, 100) <= 5) {
                reportCreations.push(
                    createRandomReport(report.ReportType.USER_PROFILE_REPORT, existingUserIDs[j],
                        existingUserIDs[i], faker.random.arrayElement(existingUserIDs))
                );
            }
        }
    }
    return Promise.all(reportCreations);
};

const updateExistingUserIDsArray = () => {
    return User.findAll({
        attributes: ['id'],
    }, { raw: true }).then(allUsers => {
        for (const u of allUsers)
            existingUserIDs.push(u.id);
    });
};

const updateExistingMapIDsArray = () => {
    return Map.findAll({
        attributes: ['id'],
    }, { raw: true }).then(allMaps => {
        for (const m of allMaps)
            existingMapIDs.push(m.id);
    });
};



main()
.catch((e) => {
    console.error(e);
    process.exit(1);
})
.finally(async () => {
    await prisma.$disconnect();
});
