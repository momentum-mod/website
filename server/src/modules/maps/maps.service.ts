import {
    BadGatewayException,
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException,
    StreamableFile
} from '@nestjs/common';
import { Map as MapDB, MapCredit, MapTrack, Prisma, UserMapRank } from '@prisma/client';
import { CreateMapDto, MapDto, UpdateMapDto } from '@common/dto/map/map.dto';
import { UserMapRankDto } from '@common/dto/run/user-map-rank.dto';
import { PaginatedResponseDto } from '@common/dto/paginated-response.dto';
import { MapsRepoService } from '../repo/maps-repo.service';
import { MapCreditType, MapStatus } from '@common/enums/map.enum';
import { FileStoreCloudService } from '../filestore/file-store-cloud.service';
import { DtoFactory, ExpandToPrismaIncludes } from '@lib/dto.lib';
import { UsersRepoService } from '../repo/users-repo.service';
import { ActivityTypes } from '@common/enums/activity.enum';
import { CreateMapCreditDto, MapCreditDto, UpdateMapCreditDto } from '@common/dto/map/map-credit.dto';
import { MapInfoDto, UpdateMapInfoDto } from '@common/dto/map/map-info.dto';
import { MapTrackDto } from '@common/dto/map/map-track.dto';
import {
    AdminCtlMapsGetAllQuery,
    MapsCtlGetAllQuery,
    MapRanksGetQuery,
    MapRankGetNumberQuery
} from '@common/dto/query/map-queries.dto';
import { UsersService } from '../users/users.service';
import { MapImageDto } from '@common/dto/map/map-image.dto';
import { FileStoreCloudFile } from '../filestore/file-store.interfaces';
import { ConfigService } from '@nestjs/config';
import sharp from 'sharp';
import { RunsService } from '../runs/runs.service';

const MAP_IMAGE_UPLOAD_LIMIT = 5; // TODO: Move this to a separate config file

@Injectable()
export class MapsService {
    constructor(
        private readonly mapRepo: MapsRepoService,
        private readonly userRepo: UsersRepoService,
        private readonly fileCloudService: FileStoreCloudService,
        private readonly config: ConfigService,
        private readonly runsService: RunsService,
        private readonly usersService: UsersService
    ) {}

    //#region Maps

    async getAll(
        userID: number,
        query: MapsCtlGetAllQuery | AdminCtlMapsGetAllQuery
    ): Promise<PaginatedResponseDto<MapDto>> {
        // Old API has some stuff for "status" and "statusNot" and "priority" but isn't in docs or validations or
        // used anywhere in client/game, leaving for now.

        // Where
        const where: Prisma.MapWhereInput = {};
        if (query.search) where.name = { contains: query.search };
        if (query.submitterID) where.submitterID = query.submitterID;
        if (query instanceof MapsCtlGetAllQuery) {
            if (query.type) where.type = query.type;

            if (query.difficultyHigh && query.difficultyLow)
                where.mainTrack = { is: { difficulty: { lt: query.difficultyHigh, gt: query.difficultyLow } } };
            else if (query.difficultyLow) where.mainTrack = { is: { difficulty: { gt: query.difficultyLow } } };
            else if (query.difficultyHigh) where.mainTrack = { is: { difficulty: { lt: query.difficultyHigh } } };

            // If we have difficulty filters we have to construct quite a complicated filter...
            if (typeof query.isLinear === 'boolean')
                where.mainTrack = where.mainTrack
                    ? { is: { ...where.mainTrack.is, isLinear: query.isLinear } }
                    : { isLinear: query.isLinear };
        }
        if (query instanceof AdminCtlMapsGetAllQuery && query.status) where.statusFlag = query.status;
        // query.priority ignored

        // Include
        const include: Prisma.MapInclude = {
            mainTrack: true,
            info: true,
            ...ExpandToPrismaIncludes(query.expand?.filter((x) => ['credits', 'thumbnail', 'submitter'].includes(x)))
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
            for (const map of dbResponse[0]) MapsService.handleMapGetPrismaResponse(map, userID, incPB, incWR);
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

    async update(mapID: number, userID: number, updateBody: UpdateMapDto, isAdmin = false): Promise<void> {
        const map = await this.mapRepo.get(mapID);

        if (!map) throw new NotFoundException('No map found');
        if (map.submitterID !== userID && !isAdmin)
            throw new ForbiddenException('User is not the submitter of the map');
        if ([MapStatus.REJECTED, MapStatus.REMOVED].includes(map.statusFlag))
            throw new BadRequestException('Map status forbids updating');

        const previousStatus = map.statusFlag;

        const updatedMap = await this.mapRepo.update(mapID, {
            statusFlag: updateBody.statusFlag
        });

        if (
            updatedMap.statusFlag !== previousStatus &&
            previousStatus === MapStatus.PENDING &&
            updatedMap.statusFlag === MapStatus.APPROVED
        ) {
            // status changed and map went from PENDING -> APPROVED

            const allCredits = await this.mapRepo.getCredits({ mapID: mapID, type: MapCreditType.AUTHOR });

            return this.userRepo.createActivities(
                allCredits.map((credit): Prisma.ActivityCreateManyInput => {
                    return {
                        type: ActivityTypes.MAP_APPROVED,
                        userID: credit.userID,
                        data: mapID
                    };
                })
            );
        }
    }

    async delete(mapID: number): Promise<void> {
        const map = await this.mapRepo.get(mapID);
        if (!map) throw new NotFoundException('No map found');

        // Delete all stored map images
        const images = await this.mapRepo.getImages({ mapID: mapID });
        await Promise.all(images.map((img) => this.deleteStoredMapImage(img.id)));

        // Delete all run files
        await this.runsService.deleteStoredMapRuns(mapID);

        // Delete stored map file
        await this.fileCloudService.deleteFileCloud(map.fileKey);

        await this.mapRepo.delete(mapID);
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

    async download(mapID: number): Promise<StreamableFile> {
        const map = await this.mapRepo.get(mapID);

        if (!map) throw new NotFoundException('Map not found');

        const mapDataStream = await this.getMapFileFromStore(map.name);

        if (!mapDataStream) throw new NotFoundException(`Couldn't find BSP file for ${map.name}.bsp`);

        await this.mapRepo.updateMapStats(mapID, {
            downloads: { increment: 1 }
        });

        return mapDataStream;
    }

    private getMapFileFromStore(mapName: string): Promise<StreamableFile> {
        const fileName = `maps/${mapName}.bsp`;

        return this.fileCloudService.getFileCloud(fileName);
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

        await this.updateMapCreditActivities(dbResponse);

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

        await this.updateMapCreditActivities(newCredit, mapCredit);
    }

    async deleteCredit(mapCreditID: number, userID: number): Promise<void> {
        const mapCred = await this.mapRepo.getCredit(mapCreditID, { user: true });
        if (!mapCred) throw new NotFoundException('Map credit not found');

        const mapOfCredit = await this.mapRepo.get(mapCred.mapID);
        if (mapOfCredit.submitterID !== userID) throw new ForbiddenException('User is not the submitter of this map');

        if (mapOfCredit.statusFlag !== MapStatus.NEEDS_REVISION)
            throw new ForbiddenException('Map is not in NEEDS_REVISION state');

        await this.mapRepo.deleteCredit({ id: mapCreditID });

        await this.updateMapCreditActivities(null, mapCred);
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

    //#region Map Images

    async getImages(mapID: number): Promise<MapImageDto[]> {
        const map = await this.mapRepo.get(mapID);

        if (!map) throw new NotFoundException('Map not found');

        const images = await this.mapRepo.getImages({ mapID: mapID });

        return images.map((x) => DtoFactory(MapImageDto, x));
    }

    async getImage(imgID: number): Promise<MapImageDto> {
        const mapImg = await this.mapRepo.getImage(imgID);
        if (!mapImg) throw new NotFoundException('Map image not found');
        return DtoFactory(MapImageDto, mapImg);
    }

    async createImage(userID: number, mapID: number, imgBuffer: Buffer): Promise<MapImageDto> {
        const map = await this.mapRepo.get(mapID);

        if (!map) throw new NotFoundException('Map not found');

        if (map.submitterID !== userID) throw new ForbiddenException('User is not the submitter of the map');

        if (map.statusFlag !== MapStatus.NEEDS_REVISION)
            throw new ForbiddenException('Map is not in NEEDS_REVISION state');

        const images = await this.mapRepo.getImages({ mapID: mapID });
        let imageCount = images.length;
        if (map.thumbnailID) imageCount--; // Don't count the thumbnail towards this limit
        if (imageCount >= MAP_IMAGE_UPLOAD_LIMIT) throw new ConflictException('Map image file limit reached');

        const newImage = await this.mapRepo.createImage(mapID);

        const uploadedImages = await this.storeMapImage(imgBuffer, newImage.id);

        if (!uploadedImages) {
            await this.mapRepo.deleteImage({ id: newImage.id });
            throw new BadGatewayException('Error uploading image to cdn');
        }

        return DtoFactory(MapImageDto, newImage);
    }

    async updateImage(userID: number, imgID: number, imgBuffer: Buffer): Promise<void> {
        const image = await this.mapRepo.getImage(imgID);

        if (!image) throw new NotFoundException('Image not found');

        const map = await this.mapRepo.get(image.mapID);

        if (map.submitterID !== userID) throw new ForbiddenException('User is not the submitter of the map');

        if (map.statusFlag !== MapStatus.NEEDS_REVISION)
            throw new ForbiddenException('Map is not in NEEDS_REVISION state');

        const uploadedImages = await this.storeMapImage(imgBuffer, imgID);

        if (!uploadedImages) throw new BadGatewayException('Failed to upload image to CDN');
    }

    async deleteImage(userID: number, imgID: number): Promise<void> {
        const image = await this.mapRepo.getImage(imgID);

        if (!image) throw new NotFoundException('Image not found');

        const map = await this.mapRepo.get(image.mapID);

        if (map.submitterID !== userID) throw new ForbiddenException('User is not the submitter of the map');

        if (map.statusFlag !== MapStatus.NEEDS_REVISION)
            throw new ForbiddenException('Map is not in NEEDS_REVISION state');

        await Promise.all([this.deleteStoredMapImage(imgID), this.mapRepo.deleteImage({ id: imgID })]);
    }

    async editSaveMapImageFile(
        imgBuffer: Buffer,
        fileName: string,
        width: number,
        height: number
    ): Promise<FileStoreCloudFile> {
        try {
            return this.fileCloudService.storeFileCloud(
                await sharp(imgBuffer).resize(width, height, { fit: 'inside' }).jpeg({ mozjpeg: true }).toBuffer(),
                fileName
            );
        } catch {
            // This looks bad, but sharp is very non-specific about its errors
            throw new BadRequestException('Invalid image file');
        }
    }

    storeMapImage(imgBuffer: Buffer, imgID: number): Promise<FileStoreCloudFile[]> {
        return Promise.all([
            this.editSaveMapImageFile(imgBuffer, `img/${imgID}-small.jpg`, 480, 360),
            this.editSaveMapImageFile(imgBuffer, `img/${imgID}-medium.jpg`, 1280, 720),
            this.editSaveMapImageFile(imgBuffer, `img/${imgID}-large.jpg`, 1920, 1080)
        ]);
    }

    async deleteStoredMapImage(imgID: number): Promise<void> {
        await Promise.all([
            this.fileCloudService.deleteFileCloud(`img/${imgID}-small.jpg`),
            this.fileCloudService.deleteFileCloud(`img/${imgID}-medium.jpg`),
            this.fileCloudService.deleteFileCloud(`img/${imgID}-large.jpg`)
        ]);
    }

    //#endregion

    //#region Map Thumbnail

    async updateThumbnail(userID: number, mapID: number, imgBuffer: Buffer): Promise<void> {
        let map = await this.mapRepo.get(mapID, { thumbnail: true });

        if (!map) throw new NotFoundException('Map not found');
        if (map.submitterID !== userID) throw new ForbiddenException('User is not the submitter of the map');
        if (map.statusFlag !== MapStatus.NEEDS_REVISION)
            throw new ForbiddenException('Map is not in NEEDS_REVISION state');

        if (!map.thumbnailID) {
            const newThumbnail = await this.mapRepo.createImage(mapID);
            map = await this.mapRepo.update(mapID, { thumbnail: { connect: { id: newThumbnail.id } } });
        }

        const thumbnail = await this.mapRepo.getImage(map.thumbnailID);

        const uploadedImages = await this.storeMapImage(imgBuffer, thumbnail.id);
        if (!uploadedImages) {
            // If the images failed to upload, we want to delete the map image object
            // if there was no previous thumbnail
            await this.mapRepo.deleteImage({ id: thumbnail.id });
            throw new BadGatewayException('Failed to upload image to CDN');
        }
    }
    //#endregion

    //#region Map Zones

    async getZones(mapID: number): Promise<MapTrackDto[]> {
        const tracks = await this.mapRepo.getMapTracks(
            { mapID: mapID },
            { zones: { include: { triggers: { include: { properties: true } } } } }
        );

        if (!tracks || tracks.length === 0) throw new NotFoundException('Map not found');

        // This is dumb but it's what the old api does
        // \server\src\models\map.js Line 499
        // TODO_POST_REWRITE: When map sessions are done this should be removed

        await this.mapRepo.updateMapStats(mapID, {
            plays: { increment: 1 }
        });

        return tracks.map((x) => DtoFactory(MapTrackDto, x));
    }

    //#endregion

    async getRanks(mapID: number, query: MapRanksGetQuery): Promise<PaginatedResponseDto<UserMapRankDto>> {
        const map = await this.mapRepo.get(mapID);

        if (!map) throw new NotFoundException('Map not found');

        const where: Prisma.UserMapRankWhereInput = {
            mapID: mapID,
            flags: query.flags
        };

        if (query.playerID) where.userID = query.playerID;
        if (query.playerIDs) where.userID = { in: query.playerIDs };

        const include = { run: true, user: true };

        const order: Prisma.UserMapRankOrderByWithAggregationInput = {};
        if (query.orderByDate !== undefined) order.createdAt = query.orderByDate ? 'desc' : 'asc';
        else order.rank = 'asc';

        const dbResponse = await this.mapRepo.getRanks(where, include, order, query.skip, query.take);

        if (!dbResponse) throw new NotFoundException('No ranks found for map');

        this.formatRanksDbResponse(dbResponse[0]);

        return new PaginatedResponseDto(UserMapRankDto, dbResponse);
    }

    async getRankNumber(mapID: number, rankNumber: number, query: MapRankGetNumberQuery): Promise<UserMapRankDto> {
        const map = await this.mapRepo.get(mapID);

        if (!map) throw new NotFoundException('Map not found');

        const where: Prisma.UserMapRankWhereInput = {
            mapID: mapID,
            rank: rankNumber,
            flags: 0,
            run: {
                trackNum: 0,
                zoneNum: 0
            }
        };

        if (query.flags) where.flags = query.flags;
        if (query.trackNum) where.run.trackNum = query.trackNum;
        if (query.zoneNum) where.run.zoneNum = query.zoneNum;

        const include = { run: true, user: true };

        const dbResponse = (await this.mapRepo.getRank(where, include)) as any;

        if (!dbResponse) throw new NotFoundException('Rank not found');

        // Same approach as formatRanksDbResponse
        dbResponse.trackNum = (dbResponse as any).run.trackNum;
        dbResponse.zoneNum = (dbResponse as any).run.zoneNum;

        return DtoFactory(UserMapRankDto, dbResponse);
    }

    async getRankAround(userID: number, mapID: number, query: MapRankGetNumberQuery): Promise<UserMapRankDto[]> {
        const where: Prisma.UserMapRankWhereInput = {
            mapID: mapID,
            flags: 0,
            userID: userID,
            run: {
                trackNum: 0,
                zoneNum: 0
            }
        };

        if (query.flags) where.flags = query.flags;
        if (query.trackNum) where.run.trackNum = query.trackNum;
        if (query.zoneNum) where.run.zoneNum = query.zoneNum;

        const include = { run: true, user: true };

        const order: Prisma.UserMapRankOrderByWithAggregationInput = { rank: 'asc' };

        const userRankInfo = await this.mapRepo.getRank(where, include);

        if (!userRankInfo) throw new NotFoundException('No personal best found');

        const userRank = userRankInfo.rank;

        // Reuse the previous query
        where.userID = undefined;

        // Don't care about the count
        const [ranks] = await this.mapRepo.getRanks(
            where,
            include,
            order,
            // Minus 6 here because MySQL uses offset as a "skip the first X"
            // Example: if you want to offset to rank 9, you set offset to 8
            Math.max(userRank - 6, 0),
            11 // 5 + yours + 5
        );

        this.formatRanksDbResponse(ranks);

        return ranks.map((umr) => DtoFactory(UserMapRankDto, umr));
    }

    async getRankFriends(steamID: string, mapID: number, query: MapRankGetNumberQuery): Promise<UserMapRankDto[]> {
        const steamFriends = await this.usersService.getSteamFriends(steamID);
        const friendSteamIDs = steamFriends.map((item) => item.steamid);

        const map = await this.mapRepo.get(mapID);

        if (!map) throw new NotFoundException('Map not found');
        const where: Prisma.UserMapRankWhereInput = {
            mapID: mapID,
            flags: 0,
            user: {
                steamID: {
                    in: friendSteamIDs
                }
            },
            run: {
                trackNum: 0,
                zoneNum: 0
            }
        };

        if (query.flags) where.flags = query.flags;
        if (query.trackNum) where.run.trackNum = query.trackNum;
        if (query.zoneNum) where.run.zoneNum = query.zoneNum;

        const include = { run: true, user: true };

        // Don't care about the count
        const [ranks] = await this.mapRepo.getRanks(where, include);

        this.formatRanksDbResponse(ranks);

        return ranks.map((umr) => DtoFactory(UserMapRankDto, umr));
    }

    // This is done because the MapRankDto still contains trackNum and zoneNum to conform to old API
    // but UserMapRank doesn't. Probably worth changing frontend/game code in future.
    private formatRanksDbResponse(ranks: (UserMapRank & { trackNum?: any; zoneNum?: any })[]) {
        for (const mapRank of ranks) {
            mapRank.trackNum = (mapRank as any).run.trackNum;
            mapRank.zoneNum = (mapRank as any).run.zoneNum;
        }
    }

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

    private async updateMapCreditActivities(newCredit?: MapCredit, oldCredit?: MapCredit): Promise<void> {
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
