import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  StreamableFile
} from '@nestjs/common';
import { Map as MapDB, MapCredit, MapTrack, Prisma } from '@prisma/client';
import { MapsRepoService } from '../repo/maps-repo.service';
import { FileStoreCloudService } from '../filestore/file-store-cloud.service';
import { UsersRepoService } from '../repo/users-repo.service';
import { FileStoreCloudFile } from '../filestore/file-store.interface';
import { ConfigService } from '@nestjs/config';
import sharp from 'sharp';
import { RunsService } from '../runs/runs.service';
import {
  AdminCtlMapsGetAllQueryDto,
  CreateMapCreditDto,
  CreateMapDto,
  DtoFactory,
  ExpandToPrismaIncludes,
  MapCreditDto,
  MapDto,
  MapImageDto,
  MapInfoDto,
  MapsCtlGetAllQueryDto,
  MapTrackDto,
  PagedResponseDto,
  UpdateMapCreditDto,
  UpdateMapDto,
  UpdateMapInfoDto
} from '@momentum/backend/dto';
import { ActivityType, MapCreditType, MapStatus } from '@momentum/constants'; 
import { isEmpty } from "lodash";

@Injectable()
export class MapsService {
  constructor(
    private readonly mapRepo: MapsRepoService,
    private readonly userRepo: UsersRepoService,
    private readonly fileCloudService: FileStoreCloudService,
    private readonly config: ConfigService,
    private readonly runsService: RunsService
  ) {}

  //#region Maps

  async getAll(
    userID: number,
    query: MapsCtlGetAllQueryDto | AdminCtlMapsGetAllQueryDto
  ): Promise<PagedResponseDto<MapDto>> {
    // Old API has some stuff for "status" and "statusNot" and "priority" but isn't in docs or validations or
    // used anywhere in client/game, leaving for now.

    // Where
    const where: Prisma.MapWhereInput = {};
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

      // If we have difficulty filters we have to construct quite a complicated filter...
      if (typeof query.isLinear === 'boolean')
        where.mainTrack = where.mainTrack
          ? { is: { ...where.mainTrack.is, isLinear: query.isLinear } }
          : { isLinear: query.isLinear };
    }
    if (query instanceof AdminCtlMapsGetAllQueryDto && query.status)
      where.status = query.status;
    // query.priority ignored

    // Include
    const include: Prisma.MapInclude = {
      mainTrack: true,
      info: true,
      ...ExpandToPrismaIncludes(
        query.expand?.filter((x) =>
          ['credits', 'thumbnail', 'submitter'].includes(x)
        )
      )
    };

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

    // Order
    const order: Prisma.MapOrderByWithRelationInput = { createdAt: 'desc' };

    const dbResponse = await this.mapRepo.getAll(
      where,
      include,
      order,
      query.skip,
      query.take
    );

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
    const include: Prisma.MapInclude = ExpandToPrismaIncludes(
      expand?.filter((x) =>
        [
          'info',
          'credits',
          'submitter',
          'images',
          'thumbnail',
          'stats',
          'tracks'
        ].includes(x)
      )
    ) ?? {};

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

    const dbResponse = await this.mapRepo.get(
      mapID,
      isEmpty(include) ? undefined : include
    );

    if (!dbResponse) throw new NotFoundException('Map not found');

    if (incPB || incWR) {
      this.handleMapGetPrismaResponse(dbResponse, userID, incPB, incWR);
    }

    return DtoFactory(MapDto, dbResponse);
  }

  private handleMapGetIncludes(
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
  ): Promise<number> {
    // Check there's no map with same name
    const existingMaps: number = await this.mapRepo.count({
      name: mapCreateDto.name,
      NOT: { status: { in: [MapStatus.REJECTED, MapStatus.REMOVED] } }
    });

    if (existingMaps > 0)
      throw new ConflictException('Map with this name already exists');

    // Limit the number of pending maps a user can have at any one time
    const pendingMapLimit = this.config.get('limits.pendingMaps');
    const submittedMaps: number = await this.mapRepo.count({
      submitterID: submitterID,
      status: { in: [MapStatus.PENDING, MapStatus.NEEDS_REVISION] }
    });

    if (submittedMaps >= pendingMapLimit)
      throw new ConflictException(
        `You can't have more than ${pendingMapLimit} maps pending at once`
      );

    // Extra checks...
    //// Note: We should add further checks here when working on map submission. Though need to decide if we're going to do
    //// any BSP parsing on this API, or have mods check using Lumper.
    const trackNums = mapCreateDto.tracks.map((track) => track.trackNum);
    // Set construction ensures uniqueness, so just compare the lengths
    if (trackNums.length !== new Set(trackNums).size)
      throw new BadRequestException(
        'All map tracks must have unique track numbers'
      );

    // Actually build our input. Prisma doesn't let you do nested createMany (https://github.com/prisma/prisma/issues/5455)
    // so we have to do it in parts... Fortunately this doesn't run often.
    const createInput = {
      submitter: { connect: { id: submitterID } },
      name: mapCreateDto.name,
      type: mapCreateDto.type,
      stats: { create: {} }, // Just init empty entry
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
              userID: credit.userID
            };
          })
        }
      },
      tracks: {
        createMany: {
          data: mapCreateDto.tracks.map(
            (track): Prisma.MapTrackCreateManyMapInput => {
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

    const mapDB: any = await this.mapRepo.create(createInput);

    await Promise.all(
      mapDB.tracks.map(async (track: MapTrack) => {
        const dtoTrack = mapCreateDto.tracks.find(
          (dtoTrack) => dtoTrack.trackNum === track.trackNum
        );

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
            type: ActivityType.MAP_UPLOADED,
            userID: credit.userID,
            data: mapDB.id
          };
        })
    );

    // Return the map ID to the controller so it can set it in the response header
    return mapDB.id;
  }

  async update(
    mapID: number,
    userID: number,
    update: UpdateMapDto,
    isAdmin = false
  ): Promise<void> {
    const map = await this.mapRepo.get(mapID);

    if (!map) throw new NotFoundException('No map found');

    if ([MapStatus.REJECTED, MapStatus.REMOVED].includes(map.status))
      throw new ForbiddenException('Map status forbids updating');

    if (map.submitterID !== userID && !isAdmin)
      throw new ForbiddenException('User is not the submitter of the map');

    if (!isAdmin) {
      if (map.submitterID !== userID)
        throw new ForbiddenException('User is not the submitter of the map');

      // We probably want complex logic for map submission, for now, keeping it very strict.
      if (map.status !== MapStatus.NEEDS_REVISION)
        throw new ForbiddenException('Map is not in NEEDS_REVISION state');
      if (update.status !== MapStatus.READY_FOR_RELEASE)
        throw new ForbiddenException();
    }

    const previousStatus = map.status;

    const updatedMap = await this.mapRepo.update(mapID, {
      status: update.status
    });

    if (
      updatedMap.status !== previousStatus &&
      previousStatus === MapStatus.PENDING &&
      updatedMap.status === MapStatus.APPROVED
    ) {
      // status changed and map went from PENDING -> APPROVED

      const allCredits = await this.mapRepo.getCredits({
        mapID: mapID,
        type: MapCreditType.AUTHOR
      });

      return this.userRepo.createActivities(
        allCredits.map(
          (credit): Prisma.ActivityCreateManyInput => ({
            type: ActivityType.MAP_APPROVED,
            userID: credit.userID,
            data: mapID
          })
        )
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

    this.uploadMapChecks(mapDB, userID);
  }

  async upload(
    mapID: number,
    userID: number,
    mapFileBuffer: Buffer
  ): Promise<MapDto> {
    const mapDB = await this.mapRepo.get(mapID);

    this.uploadMapChecks(mapDB, userID);

    const result = await this.storeMapFile(mapFileBuffer, mapDB);

    const dbResponse = await this.mapRepo.update(mapDB.id, {
      status: MapStatus.PENDING,
      fileKey: result[0],
      hash: result[1]
    });

    return DtoFactory(MapDto, dbResponse);
  }

  async download(mapID: number): Promise<StreamableFile> {
    const map = await this.mapRepo.get(mapID);

    if (!map) throw new NotFoundException('Map not found');

    const mapDataStream = await this.getMapFileFromStore(map.name);

    if (!mapDataStream)
      throw new NotFoundException(`Couldn't find BSP file for ${map.name}.bsp`);

    await this.mapRepo.updateMapStats(mapID, {
      downloads: { increment: 1 }
    });

    return mapDataStream;
  }

  private async storeMapFile(
    mapFileBuffer: Buffer,
    mapModel: MapDB
  ): Promise<[fileKey: string, hash: string]> {
    const fileKey = `maps/${mapModel.name}.bsp`;

    const result = await this.fileCloudService.storeFileCloud(
      mapFileBuffer,
      fileKey
    );

    return [result.fileKey, result.hash];
  }

  private getMapFileFromStore(mapName: string): Promise<StreamableFile> {
    const fileName = `maps/${mapName}.bsp`;

    return this.fileCloudService.getFileCloud(fileName);
  }

  private uploadMapChecks(map: MapDB, userID: number): void {
    if (!map) throw new NotFoundException('Map not found');

    if (userID !== map.submitterID)
      throw new ForbiddenException('You are not the submitter of this map');

    if (map.status !== MapStatus.NEEDS_REVISION)
      throw new ForbiddenException(
        'Map file cannot be uploaded, the map is not accepting revisions'
      );
  }

  //#endregion

  //#region Credits

  async getCredits(mapID: number, expand: string[]): Promise<MapCreditDto[]> {
    const foundMap = await this.mapRepo.get(mapID);
    if (!foundMap) throw new NotFoundException('Map not found');

    const include: Prisma.MapCreditInclude = ExpandToPrismaIncludes(
      expand?.filter((x) => ['user'].includes(x))
    );
    const where: Prisma.MapCreditWhereInput = { mapID: mapID };

    const dbResponse = await this.mapRepo.getCredits(where, include);

    if (dbResponse.length === 0)
      throw new NotFoundException('No map credits found');

    return dbResponse.map((x) => DtoFactory(MapCreditDto, x));
  }

  async createCredit(
    mapID: number,
    createMapCredit: CreateMapCreditDto,
    userID: number
  ): Promise<MapCreditDto> {
    const map = await this.mapRepo.get(mapID, { credits: true });

    if (!map) throw new NotFoundException('Map not found');

    if (map.submitterID !== userID)
      throw new ForbiddenException('User is not the submitter of the map');

    if (map.status !== MapStatus.NEEDS_REVISION)
      throw new ForbiddenException('Map is not in NEEDS_REVISION state');

    const dupeCredit = await this.mapRepo.findCredit({
      mapID: mapID,
      userID: createMapCredit.userID,
      type: createMapCredit.type
    });

    if (dupeCredit) throw new ConflictException('Map credit already exists');

    const existingUser = await this.userRepo.get(createMapCredit.userID);

    if (!existingUser)
      throw new BadRequestException('Credited user does not exist');

    const newCredit: Prisma.MapCreditCreateInput = {
      type: createMapCredit.type,
      map: { connect: { id: mapID } },
      user: { connect: { id: createMapCredit.userID } }
    };

    const dbResponse = await this.mapRepo.createCredit(newCredit);

    await this.updateMapCreditActivities(dbResponse);

    return DtoFactory(MapCreditDto, dbResponse);
  }

  async getCredit(
    mapCreditID: number,
    expand: string[]
  ): Promise<MapCreditDto> {
    const include: Prisma.MapCreditInclude = ExpandToPrismaIncludes(
      expand?.filter((x) => ['user'].includes(x))
    );

    const dbResponse = await this.mapRepo.getCredit(mapCreditID, include);

    if (!dbResponse) throw new NotFoundException('Map credit not found');

    return DtoFactory(MapCreditDto, dbResponse);
  }

  async updateCredit(
    mapCreditID: number,
    creditUpdate: UpdateMapCreditDto,
    userID: number
  ): Promise<void> {
    if (!creditUpdate.userID && !creditUpdate.type)
      throw new BadRequestException('No update data provided');

    const mapCredit = await this.mapRepo.getCredit(mapCreditID, { user: true });

    if (!mapCredit) throw new NotFoundException('Map credit not found');

    await this.updateCreditChecks(mapCredit, creditUpdate, userID);

    const data: Prisma.MapCreditUpdateInput = {};

    if (creditUpdate.userID)
      data.user = { connect: { id: creditUpdate.userID } };

    if (creditUpdate.type) data.type = creditUpdate.type;

    const newCredit = await this.mapRepo.updateCredit(mapCreditID, data);

    await this.updateMapCreditActivities(newCredit, mapCredit);
  }

  async deleteCredit(mapCreditID: number, userID: number): Promise<void> {
    const mapCred = await this.mapRepo.getCredit(mapCreditID, { user: true });
    if (!mapCred) throw new NotFoundException('Map credit not found');

    const mapOfCredit = await this.mapRepo.get(mapCred.mapID);
    if (mapOfCredit.submitterID !== userID)
      throw new ForbiddenException('User is not the submitter of this map');

    if (mapOfCredit.status !== MapStatus.NEEDS_REVISION)
      throw new ForbiddenException('Map is not in NEEDS_REVISION state');

    await this.mapRepo.deleteCredit({ id: mapCreditID });

    await this.updateMapCreditActivities(null, mapCred);
  }

  private async updateCreditChecks(
    mapCred: MapCredit,
    creditUpdate: UpdateMapCreditDto,
    userID: number
  ) {
    if (creditUpdate.userID) {
      const userExists = await this.userRepo.get(creditUpdate.userID);
      if (!userExists)
        throw new BadRequestException('Credited user does not exist');
    }

    const mapOfCredit = await this.mapRepo.get(mapCred.mapID);
    if (mapOfCredit.submitterID !== userID)
      throw new ForbiddenException('User is not the submitter of this map');

    if (mapOfCredit.status !== MapStatus.NEEDS_REVISION)
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
    if (foundDupe)
      throw new ConflictException('Cannot have duplicate map credits');
  }

  private async updateMapCreditActivities(
    newCredit?: MapCredit,
    oldCredit?: MapCredit
  ): Promise<void> {
    const deleteOldActivity = () =>
      this.userRepo.deleteActivities({
        type: ActivityType.MAP_UPLOADED,
        data: oldCredit.mapID,
        userID: oldCredit.userID
      });

    const createNewActivity = () =>
      this.userRepo.createActivities([
        {
          type: ActivityType.MAP_UPLOADED,
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

  //#region Info

  async getInfo(mapID: number): Promise<MapInfoDto> {
    const mapInfo = await this.mapRepo.getInfo(mapID);

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
    const map = await this.mapRepo.get(mapID);
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

    await this.mapRepo.updateInfo(mapID, data);
  }

  //#endregion

  //#region Images

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

  async createImage(
    userID: number,
    mapID: number,
    imgBuffer: Buffer
  ): Promise<MapImageDto> {
    const map = await this.mapRepo.get(mapID);

    if (!map) throw new NotFoundException('Map not found');

    if (map.submitterID !== userID)
      throw new ForbiddenException('User is not the submitter of the map');

    if (map.status !== MapStatus.NEEDS_REVISION)
      throw new ForbiddenException('Map is not in NEEDS_REVISION state');

    const images = await this.mapRepo.getImages({ mapID: mapID });
    let imageCount = images.length;
    if (map.thumbnailID) imageCount--; // Don't count the thumbnail towards this limit
    if (imageCount >= this.config.get('limits.mapImageUploads'))
      throw new ConflictException('Map image file limit reached');

    const newImage = await this.mapRepo.createImage(mapID);

    const uploadedImages = await this.storeMapImage(imgBuffer, newImage.id);

    if (!uploadedImages) {
      await this.mapRepo.deleteImage({ id: newImage.id });
      throw new BadGatewayException('Error uploading image to cdn');
    }

    return DtoFactory(MapImageDto, newImage);
  }

  async updateImage(
    userID: number,
    imgID: number,
    imgBuffer: Buffer
  ): Promise<void> {
    const image = await this.mapRepo.getImage(imgID);

    if (!image) throw new NotFoundException('Image not found');

    const map = await this.mapRepo.get(image.mapID);

    if (map.submitterID !== userID)
      throw new ForbiddenException('User is not the submitter of the map');

    if (map.status !== MapStatus.NEEDS_REVISION)
      throw new ForbiddenException('Map is not in NEEDS_REVISION state');

    const uploadedImages = await this.storeMapImage(imgBuffer, imgID);

    if (!uploadedImages)
      throw new BadGatewayException('Failed to upload image to CDN');
  }

  async deleteImage(userID: number, imgID: number): Promise<void> {
    const image = await this.mapRepo.getImage(imgID);

    if (!image) throw new NotFoundException('Image not found');

    const map = await this.mapRepo.get(image.mapID);

    if (map.submitterID !== userID)
      throw new ForbiddenException('User is not the submitter of the map');

    if (map.status !== MapStatus.NEEDS_REVISION)
      throw new ForbiddenException('Map is not in NEEDS_REVISION state');

    await Promise.all([
      this.deleteStoredMapImage(imgID),
      this.mapRepo.deleteImage({ id: imgID })
    ]);
  }

  async editSaveMapImageFile(
    imgBuffer: Buffer,
    fileName: string,
    width: number,
    height: number
  ): Promise<FileStoreCloudFile> {
    try {
      return this.fileCloudService.storeFileCloud(
        await sharp(imgBuffer)
          .resize(width, height, { fit: 'inside' })
          .jpeg({ mozjpeg: true })
          .toBuffer(),
        fileName
      );
    } catch {
      // This looks bad, but sharp is very non-specific about its errors
      throw new BadRequestException('Invalid image file');
    }
  }

  async storeMapImage(
    imgBuffer: Buffer,
    imgID: number
  ): Promise<FileStoreCloudFile[]> {
    return Promise.all([
      this.editSaveMapImageFile(imgBuffer, `img/${imgID}-small.jpg`, 480, 360),
      this.editSaveMapImageFile(
        imgBuffer,
        `img/${imgID}-medium.jpg`,
        1280,
        720
      ),
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

  //#region Thumbnails

  async updateThumbnail(
    userID: number,
    mapID: number,
    imgBuffer: Buffer
  ): Promise<void> {
    let map = await this.mapRepo.get(mapID, { thumbnail: true });

    if (!map) throw new NotFoundException('Map not found');
    if (map.submitterID !== userID)
      throw new ForbiddenException('User is not the submitter of the map');
    if (map.status !== MapStatus.NEEDS_REVISION)
      throw new ForbiddenException('Map is not in NEEDS_REVISION state');

    if (!map.thumbnailID) {
      const newThumbnail = await this.mapRepo.createImage(mapID);
      map = await this.mapRepo.update(mapID, {
        thumbnail: { connect: { id: newThumbnail.id } }
      });
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

  //#region Zones

  async getZones(mapID: number): Promise<MapTrackDto[]> {
    const tracks = await this.mapRepo.getMapTracks(
      { mapID: mapID },
      { zones: { include: { triggers: { include: { properties: true } } } } }
    );

    if (!tracks || tracks.length === 0)
      throw new NotFoundException('Map not found');

    // This is dumb but it's what the old api does
    // \server\src\models\map.js Line 499
    // TODO_POST_REWRITE: When map sessions are done this should be removed

    await this.mapRepo.updateMapStats(mapID, {
      plays: { increment: 1 }
    });

    return tracks.map((x) => DtoFactory(MapTrackDto, x));
  }

  //#endregion
}
