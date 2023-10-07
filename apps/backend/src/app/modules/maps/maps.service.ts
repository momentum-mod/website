import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException
} from '@nestjs/common';
import {
  MapCredit,
  MapSubmission,
  MapTrack,
  MapZone,
  MapZoneTrigger,
  MapZoneTriggerProperties,
  MMap,
  Prisma
} from '@prisma/client';
import { FileStoreService } from '../filestore/file-store.service';
import { RunsService } from '../runs/runs.service';
import {
  CreateMapDto,
  CreateMapSubmissionVersionDto,
  DtoFactory,
  MapDto,
  MapInfoDto,
  MapsGetAllAdminQueryDto,
  MapsGetAllQueryDto,
  MapsGetAllSubmissionAdminQueryDto,
  MapsGetAllSubmissionQueryDto,
  MapSummaryDto,
  MapTrackDto,
  PagedResponseDto,
  UpdateMapAdminDto,
  UpdateMapDto
} from '@momentum/backend/dto';
import {
  ActivityType,
  approvedBspPath,
  approvedVmfsPath,
  Ban,
  CombinedMapStatuses,
  CombinedRoles,
  MapCreditType,
  MapsGetAllSubmissionAdminFilter,
  MapsGetExpand,
  MapStatusChangers,
  MapStatusNew,
  MapSubmissionDate,
  MapSubmissionPlaceholder,
  MapTestingRequestState,
  MapZones,
  Role,
  submissionBspPath,
  submissionVmfsPath
} from '@momentum/constants';
import { MapImageService } from './map-image.service';
import { EXTENDED_PRISMA_SERVICE } from '../database/db.constants';
import {
  ExtendedPrismaService,
  ExtendedPrismaServiceTransaction
} from '../database/prisma.extension';
import { Bitflags } from '@momentum/bitflags';
import {
  expandToIncludes,
  intersection,
  isEmpty,
  throwIfEmpty,
  undefinedIfEmpty
} from '@momentum/util-fn';
import { File } from '@nest-lab/fastify-multer';
import { vdf } from 'fast-vdf';
import Zip from 'adm-zip';
import { FileStoreFile } from '../filestore/file-store.interface';
import { MapTestingRequestService } from './map-testing-request.service';
import { ConfigService } from '@nestjs/config';
import { OverrideProperties } from 'type-fest';
import { deepmerge } from '@fastify/deepmerge';
import { MapCreditsService } from './map-credits.service';

type MapWithSubmission = MMap & {
  submission: OverrideProperties<
    MapSubmission,
    {
      dates: MapSubmissionDate[];
      placeholders: MapSubmissionPlaceholder[];
    }
  >;
};

@Injectable()
export class MapsService {
  constructor(
    @Inject(EXTENDED_PRISMA_SERVICE) private readonly db: ExtendedPrismaService,
    private readonly config: ConfigService,
    private readonly fileStoreService: FileStoreService,
    private readonly runsService: RunsService,
    @Inject(forwardRef(() => MapImageService))
    private readonly mapImageService: MapImageService,
    @Inject(forwardRef(() => MapTestingRequestService))
    private readonly mapTestingRequestService: MapTestingRequestService,
    @Inject(forwardRef(() => MapTestingRequestService))
    private readonly mapCreditService: MapCreditsService
  ) {}

  //#region Gets

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
      without: ['currentVersion', 'versions', 'personalBest', 'worldRecord'],
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

    const submissionIncludes: Prisma.MapSubmissionInclude = expandToIncludes(
      expand,
      { only: ['currentVersion', 'versions'] }
    );

    if (!isEmpty(submissionIncludes)) {
      include.submission = { include: submissionIncludes };
    }

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

  async getSubmittedMapsSummary(userID: number): Promise<MapSummaryDto[]> {
    const result = await this.db.mMap.groupBy({
      by: ['status'],
      where: { submitterID: userID },
      _count: {
        status: true
      }
    });

    if (!result) throw new NotFoundException('No submitted Maps found');

    return result.map(({ _count, status }) =>
      DtoFactory(MapSummaryDto, {
        status: status,
        statusCount: _count.status
      })
    );
  }

  //#endregion

  //#region Submission

  async submitMap(
    dto: CreateMapDto,
    userID: number,
    bspFile: File,
    vmfFiles?: File[]
  ): Promise<MapDto> {
    await this.checkCreateDto(userID, dto);
    this.checkMapFiles(dto.fileName, bspFile, vmfFiles);
    this.checkMapFileNames(dto.name, dto.fileName);

    const hasVmf = vmfFiles?.length > 0;
    const bspHash = FileStoreService.getHashForBuffer(bspFile.buffer);

    return this.db.$transaction(async (tx) => {
      const map = await this.createMapDbEntry(tx, dto, userID, bspHash, hasVmf);

      const version = map.submission.currentVersion;

      const tasks: Promise<unknown>[] = [
        (async () => {
          const zippedVmf = hasVmf
            ? await this.zipVmfFiles(dto.fileName, 1, vmfFiles)
            : undefined;

          return this.uploadMapSubmissionVersionFiles(
            version.id,
            bspFile,
            zippedVmf
          );
        })(),

        this.createMapUploadedActivities(tx, map.id, map.credits)
      ];

      if (dto.wantsPrivateTesting && dto.testInvites?.length > 0) {
        tasks.push(
          this.mapTestingRequestService.createOrUpdatePrivateTestingInvites(
            tx,
            map.id,
            dto.testInvites
          )
        );
      }

      await Promise.all(tasks);

      return DtoFactory(MapDto, map);
    });
  }

  async submitMapSubmissionVersion(
    mapID: number,
    dto: CreateMapSubmissionVersionDto,
    userID: number,
    bspFile: File,
    vmfFiles?: File[]
  ): Promise<MapDto> {
    const map = await this.db.mMap.findUnique({
      where: { id: mapID },
      include: { submission: { include: { currentVersion: true } } }
    });

    if (!map) {
      throw new NotFoundException('Map does not exist');
    }

    if (map.submitterID !== userID)
      throw new ForbiddenException('User is not the map submitter');

    const { bans: userBans } = await this.db.user.findUnique({
      where: { id: userID },
      select: { bans: true }
    });

    // If the user is banned from map submission, this map was *probably*
    // already rejected. But do this check just in case a mod bans them first
    // and hasn't yet rejected the map.
    if (Bitflags.has(userBans, Ban.MAP_SUBMISSION)) {
      throw new ForbiddenException('User is banned from map submission');
    }

    if (!CombinedMapStatuses.IN_SUBMISSION.includes(map.status)) {
      throw new ForbiddenException('Map does not allow editing');
    }

    this.checkMapFiles(map.fileName, bspFile, vmfFiles);

    const hasVmf = vmfFiles?.length > 0;
    const bspHash = FileStoreService.getHashForBuffer(bspFile.buffer);

    const oldVersion = map.submission.currentVersion;
    const newVersionNum = oldVersion.versionNum + 1;

    await this.db.$transaction(async (tx) => {
      const newVersion = await tx.mapSubmissionVersion.create({
        data: {
          versionNum: newVersionNum,
          hasVmf,
          hash: bspHash,
          changelog: dto.changelog,
          submission: { connect: { mapID } }
        }
      });

      await Promise.all([
        (async () => {
          const zippedVmf = hasVmf
            ? await this.zipVmfFiles(map.fileName, newVersionNum, vmfFiles)
            : undefined;

          await this.uploadMapSubmissionVersionFiles(
            newVersion.id,
            bspFile,
            zippedVmf
          );
        })(),

        tx.mapSubmission.update({
          where: { mapID },
          data: { currentVersion: { connect: { id: newVersion.id } } }
        })
      ]);
    });

    return DtoFactory(
      MapDto,
      await this.db.mMap.findUnique({
        where: { id: mapID },
        include: {
          submission: { include: { currentVersion: true, versions: true } }
        }
      })
    );
  }

  private async checkCreateDto(userID: number, dto: CreateMapDto) {
    const user = await this.db.user.findUnique({
      where: { id: userID },
      include: { submittedMaps: true }
    });

    // 403 is user has the map submission ban
    if (Bitflags.has(user.bans, Ban.MAP_SUBMISSION)) {
      throw new ForbiddenException('User is banned from map submission');
    }

    // 403 if the user is not a mapper, porter, moderator or admin, and they
    // already have a map in private testing, content approval, public testing,
    // or final approval.
    if (
      !Bitflags.has(user.roles, CombinedRoles.MAPPER_AND_ABOVE) &&
      user.submittedMaps.some((map) =>
        CombinedMapStatuses.IN_SUBMISSION.includes(map.status)
      )
    ) {
      throw new ForbiddenException(
        'User is not an approved mapper and already has a map in review'
      );
    }

    // Don't allow maps with same filename unless existing one is disabled.
    if (
      await this.db.mMap.exists({
        where: {
          fileName: dto.fileName,
          NOT: { status: MapStatusNew.DISABLED }
        }
      })
    )
      throw new ConflictException('Map with this file name already exists');

    // Extra checks...
    // TODO: Let's add more here when doing zoning refactor.
    const trackNums = dto.tracks.map((track) => track.trackNum);
    // Set construction ensures uniqueness, so just compare the lengths
    if (trackNums.length !== new Set(trackNums).size)
      throw new BadRequestException(
        'All map tracks must have unique track numbers'
      );
  }

  // This function will get much less insane once we do 0.10.0 zoning!
  private async createMapDbEntry(
    tx: ExtendedPrismaServiceTransaction,
    createMapDto: CreateMapDto,
    submitterID: number,
    bspHash: string,
    hasVmf: boolean
  ) {
    const status = createMapDto.wantsPrivateTesting
      ? MapStatusNew.PRIVATE_TESTING
      : MapStatusNew.CONTENT_APPROVAL;

    // Prisma doesn't let you do nested createMany https://github.com/prisma/prisma/issues/5455)
    // so we have to do this shit in parts... Fortunately this doesn't run often.
    const initialMap = await tx.mMap.create({
      data: {
        submitter: { connect: { id: submitterID } },
        name: createMapDto.name,
        fileName: createMapDto.fileName,
        submission: {
          create: {
            type: createMapDto.submissionType,
            placeholders: createMapDto.placeholders,
            suggestions: createMapDto.suggestions,
            versions: { create: { versionNum: 1, hash: bspHash, hasVmf } },
            dates: [{ status, date: new Date().toJSON() }]
          }
        },
        stats: { create: { baseStats: { create: {} } } },
        status,
        info: {
          create: {
            numTracks: createMapDto.info.numTracks,
            description: createMapDto.info.description,
            creationDate: createMapDto.info.creationDate,
            youtubeID: createMapDto.info.youtubeID
          }
        },
        credits: {
          createMany: {
            data: createMapDto.credits.map((credit) => ({
              type: credit.type,
              userID: credit.userID,
              description: credit.description
            }))
          }
        },
        tracks: {
          createMany: {
            data: createMapDto.tracks.map(
              (track): Prisma.MapTrackCreateManyMmapInput => ({
                isLinear: track.isLinear,
                numZones: track.numZones,
                trackNum: track.trackNum,
                difficulty: track.difficulty
              })
            )
          }
        }
      },
      select: {
        id: true,
        tracks: true,
        submission: { select: { versions: true } }
      }
    });

    const mainTrack = initialMap.tracks.find((track) => track.trackNum === 0);

    const map = await tx.mMap.update({
      where: { id: initialMap.id },
      data: {
        mainTrack: { connect: { id: mainTrack.id } },
        submission: {
          update: {
            currentVersion: {
              connect: { id: initialMap.submission.versions[0].id }
            }
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
      map.tracks.map(async (track: MapTrack) => {
        const dtoTrack = createMapDto.tracks.find(
          (dtoTrack) => dtoTrack.trackNum === track.trackNum
        );

        await tx.mapTrack.update({
          where: { id: track.id },
          data: { stats: { create: { baseStats: { create: {} } } } }
        }); // Init empty MapTrackStats entry

        await Promise.all(
          dtoTrack.zones.map(async (zone) => {
            const zoneDB = await tx.mapZone.create({
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
                await tx.mapZoneTrigger.create({
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

    return tx.mMap.findUnique({
      where: { id: map.id },
      include: {
        info: true,
        stats: { include: { baseStats: true } },
        submission: { include: { currentVersion: true } },
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
  }

  private async createMapUploadedActivities(
    tx: ExtendedPrismaServiceTransaction,
    mapID: number,
    credits: MapCredit[]
  ) {
    await tx.activity.createMany({
      data: credits
        .filter((credit) => credit.type === MapCreditType.AUTHOR)
        .map(
          (credit): Prisma.ActivityCreateManyInput => ({
            type: ActivityType.MAP_UPLOADED,
            userID: credit.userID,
            data: mapID
          })
        )
    });
  }

  private checkMapFiles(fileName: string, bspFile: File, vmfFiles: File[]) {
    if (
      !bspFile.originalname.startsWith(fileName) ||
      !bspFile.originalname.endsWith('.bsp')
    )
      throw new BadRequestException('Bad BSP name');

    for (const file of vmfFiles ?? []) {
      if (!file.originalname.endsWith('.vmf'))
        throw new BadRequestException('Bad VMF name');

      if (!Buffer.isBuffer(file.buffer))
        throw new BadRequestException('Invalid VMF file');

      try {
        vdf.parse(file.buffer.toString());
      } catch (error) {
        throw new BadRequestException(`Invalid VMF file: ${error.message}`);
      }
    }
  }

  private async zipVmfFiles(
    mapName: string,
    version: number,
    files: File[]
  ): Promise<Buffer> {
    const zip = new Zip();
    for (const [i, file] of files.entries()) {
      zip.addFile(
        file.originalname ?? `${mapName}_v${version}_${i}.vmf`,
        file.buffer
      );
    }

    return zip.toBuffer();
  }

  private async uploadMapSubmissionVersionFiles(
    uuid: string,
    bspFile: File,
    vmfZip?: Buffer
  ) {
    const storeFns: Promise<FileStoreFile>[] = [
      this.fileStoreService.storeFile(bspFile.buffer, submissionBspPath(uuid))
    ];

    if (vmfZip)
      storeFns.push(
        this.fileStoreService.storeFile(vmfZip, submissionVmfsPath(uuid))
      );

    return Promise.all(storeFns);
  }

  //#endregion

  //#region Updates

  async updateAsSubmitter(mapID: number, userID: number, dto: UpdateMapDto) {
    throwIfEmpty(dto);

    const map = (await this.db.mMap.findUnique({
      where: { id: mapID },
      include: { submission: true }
    })) as MapWithSubmission;

    if (!map) throw new NotFoundException('Map does not exist');

    if (userID !== map.submitterID)
      throw new ForbiddenException('User is not the map submitter');

    if (!CombinedMapStatuses.IN_SUBMISSION.includes(map.status))
      throw new ForbiddenException('Map can only be editted during submission');

    const { roles } = await this.db.user.findUnique({ where: { id: userID } });

    await this.db.$transaction(async (tx) => {
      const generalUpdate = this.getGeneralMapDataUpdate(map, dto);
      const statusUpdate = await this.mapStatusUpdateHandler(
        tx,
        map,
        dto,
        roles,
        true
      );

      await tx.mMap.update({
        where: { id: mapID },
        data: deepmerge()(generalUpdate, statusUpdate) as Prisma.MMapUpdateInput
      });
    });
  }

  /**
   * Handles updating the map data as admin/moderator/reviewer. All map status
   * changes are done here, so a lot can happen.
   */
  async updateAsAdmin(mapID: number, userID: number, dto: UpdateMapAdminDto) {
    throwIfEmpty(dto);

    const map = (await this.db.mMap.findUnique({
      where: { id: mapID },
      include: { submission: true }
    })) as MapWithSubmission;

    if (!map) {
      throw new NotFoundException('Map does not exist');
    }

    const { roles } = await this.db.user.findUnique({ where: { id: userID } });

    if (!Bitflags.has(roles, CombinedRoles.MOD_OR_ADMIN)) {
      if (Bitflags.has(roles, Role.REVIEWER)) {
        // The *only* things reviewer is allowed is to go from
        // content approval -> public testing or rejected
        if (
          dto.status !== MapStatusNew.PUBLIC_TESTING || // updating to status other public testing
          Object.values(dto).filter((x) => x !== undefined).length !== 1 // anything else on the DTO
        ) {
          throw new ForbiddenException(
            'Reviewer may only change status to PUBLIC_TESTING'
          );
        }
      } else {
        throw new ForbiddenException();
      }
    }

    await this.db.$transaction(async (tx) => {
      const update: Prisma.MMapUpdateInput = {};

      if (dto.submitterID) {
        const newUser = await this.db.user.findUnique({
          where: { id: dto.submitterID }
        });
        if (!newUser)
          throw new BadRequestException('New submitter does not exist');
        if (Bitflags.has(newUser.roles, Role.PLACEHOLDER))
          throw new BadRequestException(
            'New submitter is a placeholder! If you want to take over a map submission, set yourself as submitter.'
          );
        if (Bitflags.has(newUser.bans, Ban.MAP_SUBMISSION))
          throw new BadRequestException(
            'New submitter is banned from map submission'
          );
        update.submitter = { connect: { id: dto.submitterID } };
      }

      const generalChanges = this.getGeneralMapDataUpdate(map, dto);
      const statusChanges = await this.mapStatusUpdateHandler(
        tx,
        map,
        dto,
        roles,
        false
      );

      await tx.mMap.update({
        where: { id: mapID },
        data: deepmerge({ all: true })(
          update,
          generalChanges,
          statusChanges
        ) as Prisma.MMapUpdateInput
      });
    });
  }

  private getGeneralMapDataUpdate(
    map: MapWithSubmission,
    dto: UpdateMapDto | UpdateMapAdminDto
  ): Prisma.MMapUpdateInput {
    const update: Prisma.MMapUpdateInput = {};

    if (dto.name || dto.fileName) {
      this.checkMapFileNames(
        dto.name ?? dto.fileName,
        dto.fileName ?? map.fileName
      );

      update.fileName = dto.fileName;
      update.name = dto.name;
    }

    if (dto.info) {
      update.info = {
        update: {
          description: dto.info.description,
          youtubeID: dto.info.youtubeID,
          creationDate: dto.info.creationDate
        }
      };
    }

    if (dto.placeholders || dto.suggestions) {
      update.submission = {
        update: {
          placeholders: dto.placeholders,
          suggestions: dto.suggestions
        }
      };
    }

    if (dto.tracks) {
      // TODO: Not bothering writing complex DB code for this as the track system is changing so soon.
    }

    return update;
  }

  private async mapStatusUpdateHandler(
    tx: ExtendedPrismaServiceTransaction,
    map: MapWithSubmission,
    dto: UpdateMapDto | UpdateMapAdminDto,
    roles: number,
    isSubmitter: boolean
  ): Promise<Prisma.MMapUpdateInput> {
    const oldStatus = map.status;
    const newStatus = dto.status;

    if (oldStatus === newStatus || newStatus === undefined) {
      return {};
    }

    // Check roles against allowed status changes
    let isChangeAllowed = false;
    for (const allowedRole of MapStatusChangers.find(
      ({ from, to }) => from === oldStatus && to === newStatus
    )?.roles ?? []) {
      if (allowedRole === 'submitter') {
        if (isSubmitter) isChangeAllowed = true;
      } else if (Bitflags.has(roles, allowedRole)) {
        isChangeAllowed = true;
      }
    }

    if (!isChangeAllowed)
      throw new ForbiddenException('Map status change is not allowed');

    // Call functions for specific status changes
    if (
      oldStatus === MapStatusNew.PUBLIC_TESTING &&
      newStatus === MapStatusNew.FINAL_APPROVAL
    ) {
      await this.updateStatusFromPublicToFA(map);
    } else if (
      oldStatus === MapStatusNew.FINAL_APPROVAL &&
      newStatus === MapStatusNew.APPROVED
    ) {
      await this.updateStatusFromFAToApproved(tx, map);
    }

    return {
      status: newStatus,
      submission: {
        update: {
          dates: [
            ...map.submission.dates,
            { status: newStatus, date: new Date().toJSON() }
          ]
        }
      }
    };
  }

  /**
   * Public Testing -> Final Approval
   */
  private async updateStatusFromPublicToFA(map: MapWithSubmission) {
    // If it's met the criteria to go to FA once, allowed to skip these checks
    if (
      map.submission.dates.some(
        (date) => date.status === MapStatusNew.FINAL_APPROVAL
      )
    ) {
      return;
    }
    // Ensure it's been in testing for minimum period,
    // if it's never been to FINAL_APPROVAL before.
    const currentTime = Date.now();
    const latestPubTestDate = map.submission.dates
      .filter((x) => x.status === MapStatusNew.PUBLIC_TESTING)
      .sort(
        ({ date: dateA }, { date: dateB }) =>
          new Date(dateA).getTime() - new Date(dateB).getTime()
      )
      .at(-1)?.date;

    if (!latestPubTestDate) {
      throw new InternalServerErrorException(
        'Map is in PUBLIC_TESTING, but has no enteredPublicTesting value'
      );
    }

    const latestPubTestTime = new Date(latestPubTestDate).getTime();
    if (
      currentTime - latestPubTestTime <
      this.config.getOrThrow('limits.minPublicTestingDuration')
    ) {
      throw new ForbiddenException(
        'Map has not been in public testing for mandatory time period'
      );
    }

    // All reviewer, mod and admin reviews must be resolved
    const reviews = await this.db.mapReview.findMany({
      where: { mapID: map.id, resolved: false },
      include: { reviewer: true }
    });

    for (const review of reviews)
      if ((review.reviewer.roles & CombinedRoles.REVIEWER_AND_ABOVE) !== 0)
        throw new ForbiddenException('Map has unresolved reviews');
  }

  /**
   * Final Approval -> Approved
   */
  private async updateStatusFromFAToApproved(
    tx: ExtendedPrismaServiceTransaction,
    map: MapWithSubmission
  ) {
    // Create placeholder users for all the users the submitter requested
    // Can't use createMany due to nesting (thanks Prisma!!)
    for (const placeholder of map.submission.placeholders ?? []) {
      await tx.user.create({
        data: {
          alias: placeholder.alias,
          roles: Role.PLACEHOLDER,
          mapCredits: {
            create: {
              mmap: { connect: { id: map.id } },
              type: placeholder.type,
              description: placeholder.description
            }
          }
        }
      });
    }

    // Create MAP_APPROVED activities for all authors
    const allCredits = await tx.mapCredit.findMany({
      where: { mapID: map.id, type: MapCreditType.AUTHOR }
    });

    await tx.activity.createMany({
      data: allCredits.map(
        (credit): Prisma.ActivityCreateManyInput => ({
          type: ActivityType.MAP_APPROVED,
          userID: credit.userID,
          data: map.id
        })
      )
    });

    // Copy final MapSubmissionVersion BSP and VMFs to maps/
    const {
      currentVersion: { id: currentVersionID, hash, hasVmf },
      versions
    } = await this.db.mapSubmission.findFirst({
      where: { mapID: map.id },
      include: { currentVersion: true, versions: true }
    });

    const [bspSuccess, vmfSuccess] = await Promise.all([
      this.fileStoreService.copyFile(
        submissionBspPath(currentVersionID),
        approvedBspPath(map.fileName)
      ),
      hasVmf
        ? this.fileStoreService.copyFile(
            submissionVmfsPath(currentVersionID),
            approvedVmfsPath(map.fileName)
          )
        : () => Promise.resolve(true)
    ]);

    if (!bspSuccess)
      throw new InternalServerErrorException(
        `BSP file for map submission version ${currentVersionID} not in object store`
      );
    if (!vmfSuccess)
      throw new InternalServerErrorException(
        `VMF file for map submission version ${currentVersionID} not in object store`
      );

    // Set hash of MMap to final version BSP's hash, and hasVmf is just whether
    // final version had a VMF.
    await tx.mMap.update({ where: { id: map.id }, data: { hash, hasVmf } });

    // Delete all the submission files - these would take up a LOT of space otherwise
    try {
      await this.fileStoreService.deleteFiles(
        versions.flatMap((v) => [
          submissionBspPath(v.id),
          submissionVmfsPath(v.id)
        ])
      );
    } catch (error) {
      error.message = `Failed to delete map submission version file for ${map.fileName}: ${error.message}`;
      throw new InternalServerErrorException(error);
    }

    // TODO: Soon we'll have some leaderboards stuff on DTO, handle those.
  }

  //#endregion

  //#region Deletions

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
    await this.fileStoreService.deleteFile(approvedBspPath(map.fileName));

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

    return DtoFactory(MapInfoDto, map.info);
  }

  //#endregion

  //#region Zones

  async getZones(mapID: number): Promise<MapZones> {
    const mapWithZones = await this.db.mMap.findUnique({
      where: { id: mapID },
      select: { zones: true }
    });

    if (!mapWithZones || mapWithZones.zones)
      throw new NotFoundException('Map not found');

    return mapWithZones.zones as MapZones;
  }

  //#endregion

  //#region Utils

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
      // - Reviewer
      case MapStatusNew.CONTENT_APPROVAL:
      case MapStatusNew.FINAL_APPROVAL: {
        if (
          map.submitterID === userID ||
          Bitflags.has(user.roles, CombinedRoles.REVIEWER_AND_ABOVE)
        )
          return map;

        break;
      }
      // DISABLED, only allow:
      // - Moderator/Admin
      case MapStatusNew.DISABLED: {
        if (Bitflags.has(user.roles, CombinedRoles.MOD_OR_ADMIN)) return map;
        break;
      }
    }

    throw new ForbiddenException('User not authorized to access map data');
  }

  checkMapFileNames(name: string, fileName: string) {
    // Simple checks that the name on the DTO and the uploaded File match up,
    // and a length check. All instances of `fileName` will have passed an
    // IsMapName validator so is only be alphanumeric, dashes and underscores.
    if (name.length < 3 || fileName.length < 3)
      throw new BadRequestException('Name/Filename is too short (< 3)');

    if (!fileName.includes(name))
      throw new BadRequestException("Filename must contain the map's name");
  }

  //#endregion
}
