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
  LeaderboardRun,
  MapCredit,
  MapSubmission,
  MMap,
  Prisma
} from '@prisma/client';
import {
  ActivityType,
  AdminActivityType,
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
  MapSubmissionSuggestion,
  MapTestingRequestState,
  MapZones,
  NotificationType,
  Role,
  submissionBspPath,
  submissionVmfsPath,
  TrackType
} from '@momentum/constants';
import { Bitflags } from '@momentum/bitflags';
import {
  expandToIncludes,
  intersection,
  isEmpty,
  parallel
} from '@momentum/util-fn';
import { File } from '@nest-lab/fastify-multer';
import { vdf } from 'fast-vdf';
import Zip from 'adm-zip';
import { ConfigService } from '@nestjs/config';
import { JsonValue, MergeExclusive, OverrideProperties } from 'type-fest';
import { deepmerge } from '@fastify/deepmerge';
import {
  SuggestionType,
  SuggestionValidationError,
  validateSuggestions,
  validateZoneFile,
  ZoneValidationError
} from '@momentum/formats/zone';
import { AdminActivityService } from '../admin/admin-activity.service';
import { FileStoreFile } from '../filestore/file-store.interface';
import {
  ExtendedPrismaService,
  ExtendedPrismaServiceTransaction
} from '../database/prisma.extension';
import { EXTENDED_PRISMA_SERVICE } from '../database/db.constants';
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
  MapZonesDto,
  PagedResponseDto,
  UpdateMapAdminDto,
  UpdateMapDto
} from '../../dto';
import { FileStoreService } from '../filestore/file-store.service';
import { LeaderboardRunsService } from '../runs/leaderboard-runs.service';
import { MapTestingRequestService } from './map-testing-request.service';
import { MapImageService } from './map-image.service';
import {
  LeaderboardHandler,
  LeaderboardProps
} from './leaderboard-handler.util';
import { BspHeader, BspReadError } from '@momentum/formats/bsp';
import { MapReviewService } from '../map-review/map-review.service';

@Injectable()
export class MapsService {
  constructor(
    @Inject(EXTENDED_PRISMA_SERVICE) private readonly db: ExtendedPrismaService,
    private readonly config: ConfigService,
    private readonly fileStoreService: FileStoreService,
    @Inject(forwardRef(() => LeaderboardRunsService))
    private readonly leaderboardRunService: LeaderboardRunsService,
    @Inject(forwardRef(() => MapImageService))
    private readonly mapImageService: MapImageService,
    @Inject(forwardRef(() => MapTestingRequestService))
    private readonly mapTestingRequestService: MapTestingRequestService,
    @Inject(forwardRef(() => MapReviewService))
    private readonly mapReviewService: MapReviewService,
    private readonly adminActivityService: AdminActivityService
  ) {}

  private readonly baseMapsSelect: Prisma.MMapSelect = {
    id: true,
    name: true,
    fileName: true,
    status: true,
    hash: true,
    hasVmf: true,
    createdAt: true,
    updatedAt: true,
    submitterID: true,
    thumbnailID: true
  };

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
    if (query.fileName) where.fileName = { startsWith: query.fileName };
    if (query.submitterID) where.submitterID = query.submitterID;
    if (query instanceof MapsGetAllQueryDto) {
      // /maps only returns approved maps
      where.status = MapStatusNew.APPROVED;

      const leaderboardSome: Prisma.LeaderboardWhereInput = {
        // These extra params allow apply to main tracks for now - I'm not sure
        // what future stage/bonus-specific searches will behave so not sure
        // exactly how to implement
        trackType: TrackType.MAIN
      };

      if (query.gamemode) {
        leaderboardSome.gamemode = query.gamemode;
      }

      if (query.difficultyHigh && query.difficultyLow) {
        leaderboardSome.tier = {
          lt: query.difficultyHigh,
          gt: query.difficultyLow
        };
      } else if (query.difficultyLow) {
        leaderboardSome.tier = { gt: query.difficultyLow };
      } else if (query.difficultyHigh) {
        leaderboardSome.tier = { lt: query.difficultyHigh };
      }

      if (typeof query.linear === 'boolean') {
        leaderboardSome.linear = query.linear;
      }

      // Starts with 1 key so check g.t.
      if (Object.keys(leaderboardSome).length > 1) {
        where.leaderboards = { some: leaderboardSome };
      }
    } else if (
      query instanceof MapsGetAllSubmissionQueryDto ||
      query instanceof MapsGetAllSubmissionAdminQueryDto
    ) {
      const user = await this.db.user.findUnique({
        where: { id: userID },
        select: { roles: true }
      });

      const roles = user?.roles;

      if (roles == null) throw new BadRequestException();

      // Logic here is a nightmare, for a breakdown of permissions see
      // MapsService.getMapAndCheckReadAccess.
      const filter = query.filter;
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
          where.AND = {
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
            },
            {
              AND: {
                status: MapStatusNew.CONTENT_APPROVAL,
                submitterID: userID
              }
            },
            {
              AND: {
                status: MapStatusNew.FINAL_APPROVAL,
                submitterID: userID
              }
            },
            {
              AND: {
                status: MapStatusNew.DISABLED,
                submitterID: userID
              }
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
      {
        only: ['currentVersion', 'versions'],
        mappings: [
          {
            expand: 'versions',
            model: 'versions',
            value: {
              select: {
                hash: true,
                hasVmf: true,
                versionNum: true,
                id: true,
                createdAt: true,
                // Changelog and zones are quite large structures so not worth
                // ever including on the paginated query - make clients query
                // for a specific submission if they want all that stuff
                zones: false,
                changelog: false
              }
            }
          }
        ]
      }
    );

    // Select (and include)
    const select: Prisma.MMapSelect = {
      ...this.baseMapsSelect,
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
      this.handleMapGetIncludes(select, incPB, incWR, userID);
    }

    const dbResponse = await this.db.mMap.findManyAndCount({
      where,
      select,
      orderBy: { createdAt: 'desc' },
      skip: query.skip,
      take: query.take
    });

    if (incPB || incWR) {
      for (const map of dbResponse[0] as MMap[])
        this.handleMapGetPrismaResponse(map, userID, incPB, incWR);
    }

    return new PagedResponseDto(MapDto, dbResponse);
  }

  async get(
    mapID: number | string,
    userID?: number,
    expand?: MapsGetExpand
  ): Promise<MapDto> {
    const select: Prisma.MMapSelect = {
      ...this.baseMapsSelect,
      ...expandToIncludes(expand, {
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

    const submissionIncludes: Prisma.MapSubmissionInclude = expandToIncludes(
      expand,
      { only: ['currentVersion', 'versions'] }
    );

    if (!isEmpty(submissionIncludes)) {
      select.submission = { include: submissionIncludes };
    }

    const incPB = expand?.includes('personalBest');
    const incWR = expand?.includes('worldRecord');

    this.handleMapGetIncludes(select, incPB, incWR, userID);

    const map = await this.getMapAndCheckReadAccess({ mapID, userID, select });

    if (incPB || incWR) {
      this.handleMapGetPrismaResponse(map, userID, incPB, incWR);
    }

    return DtoFactory(MapDto, map);
  }

  // Weird name I know, but we're doing include stuff, which are subsets of selects
  private handleMapGetIncludes(
    select: Prisma.MMapSelect,
    PB: boolean,
    WR: boolean,
    userID?: number
  ): void {
    if (!(PB || WR)) return;

    select.leaderboardRuns = { include: { user: true } };
    if (PB && WR) {
      select.leaderboardRuns.where = {
        AND: [
          { trackType: TrackType.MAIN },
          { OR: [{ userID: userID }, { rank: 1 }] }
        ]
      };
    } else if (PB) {
      select.leaderboardRuns.where = {
        trackType: TrackType.MAIN, // Probs fastest to omit trackNum here (can't be != 0)
        style: 0,
        userID: userID
      };
    } else {
      select.leaderboardRuns.where = {
        trackType: TrackType.MAIN,
        style: 0,
        rank: 1
      };
    }
  }

  private handleMapGetPrismaResponse(
    mapObj: MMap & {
      worldRecords?: LeaderboardRun[];
      personalBests?: LeaderboardRun[];
      leaderboardRuns?: LeaderboardRun[];
    },
    userID: number,
    PB: boolean,
    WR: boolean
  ): void {
    if (PB && WR) {
      // Annoying to have to do this but we don't know what's what
      mapObj.worldRecords = mapObj.leaderboardRuns.filter((r) => r.rank === 1);
      mapObj.personalBests = mapObj.leaderboardRuns.filter(
        (r) => r.userID === userID
      );
    } else if (PB) {
      mapObj.personalBests = mapObj.leaderboardRuns;
    } else {
      mapObj.worldRecords = mapObj.leaderboardRuns;
    }

    delete mapObj.leaderboardRuns;
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

    await this.checkMapCompression(bspFile);

    this.checkMapFiles(dto.fileName, bspFile, vmfFiles);
    this.checkMapFileNames(dto.name, dto.fileName);

    this.checkSuggestionsAndZones(dto.suggestions, dto.zones);

    const hasVmf = vmfFiles?.length > 0;
    const bspHash = FileStoreService.getHashForBuffer(bspFile.buffer);

    return this.db.$transaction(async (tx) => {
      const map = await this.createMapDbEntry(tx, dto, userID, bspHash, hasVmf);

      await tx.leaderboard.createMany({
        data: LeaderboardHandler.getMaximalLeaderboards(
          dto.suggestions.map(({ gamemode, trackType, trackNum }) => ({
            gamemode,
            trackType,
            trackNum
          })),
          dto.zones
        ).map((obj) => ({
          mapID: map.id,
          ...obj,
          style: 0, // When we add styles support getMaximalLeaderboards should generate all variations of this
          ranked: false
        }))
      });

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
      include: {
        submission: { include: { currentVersion: true, versions: true } }
      }
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

    await this.checkMapCompression(bspFile);

    this.checkMapFiles(map.fileName, bspFile, vmfFiles);

    const hasVmf = vmfFiles?.length > 0;
    const bspHash = FileStoreService.getHashForBuffer(bspFile.buffer);

    let zones: MapZones;
    if (dto.zones) {
      this.checkZones(dto.zones);
      zones = dto.zones;
    } else {
      zones = map.submission.currentVersion.zones as unknown as MapZones; // TODO: #855
    }

    const oldVersion = map.submission.currentVersion;
    const newVersionNum = oldVersion.versionNum + 1;

    await this.db.$transaction(async (tx) => {
      const newVersion = await tx.mapSubmissionVersion.create({
        data: {
          versionNum: newVersionNum,
          hasVmf,
          zones: zones as unknown as JsonValue, // TODO: #855
          hash: bspHash,
          changelog: dto.changelog,
          submission: { connect: { mapID } }
        }
      });

      await this.generateSubmissionLeaderboards(
        tx,
        mapID,
        map.submission.suggestions as unknown as MapSubmissionSuggestion[], // TODO: #855
        zones
      );

      await parallel(
        async () => {
          const zippedVmf = hasVmf
            ? await this.zipVmfFiles(map.fileName, newVersionNum, vmfFiles)
            : undefined;

          await this.uploadMapSubmissionVersionFiles(
            newVersion.id,
            bspFile,
            zippedVmf
          );
        },

        tx.mapSubmission.update({
          where: { mapID },
          data: { currentVersion: { connect: { id: newVersion.id } } }
        })
      );
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

    if (!(dto.credits?.length > 0 || dto.placeholders?.length > 0)) {
      throw new BadRequestException(
        'Submission must a least one credit or placeholder'
      );
    }
  }

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
            versions: {
              create: {
                versionNum: 1,
                hash: bspHash,
                hasVmf,
                zones: createMapDto.zones as unknown as JsonValue // TODO: #855
              }
            },
            dates: [{ status, date: new Date().toJSON() }]
          }
        },
        stats: { create: {} },
        status,
        info: {
          create: {
            description: createMapDto.info.description,
            creationDate: createMapDto.info.creationDate,
            youtubeID: createMapDto.info.youtubeID
          }
        },
        credits:
          createMapDto.credits?.length > 0
            ? {
                createMany: {
                  data: createMapDto.credits?.map((credit) => ({
                    type: credit.type,
                    userID: credit.userID,
                    description: credit.description
                  }))
                }
              }
            : undefined
      },
      select: {
        id: true,
        zones: true,
        submission: { select: { versions: true } }
      }
    });

    const map = await tx.mMap.update({
      where: { id: initialMap.id },
      data: {
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
        credits: true
      }
    });

    return tx.mMap.findUnique({
      where: { id: map.id },
      include: {
        info: true,
        stats: true,
        submission: { include: { currentVersion: true, versions: true } },
        submitter: true,
        images: true,
        thumbnail: true,
        credits: { include: { user: true } }
      }
    });
  }

  /**
   * Creates new and updates and deletes existing leaderboards for whenever
   * map submissions change
   */
  private async generateSubmissionLeaderboards(
    tx: ExtendedPrismaServiceTransaction,
    mapID: number,
    suggestions: MapSubmissionSuggestion[],
    zones: MapZones
  ): Promise<void> {
    const existingLeaderboards: LeaderboardProps[] =
      await this.db.leaderboard.findMany({
        where: { mapID },
        select: { gamemode: true, trackNum: true, trackType: true }
      });

    const desiredLeaderboards = LeaderboardHandler.getMaximalLeaderboards(
      suggestions as unknown as LeaderboardProps[], // TODO: #855
      zones
    );

    const toCreate = desiredLeaderboards.filter(
      (x) => !existingLeaderboards.some((y) => LeaderboardHandler.isEqual(x, y))
    );
    const toUpdate = desiredLeaderboards.filter((x) =>
      existingLeaderboards.some((y) => LeaderboardHandler.isEqual(x, y))
    );
    const toDelete = existingLeaderboards.filter(
      (x) => !desiredLeaderboards.some((y) => LeaderboardHandler.isEqual(x, y))
    );

    if (toCreate.length > 0)
      await tx.leaderboard.createMany({
        data: toCreate.map((obj) => ({
          mapID,
          ...obj,
          style: 0, // TODO: Styles
          ranked: false
        }))
      });

    // Rare that this actual happens, currently just in case inLinear changes
    if (toUpdate.length > 0)
      for (const { gamemode, trackType, trackNum, linear } of toUpdate) {
        // updateMany rather than update (and deleteMany below) ensures this
        // handles styles in the future
        await tx.leaderboard.updateMany({
          where: { mapID, gamemode, trackType, trackNum },
          data: { linear }
        });
      }

    if (toDelete.length > 0)
      for (const { gamemode, trackType, trackNum } of toDelete) {
        await tx.leaderboard.deleteMany({
          where: { mapID, gamemode, trackType, trackNum }
        });
      }
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
    if (isEmpty(dto)) {
      throw new BadRequestException('Empty body');
    }
    const map = (await this.db.mMap.findUnique({
      where: { id: mapID },
      include: { submission: true }
    })) as MapWithSubmission;

    if (!map) throw new NotFoundException('Map does not exist');

    if (userID !== map.submitterID)
      throw new ForbiddenException('User is not the map submitter');

    if (!CombinedMapStatuses.IN_SUBMISSION.includes(map.status))
      throw new ForbiddenException('Map can only be edited during submission');

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

      const mapDB = await this.db.mapSubmission.findUnique({
        where: { mapID: map.id },
        include: { currentVersion: true }
      });

      if (dto.suggestions) {
        const zones = mapDB.currentVersion.zones as unknown as MapZones; // TODO: #855
        try {
          validateSuggestions(
            dto.suggestions,
            zones,
            SuggestionType.SUBMISSION
          );
        } catch (error) {
          if (error instanceof SuggestionValidationError) {
            throw new BadRequestException(
              `Invalid suggestions: ${error.message}`
            );
          } else {
            throw error;
          }
        }

        // It's very uncommon we actually need to do this, but someone *could*
        // change their suggestions from one mode to another *incompatible mode),
        // so leaderboards would change. Usually there won't be any changes
        // required though.
        await this.generateSubmissionLeaderboards(
          tx,
          map.id,
          dto.suggestions,
          zones
        );
      }

      if (dto.resetLeaderboards === true) {
        // If it's been approved before, deleting runs is a majorly destructive
        // action that we probably don't want to allow the submitter to do.
        // If the submitter is fixing the maps in a significant enough way to
        // still require a leaderboard reset, they should just get an admin to
        // do it.
        if (
          map.submission.dates.some(
            (date) => date.status === MapStatusNew.APPROVED
          )
        ) {
          throw new ForbiddenException(
            'Cannot reset leaderboards on a previously approved map.' +
              ' Talk about it with an admin!'
          );
        }

        await tx.leaderboardRun.deleteMany({ where: { mapID: map.id } });
      }
    });
  }

  /**
   * Handles updating the map data as admin/moderator/reviewer. All map status
   * changes are done here, so a lot can happen.
   */
  async updateAsAdmin(mapID: number, userID: number, dto: UpdateMapAdminDto) {
    if (isEmpty(dto)) {
      throw new BadRequestException('Empty body');
    }
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

      const updatedMap = await tx.mMap.update({
        where: { id: mapID },
        data: deepmerge({ all: true })(
          update,
          generalChanges,
          statusChanges
        ) as Prisma.MMapUpdateInput
      });

      await this.adminActivityService.create(
        userID,
        AdminActivityType.MAP_UPDATE,
        mapID,
        updatedMap,
        map
      );
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
      await this.updateStatusFromFAToApproved(tx, map, dto);
    } else if (
      oldStatus === MapStatusNew.PRIVATE_TESTING &&
      newStatus !== MapStatusNew.PRIVATE_TESTING
    ) {
      await this.updateStatusFromPrivate(tx, map);
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
    map: MapWithSubmission,
    dto: UpdateMapAdminDto
  ) {
    // Check we don't have any unresolved reviews. Even admins shouldn't be able
    // to bypass this, if needed they can just go in and resolve those reviews!
    const reviews = await tx.mapReview.findMany({ where: { mapID: map.id } });
    if (reviews.some((review) => review.resolved === false)) {
      throw new BadRequestException('Map has unresolved reviews!');
    }

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
      currentVersion: { id: currentVersionID, hash, hasVmf, zones: dbZones },
      versions
    } = await this.db.mapSubmission.findFirst({
      where: { mapID: map.id },
      include: { currentVersion: true, versions: true }
    });
    const zones = dbZones as unknown as MapZones; // TODO: #855

    const [bspSuccess, vmfSuccess] = await parallel(
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
    );

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
    await tx.mMap.update({
      where: { id: map.id },
      data: { hash, hasVmf, zones: dbZones } // TODO: e2e test zoines
    });

    // Delete all the submission files - these would take up a LOT of space otherwise
    await parallel(
      this.fileStoreService
        .deleteFiles(
          versions.flatMap((v) => [
            submissionBspPath(v.id),
            submissionVmfsPath(v.id)
          ])
        )
        .catch((error) => {
          error.message = `Failed to delete map submission version file for ${map.fileName}: ${error.message}`;
          throw new InternalServerErrorException(error);
        }),
      this.mapReviewService
        .deleteAllReviewAssetsForMap(map.id)
        .catch((error) => {
          error.message = `Failed to delete map review files for ${map.fileName}: ${error.message}`;
          throw new InternalServerErrorException(error);
        })
    );

    // Is it getting approved for first time?
    if (
      !map.submission.dates.some(
        (date) => date.status === MapStatusNew.APPROVED
      )
    ) {
      if (!dto.finalLeaderboards || dto.finalLeaderboards.length === 0)
        throw new BadRequestException('Missing finalized leaderboards');

      // Shouldn't be possible that zones are invalid but doesn't hurt to
      // re-check
      this.checkSuggestionsAndZones(dto.finalLeaderboards, zones);

      // Leaderboards always get wiped, easiest to just delete and remake, let
      // Postgres cascade delete all leaderboardRuns (pastRuns can stay)
      await tx.leaderboard.deleteMany({ where: { mapID: map.id } });

      // Okay, got a clean slate, make new leaderboards from finalLeaderboards
      await tx.leaderboard.createMany({
        data: [
          ...LeaderboardHandler.getStageLeaderboards(
            dto.finalLeaderboards,
            zones
          ),
          ...LeaderboardHandler.setLeaderboardLinearity(
            dto.finalLeaderboards,
            zones
          )
        ].map((lb) => ({ ...lb, mapID: map.id, style: 0 }))
      });
    }

    // If the map has previously been approved, it must have then been disabled,
    // by an admin, and moved back into submission pipeline, so that the
    // submitter can modify it. So, we have leaderboards already, which admins
    // can manipulate via separate endpoints. So we don't need to do much, just
    // check the zones are still good and let it go back to APPROVED,
    // effectively re-enabling those leaderboards.
    else {
      if (dto.finalLeaderboards)
        throw new BadRequestException(
          'This map has previously been approved, ' +
            'leaderboards should be changed individually'
        );

      this.checkZones(zones);
    }
  }
  /**
   * Private Testing -> Anything Else
   */
  private async updateStatusFromPrivate(
    tx: ExtendedPrismaServiceTransaction,
    map: MapWithSubmission
  ) {
    await tx.mapTestingRequest.deleteMany({
      where: { mapID: map.id, state: MapTestingRequestState.UNREAD }
    });
    await tx.notification.deleteMany({
      where: { type: NotificationType.MAP_TESTING_REQUEST, mapID: map.id }
    });
  }

  //#endregion

  //#region Deletions

  async delete(mapID: number, adminID?: number): Promise<void> {
    const map = await this.db.mMap.findUnique({ where: { id: mapID } });

    if (!map) throw new NotFoundException('No map found');

    // Delete all stored map images
    const images = await this.db.mapImage.findMany({ where: { mapID } });
    await Promise.all(
      images.map((img) => this.mapImageService.deleteStoredMapImage(img.id))
    );

    // Delete all run files
    await this.leaderboardRunService.deleteStoredMapRuns(mapID);

    // Delete stored map file
    await this.fileStoreService.deleteFile(approvedBspPath(map.fileName));

    await this.db.mMap.delete({ where: { id: mapID } });

    if (adminID) {
      await this.adminActivityService.create(
        adminID,
        AdminActivityType.MAP_DELETE,
        mapID,
        {},
        map
      );
    }
  }

  //#endregion

  //#region Info

  async getInfo(mapID: number, userID: number): Promise<MapInfoDto> {
    // Checks need to fetch map anyway and we have no includes on mapInfo, so
    // may as well just have this function include mapInfo and pull that off the
    // return value.
    const map = await this.getMapAndCheckReadAccess({
      mapID,
      userID,
      include: { info: true }
    });

    return DtoFactory(MapInfoDto, map.info);
  }

  //#endregion

  //#region Zones

  async getZones(mapID: number): Promise<MapZonesDto> {
    const mapWithZones = await this.db.mMap.findUnique({
      where: { id: mapID },
      select: { zones: true }
    });

    if (!mapWithZones || !mapWithZones.zones)
      throw new NotFoundException('Map not found');

    return DtoFactory(
      MapZonesDto,
      mapWithZones.zones as Record<string, unknown>
    );
  }

  //#endregion

  //#region Utils

  /**
   * Perform various checks based on map status to determine if the user has
   * permission to access this data.
   *
   * Always requires query for the specified map, to save calling DB twice we
   * return that object, so we let you pass in a select/include so this method
   * can do the desired fetch for you - hence the types having to be a little
   * insane.
   *
   * If `submissionOnly: true` is given, throws if map is not in submission,
   * except for mods and admins
   *
   * @throws ForbiddenException
   */
  async getMapAndCheckReadAccess<
    M extends MMap,
    S extends Prisma.MMapSelect,
    I extends Prisma.MMapInclude
  >(
    args: { userID: number; submissionOnly?: boolean } & MergeExclusive<
      { map: M },
      { mapID: number | string } & MergeExclusive<
        { select?: S },
        { include?: I }
      >
    >
  ): Promise<typeof args extends { map: M } ? M : GetMMapUnique<S, I>> {
    const map =
      args.map ??
      (await this.db.mMap.findUnique({
        where:
          typeof args.mapID == 'number'
            ? { id: args.mapID }
            : { name: args.mapID },
        include: args.include,
        select: args.select
      }));

    if (!map) {
      throw new NotFoundException('Map does not exist');
    }

    const mapID = map.id;

    if (map.status === undefined) {
      throw new InternalServerErrorException('Invalid map data');
    }

    // If APPROVED/PUBLIC_TESTING, anyone can access.
    if (
      (map.status === MapStatusNew.APPROVED && !args?.submissionOnly) ||
      map.status === MapStatusNew.PUBLIC_TESTING
    ) {
      return map as GetMMapUnique<S, I>;
    }

    // For any other state, we need to know roles
    const user = await this.db.user.findUnique({ where: { id: args.userID } });

    switch (map.status) {
      // APPROVED, always allow unless:
      // - submissionOnly is true, and not mod/admin
      case MapStatusNew.APPROVED: {
        if (
          !args?.submissionOnly ||
          Bitflags.has(user.roles, CombinedRoles.MOD_OR_ADMIN)
        )
          return map as GetMMapUnique<S, I>;

        break;
      }
      // PRIVATE_TESTING, only allow:
      // - The submitter
      // - Moderator/Admin
      // - in the credits
      // - Has an accepted MapTestingRequest
      case MapStatusNew.PRIVATE_TESTING: {
        if (
          map.submitterID === args.userID ||
          Bitflags.has(user.roles, CombinedRoles.MOD_OR_ADMIN)
        )
          return map as GetMMapUnique<S, I>;

        if (
          await this.db.mapTestingRequest.exists({
            where: {
              mapID,
              userID: args.userID,
              state: MapTestingRequestState.ACCEPTED
            }
          })
        )
          return map as GetMMapUnique<S, I>;

        if (
          await this.db.mapCredit.exists({
            where: { mapID, userID: args.userID }
          })
        )
          return map as GetMMapUnique<S, I>;

        break;
      }
      // CONTENT_APPROVAL/FINAL_APPROVAL, only allow:
      // - The submitter
      // - Moderator/Admin
      // - Reviewer
      case MapStatusNew.CONTENT_APPROVAL:
      case MapStatusNew.FINAL_APPROVAL: {
        if (
          map.submitterID === args.userID ||
          Bitflags.has(user.roles, CombinedRoles.REVIEWER_AND_ABOVE)
        )
          return map as GetMMapUnique<S, I>;

        break;
      }
      // DISABLED, only allow:
      // - Moderator/Admin
      case MapStatusNew.DISABLED: {
        if (Bitflags.has(user.roles, CombinedRoles.MOD_OR_ADMIN))
          return map as GetMMapUnique<S, I>;
        break;
      }
    }

    throw new ForbiddenException('User not authorized to access map data');
  }

  /**
   *  Simple checks that the name on the DTO and the uploaded File match up,
   *  and a length check. All instances of `fileName` will have already passed
   *  an IsMapName validator so is only be alphanumeric, dashes and underscores.
   *  @throws BadRequestException
   */
  checkMapFileNames(name: string, fileName: string) {
    // Simple checks that the name on the DTO and the uploaded File match up,
    // and a length check. All instances of `fileName` will have passed an
    // IsMapName validator so is only be alphanumeric, dashes and underscores.
    if (name.length < 3 || fileName.length < 3)
      throw new BadRequestException('Name/Filename is too short (< 3)');

    if (!fileName.includes(name))
      throw new BadRequestException("Filename must contain the map's name");
  }

  /**
   * Validate both suggestion and zone validation, throw if either fails
   * @throws BadRequestException
   */
  checkZones(zones: MapZones) {
    try {
      validateZoneFile(zones);
    } catch (error) {
      if (error instanceof ZoneValidationError) {
        throw new BadRequestException(`Invalid zone file: ${error.message}`);
      } else {
        throw error;
      }
    }
  }

  /**
   * Validate both suggestion and zone validation, throw if either fails
   * @throws BadRequestException
   */
  checkSuggestionsAndZones(
    suggestions: MapSubmissionSuggestion[],
    zones: MapZones
  ) {
    try {
      validateZoneFile(zones);
      validateSuggestions(suggestions, zones, SuggestionType.SUBMISSION);
    } catch (error) {
      if (error instanceof ZoneValidationError) {
        throw new BadRequestException(`Invalid zone files: ${error.message}`);
      } else if (error instanceof SuggestionValidationError) {
        throw new BadRequestException(`Invalid suggestions: ${error.message}`);
      } else {
        throw error;
      }
    }
  }

  /**
   * Check if provided bsp file was compressed with bspzip
   * @throws BadRequestException
   */
  async checkMapCompression(bspFile: File) {
    const header = await BspHeader.fromBlob(new Blob([bspFile.buffer])).catch(
      (error) => {
        throw new BadRequestException(
          error instanceof BspReadError
            ? error.message
            : 'Unknown error reading BSP file'
        );
      }
    );

    if (!header.isCompressed())
      throw new BadRequestException('BSP is not compressed');
  }

  //#endregion
}

type MapWithSubmission = MMap & {
  submission: OverrideProperties<
    MapSubmission,
    {
      dates: MapSubmissionDate[];
      placeholders: MapSubmissionPlaceholder[];
    }
  >;
};

type GetMMapUnique<S, I> = Prisma.Result<
  ExtendedPrismaService['mMap'],
  { select: S; include: I },
  'findUnique'
>;
