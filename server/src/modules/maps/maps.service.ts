import { HttpException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CreateMapDto, MapDto } from '../../@common/dto/map/map.dto';
import { PaginatedResponseDto } from '../../@common/dto/paginated-response.dto';
import { MapsRepoService } from '../repo/maps-repo.service';
import { AuthService } from '../auth/auth.service';
import { MapStatus, MapType } from '../../@common/enums/map.enum';
import { FileStoreCloudService } from '../filestore/file-store-cloud.service';
import { DtoFactory, ExpandToPrismaIncludes } from '../../@common/utils/dto.utility';

@Injectable()
export class MapsService {
    constructor(
        private readonly authService: AuthService,
        private readonly mapRepo: MapsRepoService,
        private readonly fileCloudService: FileStoreCloudService
    ) {}

    //#region Public

    public async GetAll(
        userID: number,
        skip: number,
        take: number,
        expand?: string[],
        search?: string,
        submitterID?: number,
        type?: MapType,
        difficultyLow?: number,
        difficultyHigh?: number,
        isLinear?: boolean
    ): Promise<PaginatedResponseDto<MapDto>> {
        // Old API has some stuff for "status" and "statusNot" and "priority" but isn't in docs or validations or
        // used anywhere in client/game, leaving for now.

        // Where
        const where: Prisma.MapWhereInput = {};

        if (search) where.name = { startsWith: search };
        if (submitterID) where.submitterID = submitterID;
        if (type) where.type = type;

        // Include
        const include: Prisma.MapInclude = {
            // TODO: old api does `as: "mainTrack"`??
            tracks: { where: { trackNum: 0 } },
            info: true,
            ...ExpandToPrismaIncludes(expand?.filter((x) => ['credits', 'thumbnail'].includes(x)))
        };

        if (expand?.includes('inFavorites')) include.favorites = { where: { userID: userID } };
        if (expand?.includes('inLibrary')) include.libraryEntries = { where: { userID: userID } };

        const incPB = expand?.includes('personalBest');
        const incWR = expand?.includes('worldRecord');
        if (incPB || incWR) {
            include.ranks = { include: { run: true, user: true } };
            if (incPB && incWR) {
                include.ranks.where = { OR: [{ userID: userID }, { rank: 1 }] };
            } else if (incPB) {
                include.ranks.where = { userID: userID };
            } else {
                include.ranks.where = { rank: 1 };
            }
        }

        // Order
        const order: Prisma.MapOrderByWithRelationInput = { createdAt: 'desc' };

        const dbResponse = await this.mapRepo.GetAll(where, include, order, skip, take);

        if (incPB || incWR) {
            dbResponse[0].forEach((mapObj: any) => {
                if (incPB && incWR) {
                    mapObj.worldRecord = mapObj.ranks.find((r) => r.rank === 1);
                    mapObj.personalBest = mapObj.ranks.find((r) => r.userID === userID);
                } else if (incPB) {
                    mapObj.personalBest = mapObj.ranks[0];
                } else {
                    mapObj.worldRecord = mapObj.ranks[0];
                }
                delete mapObj.ranks;
            });
        }

        console.log('dbreponse', JSON.stringify(dbResponse));
        return new PaginatedResponseDto(MapDto, dbResponse);
    }

    public async Get(id: number): Promise<MapDto> {
        const dbResponse = await this.mapRepo.Get(id);

        return DtoFactory(MapDto, dbResponse);
    }

    public async Insert(mapCreateObj: CreateMapDto): Promise<MapDto> {
        try {
            // validate map name
            await this.verifyMapNameNotTaken(mapCreateObj.name);
            // Validate map upload limit
            await this.verifyMapUploadLimitNotReached(this.authService.loggedInUser.id);
        } catch {
            return;
        }

        // create
        // const createPrisma: Prisma.MapCreateInput = {
        //     submitter: {
        //         connect: {
        //             id: this.authService.loggedInUser.id
        //         }
        //     },
        //     name: mapCreateObj.name,
        //     type: mapCreateObj.type,
        //     info: {
        //         create: {
        //             numTracks: mapCreateObj.info.numTracks,
        //             description: mapCreateObj.info.description,
        //             creationDate: mapCreateObj.info.creationDate,
        //             youtubeID: mapCreateObj.info.youtubeID
        //         }
        //     },
        //     tracks: {
        //         createMany: {
        //             data: mapCreateObj.tracks.map((track) => {
        //                 return {
        //                     isLinear: track.isLinear,
        //                     numZones: track.numZones,
        //                     trackNum: track.trackNum,
        //                     difficulty: track.difficulty
        //                 };
        //             })
        //         }
        //     },
        //     credits: {
        //         createMany: {
        //             data: mapCreateObj.credits.map((credit) => {
        //                 return {
        //                     type: credit.type,
        //                     userID: credit.userID,
        //                     createdAt: new Date(),
        //                     updatedAt: new Date()
        //                 };
        //             })
        //         }
        //     }
        // };

        // const dbResponse = await this.mapRepo.Insert(createPrisma);

        // return DtoFactory(MapDto, dbResponse);
    }

    public async Upload(mapID: number, mapFileBuffer: Buffer): Promise<MapDto> {
        let mapDto: MapDto = DtoFactory(MapDto, await this.mapRepo.Get(mapID));

        if (!mapDto.id) {
            return Promise.reject(new HttpException('Map not found', 404));
        }

        if (mapDto.statusFlag !== MapStatus.NEEDS_REVISION) {
            return Promise.reject(new HttpException('Map file cannot be uploaded given the map state', 409));
        }

        const result = await this.storeMapFile(mapFileBuffer, mapDto);

        mapDto = DtoFactory(
            MapDto,
            await this.mapRepo.Update(mapDto.id, {
                statusFlag: MapStatus.PENDING,
                downloadURL: result.downloadURL,
                hash: result.hash
            })
        );

        return mapDto;
    }

    //#endregion

    //#region Private
    private async verifyMapNameNotTaken(mapName) {
        const where: Prisma.MapWhereInput = {
            name: mapName,
            NOT: {
                statusFlag: MapStatus.REJECTED,
                OR: {
                    statusFlag: MapStatus.REMOVED
                }
            }
        };

        const whereResult = await this.mapRepo.GetAll(where);

        if (whereResult[1] > 0) {
            return Promise.reject(new HttpException('Map name already used', 409));
        }

        Promise.resolve();
    }

    private async verifyMapUploadLimitNotReached(submitterID) {
        const mapUploadLimit = 5;

        const where: Prisma.MapWhereInput = {
            submitterID: submitterID,
            statusFlag: MapStatus.PENDING
        };

        const whereResult = await this.mapRepo.GetAll(where);

        if (whereResult[1] >= mapUploadLimit) {
            return Promise.reject(new HttpException('Map creation limit reached', 409));
        }

        Promise.resolve();
    }

    private storeMapFile(mapFileBuffer, mapModel) {
        const fileName = `maps/${mapModel.name}.bsp`;
        return this.fileCloudService.storeFileCloud(mapFileBuffer, fileName);
    }

    //#endregion
}
