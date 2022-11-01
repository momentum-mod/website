import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException
} from '@nestjs/common';
import { Map as MapDB, MapCredit, MapTrack, Prisma } from '@prisma/client';
import { CreateMapDto, MapDto } from '../../common/dto/map/map.dto';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import { MapsRepoService } from '../repo/maps-repo.service';
import { AuthService } from '../auth/auth.service';
import { MapCreditType, MapStatus, MapType } from '../../common/enums/map.enum';
import { FileStoreCloudService } from '../filestore/file-store-cloud.service';
import { DtoFactory, ExpandToPrismaIncludes } from '../../common/utils/dto.utility';
import { UsersRepoService } from '../repo/users-repo.service';
import { ActivityTypes } from '../../common/enums/activity.enum';
import { CreateMapCreditDto, MapCreditDto, UpdateMapCreditDto } from '../../common/dto/map/map-credit.dto';
import { MapInfoDto, UpdateMapInfoDto } from '../../common/dto/map/map-info.dto';
import { MapTrackDto } from '../../common/dto/map/map-track.dto';
import { MapsCtlGetAllQuery } from '../../common/dto/query/map-queries.dto';

@Injectable()
export class MapsService {
    constructor(
        private readonly authService: AuthService,
        private readonly mapRepo: MapsRepoService,
        private readonly userRepo: UsersRepoService,
        private readonly fileCloudService: FileStoreCloudService
    ) {}

    //#region Maps

    async getAll(userID: number, query: MapsCtlGetAllQuery): Promise<PaginatedResponseDto<MapDto>> {
        // Old API has some stuff for "status" and "statusNot" and "priority" but isn't in docs or validations or
        // used anywhere in client/game, leaving for now.

        // Where
        const where: Prisma.MapWhereInput = {};
        if (query.search) where.name = { startsWith: query.search };
        if (query.submitterID) where.submitterID = query.submitterID;
        if (query.type) where.type = query.type;

        if (query.difficultyHigh && query.difficultyLow)
            where.mainTrack = { is: { difficulty: { lt: query.difficultyHigh, gt: query.difficultyLow } } };
        else if (query.difficultyLow) where.mainTrack = { is: { difficulty: { gt: query.difficultyLow } } };
        else if (query.difficultyHigh) where.mainTrack = { is: { difficulty: { lt: query.difficultyHigh } } };

        // If we have difficulty filters we have to construct quite a complicated filter...
        if (query.isLinear)
            where.mainTrack = where.mainTrack ? { is: { ...where.mainTrack.is, isLinear: true } } : { isLinear: true };

        // Include
        const include: Prisma.MapInclude = {
            mainTrack: true,
            info: true,
            ...ExpandToPrismaIncludes(query.expand?.filter((x) => ['credits', 'thumbnail'].includes(x)))
        };

        const incPB = query.expand?.includes('personalBest');
        const incWR = query.expand?.includes('worldRecord');

        MapsService.handleMapGetIncludes(
            include,
            query.expand?.includes('inFavorites'),
            query.expand?.includes('inLibrary'),
            incPB,
            incWR,
            userID
        );

        // Order
        const order: Prisma.MapOrderByWithRelationInput = { createdAt: 'desc' };

        const dbResponse = await this.mapRepo.getAll(where, include, order, query.skip, query.take);

        if (incPB || incWR) {
            dbResponse[0].forEach((map) => MapsService.handleMapGetPrismaResponse(map, userID, incPB, incWR));
        }

        return new PaginatedResponseDto(MapDto, dbResponse);
    }

    async get(mapID: number, userID?: number, expand?: string[]): Promise<MapDto> {
        const include: Prisma.MapInclude = ExpandToPrismaIncludes(
            expand?.filter((x) =>
                ['info', 'credits', 'submitter', 'images', 'thumbnail', 'stats', 'tracks'].includes(x)
            )
        );

        const incPB = expand?.includes('personalBest');
        const incWR = expand?.includes('worldRecord');

        MapsService.handleMapGetIncludes(
            include,
            expand?.includes('inFavorites'),
            expand?.includes('inLibrary'),
            incPB,
            incWR,
            userID
        );

        const dbResponse = await this.mapRepo.get(mapID, include);

        if (!dbResponse) throw new NotFoundException('Map not found');

        if (incPB || incWR) {
            MapsService.handleMapGetPrismaResponse(dbResponse, userID, incPB, incWR);
        }

        return DtoFactory(MapDto, dbResponse);
    }

    async create(mapCreateDto: CreateMapDto, submitterID: number): Promise<number> {
        // Check there's no map with same name
        const existingMaps: number = await this.mapRepo.count({
            name: mapCreateDto.name,
            NOT: {
                statusFlag: {
                    in: [MapStatus.REJECTED, MapStatus.REMOVED]
                }
            }
        });

        if (existingMaps > 0) throw new ConflictException('Map with this name already exists');

        // Limit the number of pending maps a user can have at any one time
        // TODO: Move this out to a config file
        const mapUploadLimit = 5;
        const submittedMaps: number = await this.mapRepo.count({
            submitterID: submitterID,
            statusFlag: {
                in: [MapStatus.PENDING, MapStatus.NEEDS_REVISION]
            }
        });

        if (submittedMaps >= mapUploadLimit)
            throw new ConflictException(`You can't have more than ${mapUploadLimit} maps pending at once`);

        // Extra checks...
        // TODO: There's probs loads of these we could do, and with map submission incoming that's desirable, could be a good task for a new dev.
        const trackNums = mapCreateDto.tracks.map((track) => track.trackNum);
        // Set construction ensures uniqueness, so just compare the lengths
        if (trackNums.length !== new Set(trackNums).size)
            throw new BadRequestException('All map tracks must have unique track numbers');

        // Actually build our input. Prisma doesn't let you do nested createMany (https://github.com/prisma/prisma/issues/5455)
        // so we have to do it in parts... Fortunately this doesn't run often.
        const createInput = {
            submitter: { connect: { id: submitterID } },
            name: mapCreateDto.name,
            type: mapCreateDto.type,
            stats: { create: {} }, // Just init empty entry
            statusFlag: MapStatus.NEEDS_REVISION,
            info: {
                create: {
                    numTracks: mapCreateDto.info.numTracks,
                    description: mapCreateDto.info.description,
                    creationDate: mapCreateDto.info.creationDate,
                    youtubeID: mapCreateDto.info.youtubeID
                }
            },
            credits: {
                createMany: {
                    data: mapCreateDto.credits.map((credit) => {
                        return {
                            type: credit.type,
                            userID: credit.userID
                        };
                    })
                }
            },
            tracks: {
                createMany: {
                    data: mapCreateDto.tracks.map((track): Prisma.MapTrackCreateManyMapInput => {
                        return {
                            isLinear: track.isLinear,
                            numZones: track.numZones,
                            trackNum: track.trackNum,
                            difficulty: track.difficulty
                        };
                    })
                }
            }
        };

        const mapDB: any = await this.mapRepo.create(createInput);

        await Promise.all(
            mapDB.tracks.map(async (track: MapTrack) => {
                const dtoTrack = mapCreateDto.tracks.find((dtoTrack) => dtoTrack.trackNum === track.trackNum);

                await this.mapRepo.updateMapTrack(
                    { id: track.id },
                    { stats: { create: { baseStats: { create: {} } } } }
                ); // Init empty MapTrackStats entry

                await Promise.all(
                    dtoTrack.zones.map(async (zone) => {
                        const zoneDB: any = await this.mapRepo.createMapZone({
                            track: { connect: { id: track.id } },
                            zoneNum: zone.zoneNum,
                            stats: { create: { baseStats: { create: {} } } }
                        });

                        // We could do a `createMany` for the triggers in the above input but we then need to attach a
                        // `MapZoneTriggerProperties` to each using the DTO properties, and I'm not certain the data we
                        // get back from the `createMany` is in the order we inserted. For tracks we use the find w/
                        // `trackNum` above, but `MapZoneTriggerProperties` don't have any distinguishing features like that.
                        // So I'm doing the triggers with looped `create`s so I can include the `MapZoneTriggerProperties`.
                        // Hopefully `MapZoneTriggerProperties` will be removed in 0.10.0 anyway (they're stupid) in which
                        // case we should be able to use a `createMany` for the triggers.
                        await Promise.all(
                            zone.triggers.map(async (trigger) => {
                                await this.mapRepo.createMapZoneTrigger({
                                    zone: { connect: { id: zoneDB.id } },
                                    type: trigger.type,
                                    pointsHeight: trigger.pointsHeight,
                                    pointsZPos: trigger.pointsZPos,
                                    points: trigger.points,
                                    properties: {
                                        create: {
                                            properties: trigger.properties.properties
                                        }
                                    }
                                });
                            })
                        );
                    })
                );
            })
        );

        // Create MAP_UPLOADED activities for each author
        await this.userRepo.createActivities(
            mapDB.credits
                .filter((credit) => credit.type === MapCreditType.AUTHOR)
                .map((credit): Prisma.ActivityCreateManyInput => {
                    return {
                        type: ActivityTypes.MAP_UPLOADED,
                        userID: credit.userID,
                        data: mapDB.id
                    };
                })
        );

        // Return the map ID to the controller so it can set it in the response header
        return mapDB.id;
    }

    //#endregion

    //#region Upload/Download

    async canUploadMap(mapID: number, userID: number): Promise<void> {
        const mapDB = await this.mapRepo.get(mapID);

        MapsService.uploadMapChecks(mapDB, userID);
    }

    async upload(mapID: number, userID: number, mapFileBuffer: Buffer): Promise<MapDto> {
        const mapDB = await this.mapRepo.get(mapID);

        MapsService.uploadMapChecks(mapDB, userID);

        const result = await this.storeMapFile(mapFileBuffer, mapDB);

        const dbResponse = await this.mapRepo.update(mapDB.id, {
            statusFlag: MapStatus.PENDING,
            fileKey: result[0],
            hash: result[1]
        });

        return DtoFactory(MapDto, dbResponse);
    }

    //#endregion

    //#region Credits

    async getCredits(mapID: number, expand: string[]): Promise<MapCreditDto[]> {
        const foundMap = await this.mapRepo.get(mapID);
        if (!foundMap) throw new NotFoundException('Map not found');

        const include: Prisma.MapCreditInclude = ExpandToPrismaIncludes(expand?.filter((x) => ['user'].includes(x)));
        const where: Prisma.MapCreditWhereInput = { mapID: mapID };

        const dbResponse = await this.mapRepo.getCredits(where, include);

        if (dbResponse.length === 0) throw new NotFoundException('No map credits found');

        return dbResponse.map((x) => DtoFactory(MapCreditDto, x));
    }

    async createCredit(mapID: number, createMapCredit: CreateMapCreditDto, userID: number): Promise<MapCreditDto> {
        const map = await this.mapRepo.get(mapID, { credits: true });

        if (!map) throw new NotFoundException('Map not found');

        if (map.submitterID !== userID) throw new ForbiddenException('User is not the submitter of the map');

        if (map.statusFlag !== MapStatus.NEEDS_REVISION)
            throw new ForbiddenException('Map is not in NEEDS_REVISION state');

        const dupeCredit = await this.mapRepo.findCredit({
            mapID: mapID,
            userID: createMapCredit.userID,
            type: createMapCredit.type
        });

        if (dupeCredit) throw new ConflictException('Map credit already exists');

        const existingUser = await this.userRepo.get(createMapCredit.userID);

        if (!existingUser) throw new BadRequestException('Credited user does not exist');

        const newCredit: Prisma.MapCreditCreateInput = {
            type: createMapCredit.type,
            map: { connect: { id: mapID } },
            user: { connect: { id: createMapCredit.userID } }
        };

        const dbResponse = await this.mapRepo.createCredit(newCredit);

        await this.updateActivities(dbResponse);

        return DtoFactory(MapCreditDto, dbResponse);
    }

    async getCredit(mapCreditID: number, expand: string[]): Promise<MapCreditDto> {
        const include: Prisma.MapCreditInclude = ExpandToPrismaIncludes(expand?.filter((x) => ['user'].includes(x)));

        const dbResponse = await this.mapRepo.getCredit(mapCreditID, include);

        if (!dbResponse) throw new NotFoundException('Map credit not found');

        return DtoFactory(MapCreditDto, dbResponse);
    }

    async updateCredit(mapCreditID: number, creditUpdate: UpdateMapCreditDto, userID: number): Promise<void> {
        if (!creditUpdate.userID && !creditUpdate.type) throw new BadRequestException('No update data provided');

        const mapCredit = await this.mapRepo.getCredit(mapCreditID, { user: true });

        if (!mapCredit) throw new NotFoundException('Map credit not found');

        await this.updateCreditChecks(mapCredit, creditUpdate, userID);

        const data: Prisma.MapCreditUpdateInput = {};

        if (creditUpdate.userID) data.user = { connect: { id: creditUpdate.userID } };

        if (creditUpdate.type) data.type = creditUpdate.type;

        const newCredit = await this.mapRepo.updateCredit(mapCreditID, data);

        await this.updateActivities(newCredit, mapCredit);
    }

    async deleteCredit(mapCreditID: number, userID: number): Promise<void> {
        const mapCred = await this.mapRepo.getCredit(mapCreditID, { user: true });
        if (!mapCred) throw new NotFoundException('Map credit not found');

        const mapOfCredit = await this.mapRepo.get(mapCred.mapID);
        if (mapOfCredit.submitterID !== userID) throw new ForbiddenException('User is not the submitter of this map');

        if (mapOfCredit.statusFlag !== MapStatus.NEEDS_REVISION)
            throw new ForbiddenException('Map is not in NEEDS_REVISION state');

        await this.mapRepo.deleteCredit({ id: mapCreditID });

        await this.updateActivities(null, mapCred);
    }

    //#endregion

    //#region Info

    async getInfo(mapID: number): Promise<MapInfoDto> {
        const mapInfo = await this.mapRepo.getInfo(mapID);

        if (!mapInfo) throw new NotFoundException('Map not found');

        return DtoFactory(MapInfoDto, mapInfo);
    }

    async updateInfo(mapID: number, mapInfo: UpdateMapInfoDto, userID: number): Promise<void> {
        if (!mapInfo.description && !mapInfo.youtubeID && !mapInfo.creationDate)
            throw new BadRequestException('Request contains no valid update data');
        const map = await this.mapRepo.get(mapID);
        if (!map) throw new NotFoundException('Map not found');

        if (map.submitterID !== userID) throw new ForbiddenException('User is not the submitter of the map');

        if (map.statusFlag !== MapStatus.NEEDS_REVISION)
            throw new ForbiddenException('Map is not in NEEDS_REVISION state');

        const data: Prisma.MapInfoUpdateInput = {};

        if (mapInfo.description) data.description = mapInfo.description;
        if (mapInfo.youtubeID) data.youtubeID = mapInfo.youtubeID;
        if (mapInfo.creationDate) data.creationDate = new Date(mapInfo.creationDate);

        await this.mapRepo.updateInfo(mapID, data);
    }

    //#endregion

    //#region Zones

    async getZones(mapID: number): Promise<MapTrackDto[]> {
        const map = await this.mapRepo.get(mapID, { stats: true });

        if (!map) throw new NotFoundException('Map not found');

        const include: Prisma.MapTrackInclude = {
            zones: {
                include: {
                    triggers: {
                        include: {
                            properties: true
                        }
                    }
                }
            }
        };

        const tracks = await this.mapRepo.getMapTracks({ mapID: mapID }, include);

        // This is dumb but it's what the old api does
        // \server\src\models\map.js Line 499
        // TODO_POST_REWRITE: When map sessions are done this should be removed

        await this.mapRepo.updateMapStats(mapID, {
            plays: { increment: 1 }
        });

        return tracks.map((x) => DtoFactory(MapTrackDto, x));
    }

    //#endregion

    //#region Private

    private static handleMapGetIncludes(
        include: Prisma.MapInclude,
        fav: boolean,
        lib: boolean,
        PB: boolean,
        WR: boolean,
        userID?: number
    ): void {
        if (fav && userID) include.favorites = { where: { userID: userID } };
        if (lib && userID) include.libraryEntries = { where: { userID: userID } };

        if (PB || WR) {
            include.ranks = { include: { run: true, user: true } };
            if (PB && WR) {
                include.ranks.where = { OR: [{ userID: userID }, { rank: 1 }] };
            } else if (PB) {
                include.ranks.where = { userID: userID };
            } else {
                include.ranks.where = { rank: 1 };
            }
        }
    }

    private static handleMapGetPrismaResponse(mapObj: any, userID: number, PB: boolean, WR: boolean): void {
        if (PB && WR) {
            // Annoying to have to do this but we don't know what's what
            mapObj.worldRecord = mapObj.ranks.find((r) => r.rank === 1);
            mapObj.personalBest = mapObj.ranks.find((r) => r.userID === userID);
        } else if (PB) {
            mapObj.personalBest = mapObj.ranks[0];
        } else {
            mapObj.worldRecord = mapObj.ranks[0];
        }
        delete mapObj.ranks;
    }

    private async storeMapFile(mapFileBuffer: Buffer, mapModel: MapDB): Promise<[fileKey: string, hash: string]> {
        const fileKey = `maps/${mapModel.name}.bsp`;

        const result = await this.fileCloudService.storeFileCloud(mapFileBuffer, fileKey);

        return [result.fileKey, result.hash];
    }

    private static uploadMapChecks(map: MapDB, userID: number): void {
        if (!map) throw new NotFoundException('Map not found');

        if (userID !== map.submitterID) throw new ForbiddenException('You are not the submitter of this map');

        if (map.statusFlag !== MapStatus.NEEDS_REVISION)
            throw new ForbiddenException('Map file cannot be uploaded, the map is not accepting revisions');
    }

    private async updateCreditChecks(mapCred: MapCredit, creditUpdate: UpdateMapCreditDto, userID: number) {
        if (creditUpdate.userID) {
            const userExists = await this.userRepo.get(creditUpdate.userID);
            if (!userExists) throw new BadRequestException('Credited user does not exist');
        }

        const mapOfCredit = await this.mapRepo.get(mapCred.mapID);
        if (mapOfCredit.submitterID !== userID) throw new ForbiddenException('User is not the submitter of this map');

        if (mapOfCredit.statusFlag !== MapStatus.NEEDS_REVISION)
            throw new ForbiddenException('Map is not in NEEDS_REVISION state');

        const checkDupe: Prisma.MapCreditWhereInput = {
            NOT: {
                id: mapCred.id
            },
            userID: creditUpdate.userID ?? mapCred.userID,
            type: creditUpdate.type ?? mapCred.type,
            mapID: mapCred.mapID
        };

        const foundDupe = await this.mapRepo.findCredit(checkDupe);
        if (foundDupe) throw new ConflictException('Cannot have duplicate map credits');
    }

    private async updateActivities(newCredit?: MapCredit, oldCredit?: MapCredit): Promise<void> {
        const deleteOldActivity = () =>
            this.userRepo.deleteActivities({
                type: ActivityTypes.MAP_UPLOADED,
                data: oldCredit.mapID,
                userID: oldCredit.userID
            });

        const createNewActivity = () =>
            this.userRepo.createActivities([
                {
                    type: ActivityTypes.MAP_UPLOADED,
                    data: newCredit.mapID,
                    userID: newCredit.userID
                }
            ]);

        // If oldCredit is null, a credit was created
        if (!oldCredit) {
            if (newCredit?.type === MapCreditType.AUTHOR) await createNewActivity();
            return;
        }

        // If newCredit is null, a credit was deleted
        if (!newCredit) {
            if (oldCredit?.type === MapCreditType.AUTHOR) await deleteOldActivity();
            return;
        }

        const oldCreditIsAuthor = oldCredit.type === MapCreditType.AUTHOR;
        const newCreditIsAuthor = newCredit.type === MapCreditType.AUTHOR;
        const userChanged = oldCredit.userID !== newCredit.userID;

        // If the new credit type was changed to author
        if (!oldCreditIsAuthor && newCreditIsAuthor) {
            // Create activity for newCredit.userID
            await createNewActivity();
            return;
        } else if (oldCreditIsAuthor && !newCreditIsAuthor) {
            // If the new credit type was changed from author to something else
            // Delete activity for oldCredit.userID
            await deleteOldActivity();
            return;
        } else if (oldCreditIsAuthor && newCreditIsAuthor && userChanged) {
            // If the credit is still an author but the user changed
            // Delete activity for oldCredit.userID and create activity for newCredit.userID
            await deleteOldActivity();
            await createNewActivity();
            return;
        } else return; // All other cases result in no change in authors
    }

    //#endregion
}
