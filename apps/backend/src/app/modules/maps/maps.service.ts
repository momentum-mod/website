import {
  BadRequestException,
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException
} from '@nestjs/common';
import {
  MapTrack,
  MapZone,
  MapZoneTrigger,
  MapZoneTriggerProperties,
  Prisma
} from '@prisma/client';
import { FileStoreService } from '../filestore/file-store.service';
import { ConfigService } from '@nestjs/config';
import { RunsService } from '../runs/runs.service';
import {
  DtoFactory,
  MapDto,
  MapsGetAllSubmissionQueryDto,
  MapInfoDto,
  MapsGetAllAdminQueryDto,
  MapsGetAllQueryDto,
  MapTrackDto,
  PagedResponseDto,
  UpdateMapDto,
  UpdateMapInfoDto,
  MapsGetAllSubmissionAdminQueryDto
} from '@momentum/backend/dto';
import {
  ActivityType,
  CombinedMapStatuses,
  CombinedRoles,
  MapCreditType,
  MapsGetAllSubmissionAdminFilter,
  MapsGetExpand,
  MapStatus,
  MapStatusNew,
  Role
} from '@momentum/constants';
import { MapImageService } from './map-image.service';
import { EXTENDED_PRISMA_SERVICE } from '../database/db.constants';
import { ExtendedPrismaService } from '../database/prisma.extension';
import { Bitflags } from '@momentum/bitflags';
import { MapTestingRequestState } from '@momentum/constants';
import {
  expandToIncludes,
  intersection,
  isEmpty,
  undefinedIfEmpty
} from '@momentum/util-fn';

@Injectable()
export class MapsService {
  constructor(
    @Inject(EXTENDED_PRISMA_SERVICE) private readonly db: ExtendedPrismaService,
    private readonly fileStoreService: FileStoreService,
    private readonly config: ConfigService,
    private readonly runsService: RunsService,
    @Inject(forwardRef(() => MapImageService))
    private readonly mapImageService: MapImageService
  ) {}

  //#region Maps

  //
  async getAll(
    userID: number,
    query:
      | MapsGetAllQueryDto
      | MapsGetAllAdminQueryDto
      | MapsGetAllSubmissionQueryDto
      | MapsGetAllSubmissionAdminQueryDto
  ): Promise<PagedResponseDto<MapDto>> {
    // Where
    const where: Prisma.MMapWhereInput = {};
    if (query.search) where.name = { contains: query.search };
    if (query.submitterID) where.submitterID = query.submitterID;
    if (query instanceof MapsGetAllQueryDto) {
      // /maps only returns approved maps
      where.status = MapStatusNew.APPROVED;

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
    } else if (
      query instanceof MapsGetAllSubmissionQueryDto ||
      query instanceof MapsGetAllSubmissionAdminQueryDto
    ) {
      const { roles } = await this.db.user.findUnique({
        where: { id: userID },
        select: { roles: true }
      });

      // Logic here is a nightmare, for a breakdown of permissions see
      // MapsService.getMapAndCheckReadAccess.
      const filter = query.filter;
      const privateTestingConditions = {
        AND: [
          { status: MapStatusNew.PRIVATE_TESTING },
          {
            OR: [
              { submitterID: userID },
              { credits: { some: { userID } } },
              {
                testingRequests: {
                  some: { userID, state: MapTestingRequestState.ACCEPTED }
                }
              }
            ]
          }
        ]
      };
      if (Bitflags.has(CombinedRoles.MOD_OR_ADMIN, roles)) {
        where.status = {
          in: filter
            ? intersection(filter, CombinedMapStatuses.IN_SUBMISSION)
            : CombinedMapStatuses.IN_SUBMISSION
        };
      } else if (Bitflags.has(Role.REVIEWER, roles)) {
        const adminFilter = filter as MapsGetAllSubmissionAdminFilter;
        if (adminFilter?.length > 0) {
          if (adminFilter?.includes(MapStatusNew.FINAL_APPROVAL))
            throw new ForbiddenException();

          const ORs = [];
          if (adminFilter?.includes(MapStatusNew.PUBLIC_TESTING)) {
            if (adminFilter?.includes(MapStatusNew.CONTENT_APPROVAL)) {
              ORs.push({
                status: {
                  in: [
                    MapStatusNew.PUBLIC_TESTING,
                    MapStatusNew.CONTENT_APPROVAL
                  ]
                }
              });
            } else {
              ORs.push({ status: MapStatusNew.PUBLIC_TESTING });
            }
          } else if (adminFilter?.includes(MapStatusNew.CONTENT_APPROVAL)) {
            ORs.push({ status: MapStatusNew.CONTENT_APPROVAL });
          }

          if (adminFilter?.includes(MapStatusNew.PRIVATE_TESTING)) {
            ORs.push({
              AND: [
                { status: MapStatusNew.PRIVATE_TESTING },
                {
                  OR: [
                    { submitterID: userID },
                    { credits: { some: { userID } } },
                    {
                      testingRequests: {
                        some: { userID, state: MapTestingRequestState.ACCEPTED }
                      }
                    }
                  ]
                }
              ]
            });
          }
          where.OR = ORs;
        } else {
          where.OR = [
            {
              status: {
                in: [MapStatusNew.PUBLIC_TESTING, MapStatusNew.CONTENT_APPROVAL]
              }
            },
            {
              AND: [
                { status: MapStatusNew.PRIVATE_TESTING },
                {
                  OR: [
                    { submitterID: userID },
                    { credits: { some: { userID } } },
                    {
                      testingRequests: {
                        some: { userID, state: MapTestingRequestState.ACCEPTED }
                      }
                    }
                  ]
                }
              ]
            }
          ];
        }
      } else {
        // Regular user filters can only be public, private, both or none (last two are equiv)
        if (filter?.[0] === MapStatusNew.PUBLIC_TESTING) {
          where.status = MapStatusNew.PUBLIC_TESTING;
        } else if (filter?.[0] === MapStatusNew.PRIVATE_TESTING) {
          where.AND = privateTestingConditions;
        } else {
          where.OR = [
            { status: MapStatusNew.PUBLIC_TESTING },
            {
              AND: [
                { status: MapStatusNew.PRIVATE_TESTING },
                {
                  OR: [
                    { submitterID: userID },
                    { credits: { some: { userID } } },
                    {
                      testingRequests: {
                        some: { userID, state: MapTestingRequestState.ACCEPTED }
                      }
                    }
                  ]
                }
              ]
            }
          ];
        }
      }
    } else {
      // /admin/maps can filter by any map statuses
      if (query.filter) {
        where.status = { in: query.filter };
      }
    }

    const submissionInclude: Prisma.MapSubmissionInclude = expandToIncludes(
      query.expand,
      { only: ['currentVersion', 'versions'] }
    );

    // Include
    const include: Prisma.MMapInclude = {
      mainTrack: true,
      submission: isEmpty(submissionInclude)
        ? true
        : { include: submissionInclude },
      ...expandToIncludes(query.expand, {
        without: ['currentVersion', 'versions', 'personalBest', 'worldRecord'],
        mappings: [
          { expand: 'credits', value: { include: { user: true } } },
          {
            expand: 'inFavorites',
            model: 'favorites',
            value: { where: { userID: userID } }
          },
          {
            expand: 'inLibrary',
            model: 'libraryEntries',
            value: { where: { userID: userID } }
          }
        ]
      })
    };

    let incPB: boolean, incWR: boolean;

    if (
      query instanceof MapsGetAllQueryDto ||
      query instanceof MapsGetAllSubmissionQueryDto
    ) {
      incPB = query.expand?.includes('personalBest');
      incWR = query.expand?.includes('worldRecord');
      this.handleMapGetIncludes(include, incPB, incWR, userID);
    }

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
    expand?: MapsGetExpand
  ): Promise<MapDto> {
    const include: Prisma.MMapInclude = expandToIncludes(expand, {
      without: ['personalBest', 'worldRecord'],
      mappings: [
        {
          expand: 'tracks',
          value: {
            include: {
              zones: {
                include: { triggers: { include: { properties: true } } }
              }
            }
          }
        },
        { expand: 'credits', value: { include: { user: true } } },
        {
          expand: 'inFavorites',
          model: 'favorites',
          value: { where: { userID: userID } }
        },
        {
          expand: 'inLibrary',
          model: 'libraryEntries',
          value: { where: { userID: userID } }
        }
      ]
    });

    const incPB = expand?.includes('personalBest');
    const incWR = expand?.includes('worldRecord');

    this.handleMapGetIncludes(include, incPB, incWR, userID);

    const map = await this.getMapAndCheckReadAccess(
      mapID,
      userID,
      undefinedIfEmpty(include)
    );

    // We'll delete this stupid shit soon
    if (expand?.includes('tracks'))
      for (const track of map.tracks as (MapTrack & {
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
      this.handleMapGetPrismaResponse(map, userID, incPB, incWR);
    }

    return DtoFactory(MapDto, map);
  }

  private handleMapGetIncludes(
    include: Prisma.MMapInclude,
    PB: boolean,
    WR: boolean,
    userID?: number
  ): void {
    if (!(PB || WR)) return;

    include.ranks = { include: { run: true, user: true } };
    if (PB && WR) {
      include.ranks.where = { OR: [{ userID: userID }, { rank: 1 }] };
    } else if (PB) {
      include.ranks.where = { userID: userID };
    } else {
      include.ranks.where = { rank: 1 };
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
      if (update.status !== (MapStatus as any).READY_FOR_RELEASE)
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
    await this.fileStoreService.deleteFile(`maps/${map.fileName}.bsp`);

    await this.db.mMap.delete({ where: { id: mapID } });
  }

  //#endregion

  //#region Info

  async getInfo(mapID: number, userID: number): Promise<MapInfoDto> {
    // Checks need to fetch map anyway and we have no includes on mapInfo, so
    // may as well just have this function include mapInfo and pull that off the
    // return value.
    const map = await this.getMapAndCheckReadAccess(mapID, userID, {
      info: true
    });

    const mapInfo = map.info;

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

  // TODO: haven't done 0.10.0 perms checks here since this endpoint is changing
  // drastically, needs doing eventually
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

  //#region Access Checks

  /**
   * Perform various checks based on map status to determine if the user has
   * permission to access this data.
   *
   * Always requires query for the specified map, to save calling DB twice we
   * return that object, so we let you pass in an `include`. However we'll need
   * to cast the return type to manually add for included models for
   * now; I can't figure out the crazy Prisma type stuff. By following
   * https://www.prisma.io/docs/concepts/components/prisma-client/advanced-type-safety
   * and some of our existing stuff in extended-client.ts we could probably
   * figure it out eventually, but the TS language server takes so long to
   * resolve everything it's a nightmare to work with. Leaving for now!
   */
  async getMapAndCheckReadAccess(
    mapID: number,
    userID: number,
    include?: Prisma.MMapInclude
  ) {
    const map = await this.db.mMap.findUnique({
      where: { id: mapID },
      include
    });

    if (!map) {
      throw new NotFoundException('Map does not exist');
    }

    if (map.status === undefined) {
      throw new InternalServerErrorException('Invalid map data');
    }

    // If APPROVED/PUBLIC_TESTING, anyone can access.
    if (
      map.status === MapStatusNew.APPROVED ||
      map.status === MapStatusNew.PUBLIC_TESTING
    ) {
      return map;
    }

    // For any other state, we need to know roles
    const user = await this.db.user.findUnique({ where: { id: userID } });

    switch (map.status) {
      // PRIVATE_TESTING, only allow:
      // - The submitter
      // - Moderator/Admin
      // - in the credits
      // - Has an accepted MapTestingRequest
      case MapStatusNew.PRIVATE_TESTING: {
        if (
          map.submitterID === userID ||
          Bitflags.has(user.roles, CombinedRoles.MOD_OR_ADMIN)
        )
          return map;

        if (
          await this.db.mapTestingRequest.exists({
            where: { mapID, userID, state: MapTestingRequestState.ACCEPTED }
          })
        )
          return map;

        if (await this.db.mapCredit.exists({ where: { mapID, userID } }))
          return map;

        break;
      }
      // CONTENT_APPROVAL/FINAL_APPROVAL, only allow:
      // - The submitter
      // - Moderator/Admin
      case MapStatusNew.CONTENT_APPROVAL:
      case MapStatusNew.FINAL_APPROVAL: {
        if (
          map.submitterID === userID ||
          Bitflags.has(user.roles, CombinedRoles.MOD_OR_ADMIN)
        )
          return map;

        break;
      }
      // DISABLED/REJECTED, only allow:
      // - Moderator/Admin
      case MapStatusNew.REJECTED:
      case MapStatusNew.DISABLED: {
        if (Bitflags.has(user.roles, CombinedRoles.MOD_OR_ADMIN)) return map;
        break;
      }
    }

    throw new ForbiddenException('User not authorized to access map data');
  }

  //#endregion
}
