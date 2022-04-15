import { HttpException, Injectable, Logger } from '@nestjs/common';
import { Map, User, MapImage, Prisma } from '@prisma/client';
import { MapDto } from '../../@common/dto/map/map.dto';
import { PagedResponseDto } from '../../@common/dto/common/api-response.dto';
import { MapsRepo } from './maps.repo';
import { CreateMapDto } from '../../@common/dto/map/createMap.dto';
import { AuthService } from '../auth/auth.service';
import { appConfig } from 'config/config';
import { EMapStatus } from '../../@common/enums/map.enum';
import { FileStoreCloudService } from '../../@common/filestore/cloud.service';
import { FileStoreLocalService } from '../../@common/filestore/local.service';
import * as fs from 'fs';
import * as crypto from 'crypto';

@Injectable()
export class MapsService {
    constructor(
        private readonly authService: AuthService,
        private readonly mapRepo: MapsRepo,
        private readonly fileLocalService: FileStoreLocalService,
        private readonly fileCloudService: FileStoreCloudService
    ) {}

    //#region Public

    public async GetAll(skip?: number, take?: number): Promise<PagedResponseDto<MapDto[]>> {
        const dbResponse = await this.mapRepo.GetAll(undefined, skip, take);

        const totalCount = dbResponse[1];
        const maps = dbResponse[0];

        const mapsDtos = maps.map((ctx) => {
            const map: Map = (ctx as any).map;
            const user: User = (ctx as any).user;
            const mapImages: MapImage[] = (ctx as any).images;

            const mapDto = new MapDto(map, user, mapImages);

            return mapDto;
        });

        return {
            totalCount: totalCount,
            returnCount: mapsDtos.length,
            response: mapsDtos
        };
    }

    public async Get(id: number): Promise<MapDto> {
        const dbResponse = await this.mapRepo.Get(id);

        const map: Map = (dbResponse as any).map;
        const user: User = (dbResponse as any).user;
        const mapImages: MapImage[] = (dbResponse as any).images;

        const mapDto = new MapDto(map, user, mapImages);

        return mapDto;
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
        const createPrisma: Prisma.MapCreateInput = {
            users: {
                connect: {
                    id: this.authService.loggedInUser.id
                }
            },
            name: mapCreateObj.name,
            type: mapCreateObj.type,
            mapinfos: {
                create: {
                    numTracks: mapCreateObj.info.numTracks,
                    description: mapCreateObj.info.description,
                    creationDate: mapCreateObj.info.creationDate,
                    youtubeID: mapCreateObj.info.youtubeID,
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            },
            maptracks: {
                createMany: {
                    data: mapCreateObj.tracks.map((track) => {
                        return {
                            isLinear: track.isLinear,
                            numZones: track.numZones,
                            trackNum: track.trackNum,
                            difficulty: track.difficulty,
                            createdAt: new Date(),
                            updatedAt: new Date()
                        };
                    })
                }
            },
            mapcredits: {
                createMany: {
                    data: mapCreateObj.credits.map((credit) => {
                        return {
                            type: credit.type,
                            userID: credit.userID,
                            createdAt: new Date(),
                            updatedAt: new Date()
                        };
                    })
                }
            },
            createdAt: new Date(),
            updatedAt: new Date()
        };
        const dbResponse = await this.mapRepo.Insert(createPrisma);

        const map: Map = (dbResponse as any).map;
        const user: User = (dbResponse as any).user;
        const mapImages: MapImage[] = (dbResponse as any).images;

        const mapDto = new MapDto(map, user, mapImages);

        return mapDto;
    }

    public async Upload(mapID: number, mapFileBuffer: Buffer): Promise<MapDto> {
        let mapDto: MapDto = new MapDto(await this.mapRepo.Get(mapID));

        if (!mapDto.id) {
            return Promise.reject(new HttpException('Map not found', 404));
        }

        if (mapDto.statusFlag !== EMapStatus.NEEDS_REVISION) {
            return Promise.reject(new HttpException('Map file cannot be uploaded given the map state', 409));
        }

        const result = await this.storeMapFile(mapFileBuffer, mapDto);

        mapDto = new MapDto(
            await this.mapRepo.Update(mapDto.id, {
                statusFlag: EMapStatus.PENDING,
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
                statusFlag: EMapStatus.REJECTED,
                OR: {
                    statusFlag: EMapStatus.REMOVED
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
            statusFlag: EMapStatus.PENDING
        };

        const whereResult = await this.mapRepo.GetAll(where);

        if (whereResult[1] >= mapUploadLimit) {
            return Promise.reject(new HttpException('Map creation limit reached', 409));
        }

        Promise.resolve();
    }

    private storeMapFile(mapFileBuffer, mapModel) {
        const fileName = `maps/${mapModel.name}.bsp`;
        if (appConfig.storage.useLocal) {
            return this.fileLocalService.storeMapFileLocal(mapFileBuffer, fileName);
        }

        return this.fileCloudService.storeFileCloud(mapFileBuffer, fileName);
    }

    //#endregion
}
