import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  StreamableFile
} from '@nestjs/common';
import {
  MMap,
  MapTrack,
  MapZone,
  MapZoneTrigger,
  MapZoneTriggerProperties,
  Prisma
} from '@prisma/client';
import { FileStoreCloudService } from '../filestore/file-store-cloud.service';
import { ConfigService } from '@nestjs/config';
import { RunsService } from '../runs/runs.service';
import {
  AdminCtlMapsGetAllQueryDto,
  CreateMapDto,
  DtoFactory,
  expandToPrismaIncludes,
  MapDto,
  MapInfoDto,
  MapsCtlGetAllQueryDto,
  MapTrackDto,
  PagedResponseDto,
  UpdateMapDto,
  UpdateMapInfoDto
} from '@momentum/backend/dto';
import { ActivityType, MapCreditType, MapStatus } from '@momentum/constants';
import { isEmpty } from 'lodash';
import { MapImageService } from './map-image.service';
import { EXTENDED_PRISMA_SERVICE } from '../database/db.constants';
import { ExtendedPrismaService } from '../database/prisma.extension';

@Injectable()
export class MapsService {
  constructor(
    @Inject(EXTENDED_PRISMA_SERVICE) private readonly db: ExtendedPrismaService,
    private readonly fileCloudService: FileStoreCloudService,
    private readonly config: ConfigService,
    private readonly runsService: RunsService,
    private readonly mapImageService: MapImageService
  ) {}

  //#region Maps

  async getAll(
    userID: number,
    query: MapsCtlGetAllQueryDto | AdminCtlMapsGetAllQueryDto
  ): Promise<PagedResponseDto<MapDto>> {
    // Old API has some stuff for "status" and "statusNot" and "priority" but
    // isn't in docs or validations or used anywhere in client/game, leaving for
    // now.

    // Where
    const where: Prisma.MMapWhereInput = {};
    if (query.search) where.name = { contains: query.search };
    if (query.submitterID) where.submitterID = query.submitterID;
    if (query instanceof MapsCtlGetAllQueryDto) {
      if (query.type) where.type = query.type;

      if (query.difficultyHigh && query.difficultyLow)
        where.mainTrack = {
          is: {
            difficulty: { lt: query.difficultyHigh, gt: query.difficultyLow }
          }
        };
      else if (query.difficultyLow)
        where.mainTrack = { is: { difficulty: { gt: query.difficultyLow } } };
      else if (query.difficultyHigh)
        where.mainTrack = { is: { difficulty: { lt: query.difficultyHigh } } };

      // If we have difficulty filters we have to construct quite a complicated
      // filter...
      if (typeof query.isLinear === 'boolean')
        where.mainTrack = where.mainTrack
          ? { is: { ...where.mainTrack.is, isLinear: query.isLinear } }
          : { isLinear: query.isLinear };
    }
    if (query instanceof AdminCtlMapsGetAllQueryDto && query.status)
      where.status = query.status;
    // query.priority ignored

    // Include
    const include: Prisma.MMapInclude = {
      mainTrack: true,
      info: true,
      ...expandToPrismaIncludes(
        query.expand?.filter((x) =>
          [
            'credits',
            'thumbnail',
            'submitter',
            'stats',
            'images',
            'tracks',
            'info'
          ].includes(x)
        )
      )
    };

    if (query.expand?.includes('credits'))
      include.credits = { include: { user: true } };

    const incPB = query.expand?.includes('personalBest');
    const incWR = query.expand?.includes('worldRecord');

    this.handleMapGetIncludes(
      include,
      query.expand?.includes('inFavorites'),
      query.expand?.includes('inLibrary'),
      incPB,
      incWR,
      userID
    );

    const dbResponse = await this.db.mMap.findManyAndCount({
      where,
      include,
      orderBy: { createdAt: 'desc' },
      skip: query.skip,
      take: query.take
    });

    if (incPB || incWR) {
      for (const map of dbResponse[0])
        this.handleMapGetPrismaResponse(map, userID, incPB, incWR);
    }

    return new PagedResponseDto(MapDto, dbResponse);
  }

  async get(
    mapID: number,
    userID?: number,
    expand?: string[]
  ): Promise<MapDto> {
    const include: Prisma.MMapInclude =
      expandToPrismaIncludes(
        expand?.filter((x) =>
          ['info', 'submitter', 'images', 'thumbnail', 'stats'].includes(x)
        )
      ) ?? {};

    if (expand?.includes('tracks'))
      include.tracks = {
        include: {
          zones: { include: { triggers: { include: { properties: true } } } }
        }
      };

    if (expand?.includes('credits'))
      include.credits = { include: { user: true } };

    const incPB = expand?.includes('personalBest');
    const incWR = expand?.includes('worldRecord');

    this.handleMapGetIncludes(
      include,
      expand?.includes('inFavorites'),
      expand?.includes('inLibrary'),
      incPB,
      incWR,
      userID
    );

    const dbResponse = await this.db.mMap.findFirst({
      where: { id: mapID },
      include: isEmpty(include) ? undefined : include
    });

    if (!dbResponse) throw new NotFoundException('Map not found');

    // We'll delete this stupid shit soon
    if (expand?.includes('tracks'))
      for (const track of dbResponse.tracks as (MapTrack & {
        zones: (MapZone & {
          triggers: MapZoneTrigger &
            {
              properties: MapZoneTriggerProperties;
              zoneProps: MapZoneTriggerProperties;
            }[];
        })[];
      })[])
        for (const zone of track.zones)
          for (const trigger of zone.triggers) {
            trigger.zoneProps = structuredClone(trigger.properties);
            delete trigger.properties;
          }

    if (incPB || incWR) {
      this.handleMapGetPrismaResponse(dbResponse, userID, incPB, incWR);
    }

    return DtoFactory(MapDto, dbResponse);
  }

  private handleMapGetIncludes(
    include: Prisma.MMapInclude,
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

  private handleMapGetPrismaResponse(
    mapObj: any,
    userID: number,
    PB: boolean,
    WR: boolean
  ): void {
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

  async create(
    mapCreateDto: CreateMapDto,
    submitterID: number
  ): Promise<MapDto> {
    // Check there's no map with same name
    const mapExists = await this.db.mMap.exists({
      where: {
        fileName: mapCreateDto.fileName,
        NOT: { status: { in: [MapStatus.REJECTED, MapStatus.REMOVED] } }
      }
    });

    if (mapExists)
      throw new ConflictException('Map with this name already exists');

    // Limit the number of pending maps a user can have at any one time
    const pendingMapLimit = this.config.get('limits.pendingMaps');
    const submittedMaps: number = await this.db.mMap.count({
      where: {
        submitterID: submitterID,
        status: { in: [MapStatus.PENDING, MapStatus.NEEDS_REVISION] }
      }
    });

    if (submittedMaps >= pendingMapLimit)
      throw new ConflictException(
        `You can't have more than ${pendingMapLimit} maps pending at once`
      );

    // Extra checks...
    //// Note: We should add further checks here when working on map submission.
    //// Though need to decide if we're going to do
    //// any BSP parsing on this API, or have mods check using Lumper.
    const trackNums = mapCreateDto.tracks.map((track) => track.trackNum);
    // Set construction ensures uniqueness, so just compare the lengths
    if (trackNums.length !== new Set(trackNums).size)
      throw new BadRequestException(
        'All map tracks must have unique track numbers'
      );

    // Actually build our input. Prisma doesn't let you do nested createMany
    // (https://github.com/prisma/prisma/issues/5455)
    // so we have to do it in parts... Fortunately this doesn't run often.
    const createInput: Prisma.MMapCreateInput & {
      info: NonNullable<Prisma.MMapCreateInput['info']>;
      tracks: NonNullable<Prisma.MMapCreateInput['tracks']>;
    } = {
      submitter: { connect: { id: submitterID } },
      name: mapCreateDto.name,
      fileName: mapCreateDto.fileName,
      type: mapCreateDto.type,
      stats: { create: { baseStats: { create: {} } } }, // Just init empty entry
      status: MapStatus.NEEDS_REVISION,
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
              userID: credit.userID,
              description: credit.description
            };
          })
        }
      },
      tracks: {
        createMany: {
          data: mapCreateDto.tracks.map(
            (track): Prisma.MapTrackCreateManyMmapInput => {
              return {
                isLinear: track.isLinear,
                numZones: track.numZones,
                trackNum: track.trackNum,
                difficulty: track.difficulty
              };
            }
          )
        }
      }
    };

    const initialMap = await this.db.mMap.create({
      data: createInput,
      select: { id: true, tracks: true }
    });

    const mainTrack = initialMap.tracks.find((track) => track.trackNum === 0);

    const mapDB = await this.db.mMap.update({
      where: { id: initialMap.id },
      data: {
        mainTrack: {
          connect: {
            id: mainTrack.id
          }
        }
      },
      include: {
        info: true,
        credits: true,
        tracks: true
      }
    });

    await Promise.all(
      mapDB.tracks.map(async (track: MapTrack) => {
        const dtoTrack = mapCreateDto.tracks.find(
          (dtoTrack) => dtoTrack.trackNum === track.trackNum
        );

        await this.db.mapTrack.update({
          where: { id: track.id },
          data: { stats: { create: { baseStats: { create: {} } } } }
        }); // Init empty MapTrackStats entry

        await Promise.all(
          dtoTrack.zones.map(async (zone) => {
            const zoneDB = await this.db.mapZone.create({
              data: {
                track: { connect: { id: track.id } },
                zoneNum: zone.zoneNum,
                stats: { create: { baseStats: { create: {} } } }
              }
            });

            // We could do a `createMany` for the triggers in the above input
            // but we then need to attach a `MapZoneTriggerProperties` to each
            // using the DTO properties, and I'm not certain the data we get
            // back from the `createMany` is in the order we inserted. For
            // tracks we use the find w/ `trackNum` above, but
            // `MapZoneTriggerProperties` don't have any distinguishing features
            // like that. So I'm doing the triggers with looped `create`s so I
            // can include the `MapZoneTriggerProperties`. Hopefully
            // `MapZoneTriggerProperties` will be removed in 0.10.0 anyway
            // (they're stupid) in which case we should be able to use a
            // `createMany` for the triggers.
            await Promise.all(
              zone.triggers.map(async (trigger) => {
                await this.db.mapZoneTrigger.create({
                  data: {
                    zone: { connect: { id: zoneDB.id } },
                    type: trigger.type,
                    pointsHeight: trigger.pointsHeight,
                    pointsZPos: trigger.pointsZPos,
                    points: trigger.points,
                    properties: {
                      create: {
                        // This will create an empty table for triggers with no
                        // properties, probably bad, revisit in 0.10.0
                        properties: trigger?.zoneProps?.properties ?? {}
                      }
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
    await this.db.activity.createMany({
      data: mapDB.credits
        .filter((credit) => credit.type === MapCreditType.AUTHOR)
        .map((credit): Prisma.ActivityCreateManyInput => {
          return {
            type: ActivityType.MAP_UPLOADED,
            userID: credit.userID,
            data: mapDB.id
          };
        })
    });

    const finalizedMap = await this.db.mMap.findUnique({
      where: { id: mapDB.id },
      include: {
        info: true,
        stats: { include: { baseStats: true } },
        submitter: true,
        images: true,
        thumbnail: true,
        credits: { include: { user: true } },
        tracks: {
          include: {
            zones: {
              include: {
                triggers: { include: { properties: true } },
                stats: { include: { baseStats: true } }
              }
            },
            stats: { include: { baseStats: true } }
          }
        },
        mainTrack: {
          include: {
            zones: {
              include: {
                triggers: { include: { properties: true } },
                stats: { include: { baseStats: true } }
              }
            },
            stats: { include: { baseStats: true } }
          }
        }
      }
    });

    return DtoFactory(MapDto, finalizedMap);
  }

  async update(
    mapID: number,
    userID: number,
    update: UpdateMapDto,
    isAdmin = false
  ): Promise<void> {
    const map = await this.db.mMap.findUnique({ where: { id: mapID } });

    if (!map) throw new NotFoundException('No map found');

    if ([MapStatus.REJECTED, MapStatus.REMOVED].includes(map.status))
      throw new ForbiddenException('Map status forbids updating');

    if (map.submitterID !== userID && !isAdmin)
      throw new ForbiddenException('User is not the submitter of the map');

    if (!isAdmin) {
      if (map.submitterID !== userID)
        throw new ForbiddenException('User is not the submitter of the map');

      // We probably want complex logic for map submission, for now, keeping it
      // very strict.
      if (map.status !== MapStatus.NEEDS_REVISION)
        throw new ForbiddenException('Map is not in NEEDS_REVISION state');
      if (update.status !== MapStatus.READY_FOR_RELEASE)
        throw new ForbiddenException();
    }

    const previousStatus = map.status;

    await this.db.$transaction(async (tx) => {
      const updatedMap = await tx.mMap.update({
        where: { id: mapID },
        data: { status: update.status }
      });

      if (
        updatedMap.status !== previousStatus &&
        previousStatus === MapStatus.PENDING &&
        updatedMap.status === MapStatus.APPROVED
      ) {
        // status changed and map went from PENDING -> APPROVED
        const allCredits = await tx.mapCredit.findMany({
          where: { mapID, type: MapCreditType.AUTHOR }
        });

        await tx.activity.createMany({
          data: allCredits.map(
            (credit): Prisma.ActivityCreateManyInput => ({
              type: ActivityType.MAP_APPROVED,
              userID: credit.userID,
              data: mapID
            })
          )
        });
      }
    });
  }

  async delete(mapID: number): Promise<void> {
    const map = await this.db.mMap.findUnique({ where: { id: mapID } });

    if (!map) throw new NotFoundException('No map found');

    // Delete all stored map images
    const images = await this.db.mapImage.findMany({ where: { mapID } });
    await Promise.all(
      images.map((img) => this.mapImageService.deleteStoredMapImage(img.id))
    );

    // Delete all run files
    await this.runsService.deleteStoredMapRuns(mapID);

    // Delete stored map file
    const fileKey = this.getMapFileKey(map.fileName);
    await this.fileCloudService.deleteFileCloud(fileKey);

    await this.db.mMap.delete({ where: { id: mapID } });
  }

  //#endregion

  //#region Upload/Download

  async canUploadMap(mapID: number, userID: number): Promise<void> {
    const mapDB = await this.db.mMap.findUnique({ where: { id: mapID } });

    this.uploadMapChecks(mapDB, userID);
  }

  async upload(
    mapID: number,
    userID: number,
    mapFileBuffer: Buffer
  ): Promise<MapDto> {
    const mapDB = await this.db.mMap.findUnique({ where: { id: mapID } });

    this.uploadMapChecks(mapDB, userID);

    const hash = await this.storeMapFile(mapFileBuffer, mapDB);

    return DtoFactory(
      MapDto,
      await this.db.mMap.update({
        where: { id: mapDB.id },
        data: {
          status: MapStatus.PENDING,
          hash
        }
      })
    );
  }

  async download(mapID: number): Promise<StreamableFile> {
    const map = await this.db.mMap.findUnique({ where: { id: mapID } });

    if (!map) throw new NotFoundException('Map not found');

    const mapDataStream = await this.getMapFileFromStore(map.name);

    if (!mapDataStream)
      throw new NotFoundException(`Couldn't find BSP file for ${map.name}.bsp`);

    await this.db.mapStats.update({
      where: { mapID },
      data: { downloads: { increment: 1 } }
    });

    return mapDataStream;
  }

  private async storeMapFile(
    mapFileBuffer: Buffer,
    mapModel: MMap
  ): Promise<string> {
    const fileKey = this.getMapFileKey(mapModel.fileName);

    const result = await this.fileCloudService.storeFileCloud(
      mapFileBuffer,
      fileKey
    );

    return result.hash;
  }

  private getMapFileKey(mapName: string): string {
    return `maps/${mapName}.bsp`;
  }

  private getMapFileFromStore(mapName: string): Promise<StreamableFile> {
    const fileKey = this.getMapFileKey(mapName);

    return this.fileCloudService.getFileCloud(fileKey);
  }

  private uploadMapChecks(map: MMap, userID: number): void {
    if (!map) throw new NotFoundException('Map not found');

    if (userID !== map.submitterID)
      throw new ForbiddenException('You are not the submitter of this map');

    if (map.status !== MapStatus.NEEDS_REVISION)
      throw new ForbiddenException(
        'Map file cannot be uploaded, the map is not accepting revisions'
      );
  }

  //#endregion

  //#region Info

  async getInfo(mapID: number): Promise<MapInfoDto> {
    const mapInfo = await this.db.mapInfo.findUnique({ where: { mapID } });

    if (!mapInfo) throw new NotFoundException('Map not found');

    return DtoFactory(MapInfoDto, mapInfo);
  }

  async updateInfo(
    mapID: number,
    mapInfo: UpdateMapInfoDto,
    userID: number
  ): Promise<void> {
    if (!mapInfo.description && !mapInfo.youtubeID && !mapInfo.creationDate)
      throw new BadRequestException('Request contains no valid update data');

    const map = await this.db.mMap.findUnique({ where: { id: mapID } });

    if (!map) throw new NotFoundException('Map not found');

    if (map.submitterID !== userID)
      throw new ForbiddenException('User is not the submitter of the map');

    if (map.status !== MapStatus.NEEDS_REVISION)
      throw new ForbiddenException('Map is not in NEEDS_REVISION state');

    const data: Prisma.MapInfoUpdateInput = {};

    if (mapInfo.description) data.description = mapInfo.description;
    if (mapInfo.youtubeID) data.youtubeID = mapInfo.youtubeID;
    if (mapInfo.creationDate)
      data.creationDate = new Date(mapInfo.creationDate);

    await this.db.mapInfo.update({ where: { mapID }, data });
  }

  //#endregion

  //#region Zones

  async getZones(mapID: number): Promise<MapTrackDto[]> {
    const tracks = await this.db.mapTrack.findMany({
      where: { mapID },
      include: {
        zones: { include: { triggers: { include: { properties: true } } } }
      }
    });

    if (!tracks || tracks.length === 0)
      throw new NotFoundException('Map not found');

    // This is dumb but it's what the old api does
    // \server\src\models\map.js Line 499
    // TODO_POST_REWRITE: When map sessions are done this should be removed

    await this.db.mapStats.update({
      where: { mapID },
      data: { plays: { increment: 1 } }
    });

    return tracks.map((x) => DtoFactory(MapTrackDto, x));
  }

  //#endregion
}
