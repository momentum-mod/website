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
  MapInfo,
  MapSubmission,
  MapVersion,
  MMap,
  Prisma,
  User
} from '@momentum/db';
import {
  ActivityType,
  AdminActivityType,
  Ban,
  bspPath,
  MapStatuses,
  CombinedRoles,
  FlatMapList,
  LeaderboardType,
  MapCreditType,
  MapsGetExpand,
  MapStatus,
  MapStatusChangeRules,
  MapSubmissionApproval,
  MapSubmissionDate,
  MapSubmissionPlaceholder,
  MapSubmissionSuggestion,
  MapTestInviteState,
  MapZones,
  NotificationType,
  Role,
  TrackType,
  vmfsPath,
  MAX_OPEN_MAP_SUBMISSIONS,
  runPath,
  MapTag,
  TagQualifier,
  MAX_MAPPER_OPEN_MAP_SUBMISSIONS
} from '@momentum/constants';
import * as Bitflags from '@momentum/bitflags';
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
import { Merge, MergeExclusive } from 'type-fest';
import { deepmerge } from '@fastify/deepmerge';
import {
  SuggestionType,
  SuggestionValidationError,
  validateSuggestions,
  validateZoneFile,
  ZoneValidationError
} from '@momentum/formats/zone';
import { BspHeader, BspReadError } from '@momentum/formats/bsp';
import { AdminActivityService } from '../admin/admin-activity.service';
import { FileStoreFile } from '../filestore/file-store.interface';
import {
  ExtendedPrismaService,
  ExtendedPrismaServiceTransaction
} from '../database/prisma.extension';
import { EXTENDED_PRISMA_SERVICE } from '../database/db.constants';
import {
  CreateMapDto,
  CreateMapVersionDto,
  DtoFactory,
  MapDto,
  MapInfoDto,
  MapsGetAllAdminQueryDto,
  MapsGetAllQueryDto,
  MapsGetAllSubmissionQueryDto,
  MapsGetAllUserSubmissionQueryDto,
  MapSummaryDto,
  PagedResponseDto,
  UpdateMapDto
} from '../../dto';
import { FileStoreService } from '../filestore/file-store.service';
import { MapTestInviteService } from './map-test-invite.service';
import { MapImageService } from './map-image.service';
import * as LeaderboardHandler from './leaderboard-handler.util';
import { MapListService } from './map-list.service';
import { MapReviewService } from '../map-review/map-review.service';
import { createHash, randomUUID } from 'node:crypto';
import { MapDiscordNotifications } from './map-discord-notifications.service';
import { MapSortTypeOrder } from './query-utils/map-sort-type-orderby';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class MapsService {
  constructor(
    @Inject(EXTENDED_PRISMA_SERVICE) private readonly db: ExtendedPrismaService,
    private readonly config: ConfigService,
    private readonly fileStoreService: FileStoreService,
    @Inject(forwardRef(() => MapImageService))
    private readonly mapImageService: MapImageService,
    @Inject(forwardRef(() => MapTestInviteService))
    private readonly mapTestInviteService: MapTestInviteService,
    @Inject(forwardRef(() => MapReviewService))
    private readonly mapReviewService: MapReviewService,
    private readonly adminActivityService: AdminActivityService,
    private readonly mapListService: MapListService,
    private readonly discordNotificationService: MapDiscordNotifications,
    private readonly notificationService: NotificationsService
  ) {}

  //#region Gets

  // TODO: This method has become absurdly complex. It should be split up in
  // some places, but we should also consider potential ways to design the API
  // better so this insanity is avoidable.
  async getAll(
    query:
      | MapsGetAllQueryDto
      | MapsGetAllAdminQueryDto
      | MapsGetAllSubmissionQueryDto
      | MapsGetAllUserSubmissionQueryDto,
    userID?: number
  ): Promise<PagedResponseDto<MapDto>> {
    // Handle base query options.

    let take: number | undefined = query.take;

    // Default ordering is most recently created submission,
    // as not all maps are approved.
    // Changing to info: { creationDate: 'desc' }
    // would require a LOT of changes to tests and testutils.
    const orderBy: Prisma.MMapOrderByWithRelationInput =
      query.sortType != null
        ? MapSortTypeOrder.get(query.sortType)
        : {
            createdAt: 'desc'
          };

    const where: Prisma.MMapWhereInput = {};
    if (query.search) where.name = { contains: query.search };
    if (query.searchStartsWith)
      where.name = { startsWith: query.searchStartsWith };
    if (
      query.submitterID &&
      !(query instanceof MapsGetAllUserSubmissionQueryDto)
    )
      where.submitterID = query.submitterID;
    if (query.creditID != null || query.creditType != null) {
      if (query.creditID == null || query.creditType == null) {
        throw new BadRequestException(
          'creditID and creditType must both be or not be present in query'
        );
      }
      where.credits = {
        some: { userID: query.creditID, type: query.creditType }
      };
    }

    // Handle query variants.
    if (query instanceof MapsGetAllQueryDto) {
      // /maps only returns approved maps
      where.status = MapStatus.APPROVED;

      const leaderboardSome: Prisma.LeaderboardWhereInput = {
        // These extra params allow apply to main tracks for now - I'm not sure
        // what future stage/bonus-specific searches will behave so not sure
        // exactly how to implement
        trackType: TrackType.MAIN
        // NOT field is used by tagsWithQualifiers filter.
      };

      // Gamemode 0 doesn't exist, so non-zero check makes sense here
      if (query.gamemode) {
        leaderboardSome.gamemode = query.gamemode;
        leaderboardSome.type = { not: LeaderboardType.HIDDEN };
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

      if (query.linear != null) {
        leaderboardSome.linear = query.linear;
      }

      if (query.favorite != null) {
        if (!userID)
          throw new ForbiddenException(
            'favorite param is invalid without a login'
          );
        where.favorites = { [query.favorite ? 'some' : 'none']: { userID } };
      }

      if (query.PB != null) {
        if (!userID)
          throw new ForbiddenException('PB param is invalid without a login');
        const quantifier = query.PB ? 'some' : 'none';
        where.leaderboardRuns = { [quantifier]: { userID } };
        if (query.gamemode) {
          where.leaderboardRuns[quantifier].gamemode = query.gamemode;
        }
      }

      if (query.leaderboardType != null) {
        if (!query.gamemode) {
          throw new BadRequestException(
            'leaderboardType query can only be used together with a specific gamemode'
          );
        }
        leaderboardSome.type = query.leaderboardType;
      }

      if (query.tagsWithQualifiers?.length > 0) {
        if (!query.gamemode) {
          throw new BadRequestException(
            'tags query can only be used together with a specific gamemode'
          );
        }

        const includeTags: MapTag[] = [];
        const excludeTags: MapTag[] = [];
        for (const elemStr of query.tagsWithQualifiers) {
          const [tag, qualifier] = elemStr.split(';').map((v) => parseInt(v));
          if (qualifier === TagQualifier.INCLUDE) includeTags.push(tag);
          else excludeTags.push(tag);
        }

        if (includeTags.length > 0)
          leaderboardSome.tags = { hasSome: includeTags };
        // There are no negation keywords for array queries.
        if (excludeTags.length > 0)
          leaderboardSome.NOT = { tags: { hasSome: excludeTags } };
      }

      // Starts with 1 key so check g.t.
      if (Object.keys(leaderboardSome).length > 1) {
        where.leaderboards = { some: leaderboardSome };
      }
    } else if (query instanceof MapsGetAllUserSubmissionQueryDto) {
      where.OR = [
        { submitterID: userID },
        { credits: { some: { userID } } },
        {
          testInvites: {
            some: { userID, state: MapTestInviteState.ACCEPTED }
          }
        }
      ];

      where.status = {
        notIn: [MapStatus.DISABLED]
      };
      if (query.filter) where.status.in = query.filter;
    } else if (query instanceof MapsGetAllSubmissionQueryDto) {
      if (query.hasApprovingReview != null) {
        where.reviewStats = {
          approvals: query.hasApprovingReview === true ? { gte: 1 } : 0
        };
      }

      const user = await this.db.user.findUnique({
        where: { id: userID },
        select: { roles: true }
      });

      const roles = user?.roles;

      if (roles == null) throw new BadRequestException();

      // TODO surely we should restrict this in all map browsers
      // Allow unlimited take for reviewers and above
      if (take === -1) {
        take = Bitflags.has(roles, CombinedRoles.REVIEWER_AND_ABOVE)
          ? undefined
          : 100;
      }

      // Logic here is a nightmare, for a breakdown of permissions see
      // MapsService.getMapAndCheckReadAccess.
      const filter = query.filter;
      const subCredOrTesterOR = {
        OR: [
          { submitterID: userID },
          { credits: { some: { userID } } },
          {
            testInvites: {
              some: { userID, state: MapTestInviteState.ACCEPTED }
            }
          }
        ]
      };

      if (Bitflags.has(CombinedRoles.MOD_OR_ADMIN, roles)) {
        where.status = {
          in: filter
            ? intersection(filter, MapStatuses.IN_SUBMISSION)
            : MapStatuses.IN_SUBMISSION
        };
      } else if (Bitflags.has(Role.REVIEWER, roles)) {
        if (filter?.length > 0) {
          const ORs = [];
          const easyORs = intersection(filter, [
            MapStatus.PUBLIC_TESTING,
            MapStatus.FINAL_APPROVAL,
            MapStatus.CONTENT_APPROVAL
          ]);

          if (easyORs.length > 1) {
            ORs.push({ status: { in: easyORs } });
          } else if (easyORs.length === 1) {
            ORs.push({ status: easyORs[0] });
          }

          if (filter?.includes(MapStatus.PRIVATE_TESTING)) {
            ORs.push({
              AND: [{ status: MapStatus.PRIVATE_TESTING }, subCredOrTesterOR]
            });
          }
          where.OR = ORs;
        } else {
          where.OR = [
            {
              status: {
                in: [
                  MapStatus.PUBLIC_TESTING,
                  MapStatus.FINAL_APPROVAL,
                  MapStatus.CONTENT_APPROVAL
                ]
              }
            },
            {
              AND: [{ status: MapStatus.PRIVATE_TESTING }, subCredOrTesterOR]
            }
          ];
        }
      } else {
        // Regular users
        if (filter?.length > 0) {
          const ORs = [];
          const easyORs = intersection(filter, [
            MapStatus.PUBLIC_TESTING,
            MapStatus.FINAL_APPROVAL
          ]);

          if (easyORs.length > 1) {
            ORs.push({ status: { in: easyORs } });
          } else if (easyORs.length === 1) {
            ORs.push({ status: easyORs[0] });
          }

          if (filter.includes(MapStatus.CONTENT_APPROVAL)) {
            ORs.push({
              AND: [{ status: MapStatus.CONTENT_APPROVAL }, subCredOrTesterOR]
            });
          }
          if (filter.includes(MapStatus.PRIVATE_TESTING)) {
            ORs.push({
              AND: [{ status: MapStatus.PRIVATE_TESTING }, subCredOrTesterOR]
            });
          }
          where.OR = ORs;
        } else {
          where.OR = [
            { status: MapStatus.PUBLIC_TESTING },
            { status: MapStatus.FINAL_APPROVAL },
            {
              AND: [{ status: MapStatus.PRIVATE_TESTING }, subCredOrTesterOR]
            },
            {
              AND: [{ status: MapStatus.CONTENT_APPROVAL }, subCredOrTesterOR]
            }
          ];
        }
      }
    } else if (query instanceof MapsGetAllAdminQueryDto) {
      // /admin/maps can filter by any map statuses
      if (query.filter) {
        where.status = { in: query.filter };
      }
    } else {
      throw new BadRequestException(
        'Type of MapsGetAll query is not supported'
      );
    }

    let incPB = false,
      incWR = false;

    // Select (and include)
    // For admins we don't need dynamic expands, just give em everything.
    let include: Prisma.MMapInclude;
    if (query instanceof MapsGetAllAdminQueryDto) {
      include = {
        versions: { include: { submitter: true } },
        currentVersion: true,
        submission: {
          include: {
            dates: { orderBy: { date: 'asc' }, include: { user: true } }
          }
        },
        info: true,
        leaderboards: true,
        submitter: true,
        credits: { include: { user: true } }
      };
    } else {
      include = expandToIncludes(query.expand, {
        without: ['personalBest', 'worldRecord'],
        mappings: [
          // Changelog and zones are quite large structures so not worth ever
          // including on the paginated query - make clients query for a specific
          // submission if they want all that stuff
          { expand: 'currentVersion', value: { omit: { zones: true } } },
          { expand: 'currentVersionWithZones', model: 'currentVersion' },
          {
            expand: 'versions',
            value: { omit: { zones: true }, include: { submitter: true } }
          },
          {
            expand: 'versionsWithZones',
            model: 'versions',
            value: { include: { submitter: true } }
          },
          { expand: 'credits', value: { include: { user: true } } },
          {
            expand: 'inFavorites',
            model: 'favorites',
            value: { where: { userID: userID } }
          }
        ]
      });

      if (
        query instanceof MapsGetAllSubmissionQueryDto ||
        query instanceof MapsGetAllUserSubmissionQueryDto
      ) {
        if (include) {
          include.submission = {
            include: {
              dates: { orderBy: { date: 'asc' }, include: { user: true } }
            }
          };
        } else {
          include = {
            submission: {
              include: {
                dates: { orderBy: { date: 'asc' }, include: { user: true } }
              }
            }
          };
        }
      }

      if (
        query instanceof MapsGetAllQueryDto ||
        query instanceof MapsGetAllSubmissionQueryDto
      ) {
        incPB = query.expand?.includes('personalBest');
        incWR = query.expand?.includes('worldRecord');
        this.handleMapGetIncludes(include, incPB, incWR, userID);
      }
    }

    const dbResponse = await this.db.mMap.findManyAndCount({
      where,
      include,
      orderBy,
      skip: query.skip,
      take
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
    const include: Prisma.MMapInclude = expandToIncludes(expand, {
      without: ['personalBest', 'worldRecord'],
      mappings: [
        { expand: 'currentVersion', value: { omit: { zones: true } } },
        { expand: 'currentVersionWithZones', model: 'currentVersion' },
        {
          expand: 'versions',
          value: { omit: { zones: true }, include: { submitter: true } }
        },
        {
          expand: 'versionsWithZones',
          value: { include: { submitter: true } },
          model: 'versions'
        },
        { expand: 'credits', value: { include: { user: true } } },
        { expand: 'testInvites', value: { include: { user: true } } },
        {
          expand: 'inFavorites',
          model: 'favorites',
          value: { where: { userID: userID } }
        },
        {
          expand: 'submission',
          value: {
            include: {
              dates: { orderBy: { date: 'asc' }, include: { user: true } }
            }
          }
        }
      ]
    });

    const incPB = expand?.includes('personalBest');
    const incWR = expand?.includes('worldRecord');

    this.handleMapGetIncludes(include, incPB, incWR, userID);

    const map = await this.getMapAndCheckReadAccess({
      mapID,
      userID,
      include
    });

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
        trackType: TrackType.MAIN, // Probs fastest to omit trackNum here (can't be != 1)
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

  async getPreSignedUrl(userID: number, fileSize?: number) {
    const userIDObjects = await this.fileStoreService.listFileKeys(
      `upload_tmp/${userID}`
    );

    if (userIDObjects.length > 0) {
      await this.fileStoreService.deleteFiles(userIDObjects);
    }

    if (!fileSize) {
      throw new BadRequestException('File size is not specified');
    }

    const maxBspSize = this.config.getOrThrow('limits.bspSize');
    if (fileSize > maxBspSize) {
      throw new BadRequestException(`BSP file too large (> ${maxBspSize})`);
    }

    const randomID = Math.random().toString().slice(2, 10);
    return {
      url: await this.fileStoreService.getPreSignedUrl(
        `upload_tmp/${userID}.${randomID}`,
        fileSize,
        this.config.getOrThrow('limits.preSignedUrlExpTime')
      )
    };
  }

  async submitMap(
    dto: CreateMapDto,
    userID: number,
    vmfFiles?: File[]
  ): Promise<MapDto> {
    await this.checkCreateDto(userID, dto);

    const bspFile = await this.tryGetBspFromTempUploads(userID);

    if (!bspFile) throw new BadRequestException('Missing BSP file');

    await this.checkMapCompression(bspFile);

    this.checkMapFiles(vmfFiles ?? [], bspFile);

    this.checkSuggestionsAndZones(
      dto.suggestions,
      dto.zones,
      SuggestionType.SUBMISSION
    );

    const hasVmf = vmfFiles?.length > 0;
    const bspHash = FileStoreService.getHashForBuffer(bspFile.buffer);

    const bspAlreadyUsed = await this.db.mMap.exists({
      where: {
        currentVersion: { bspHash }
      }
    });
    if (bspAlreadyUsed) {
      throw new ConflictException('Map with this file hash already exists');
    }

    let map: Awaited<ReturnType<typeof this.createMapDbEntry>>;

    const tasks: Promise<any>[] = [
      this.db.$transaction(async (tx) => {
        map = await this.createMapDbEntry(tx, dto, userID, bspHash, hasVmf);

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
            type: LeaderboardType.IN_SUBMISSION
          }))
        });

        // We need the generated map ID from the above query for S3, but do NOT
        // want to block our transaction on S3 operations - so push to promise
        // array then await everything below.
        tasks.push(
          (async () => {
            const zippedVmf = hasVmf
              ? await this.zipVmfFiles(dto.name, 1, vmfFiles)
              : undefined;

            return this.uploadMapVersionFiles(
              map.currentVersion.bspDownloadId,
              bspFile,
              map.currentVersion.vmfDownloadId,
              zippedVmf,
              dto.name
            );
          })()
        );

        await this.createMapUploadedActivities(tx, map.id, map.credits);

        if (dto.wantsPrivateTesting && dto.testInvites?.length > 0) {
          await this.mapTestInviteService.createOrUpdatePrivateTestingInvites(
            tx,
            map.id,
            dto.testInvites
          );
        }
      })
    ];

    await Promise.all(tasks);

    if (!dto.wantsPrivateTesting) {
      void this.discordNotificationService.sendMapContentApprovalNotification(
        await this.getMapInfoForNotification(map.id)
      );
    }

    return DtoFactory(MapDto, map);
  }

  async submitMapVersion(
    mapID: number,
    dto: CreateMapVersionDto,
    userID: number,
    vmfFiles?: File[]
  ): Promise<MapDto> {
    const map = await this.db.mMap.findUnique({
      where: { id: mapID },
      include: {
        currentVersion: true,
        versions: { omit: { zones: true }, include: { submitter: true } },
        submission: {
          include: {
            dates: { orderBy: { date: 'asc' }, include: { user: true } }
          }
        },
        info: true
      }
    });

    if (!map) {
      throw new NotFoundException('Map does not exist');
    }

    const user = await this.db.user.findUnique({
      where: { id: userID }
    });

    if (
      !Bitflags.has(user.roles, CombinedRoles.MOD_OR_ADMIN) &&
      map.submitterID !== userID
    )
      throw new ForbiddenException('User is not the map submitter');

    // This should never happen but stops someone flooding S3 storage with
    // garbage.
    if (map.versions?.length > 100) {
      throw new ForbiddenException('Reached map version limit');
    }

    // If the user is banned from map submission, this map was *probably*
    // already rejected. But do this check just in case a mod bans them first
    // and hasn't yet rejected the map.
    if (Bitflags.has(user.bans, Ban.MAP_SUBMISSION)) {
      throw new ForbiddenException('User is banned from map submission');
    }

    if (
      !MapStatuses.IN_SUBMISSION.includes(map.status) &&
      !Bitflags.has(user.roles, Role.ADMIN)
    ) {
      throw new ForbiddenException('Map does not allow editing');
    }

    let bspHash: string;

    const bspFile = dto.hasBSP
      ? await this.tryGetBspFromTempUploads(userID)
      : null;

    this.checkMapFiles(vmfFiles, bspFile);

    if (dto.hasBSP) {
      if (!bspFile)
        throw new BadRequestException(
          'BSP was not uploaded to a pre-signed url'
        );

      await this.checkMapCompression(bspFile);

      bspHash = FileStoreService.getHashForBuffer(bspFile.buffer);

      const bspAlreadyUsed = await this.db.mMap.exists({
        where: {
          currentVersion: { bspHash },
          // Ignore old map versions of same ID,
          // since they get removed on map approval anyways.
          // This allows version rollback.
          NOT: {
            id: mapID
          }
        }
      });
      if (bspAlreadyUsed) {
        throw new ConflictException('Map with this file hash already exists');
      }
    } else {
      bspHash = map.currentVersion.bspHash;
    }

    const hasVmf = vmfFiles?.length > 0;

    if (!dto.hasBSP && !hasVmf && !dto.zones) {
      throw new BadRequestException(
        'No files or zones provided for map version'
      );
    }

    let zonesStr: string;
    let zones: MapZones;
    if (dto.zones) {
      this.checkZones(dto.zones);
      zones = dto.zones;
      zonesStr = JSON.stringify(zones);
    } else {
      zonesStr = map.currentVersion.zones;
      zones = JSON.parse(zonesStr);
    }

    const oldVersion = map.currentVersion;
    const newVersionNum = oldVersion.versionNum + 1;

    const newVersion = await this.db.$transaction(async (tx) => {
      const newVersion = await tx.mapVersion.create({
        data: {
          versionNum: newVersionNum,
          submitter: { connect: { id: userID } },
          zones: zonesStr,
          bspHash,
          zoneHash: createHash('sha1').update(zonesStr).digest('hex'),
          bspDownloadId: dto.hasBSP ? randomUUID() : oldVersion.bspDownloadId,
          vmfDownloadId: hasVmf
            ? randomUUID()
            : dto.hasBSP
              ? undefined
              : oldVersion.vmfDownloadId,
          changelog: dto.changelog,
          mmap: { connect: { id: mapID } }
        }
      });

      try {
        await tx.mMap.update({
          where: {
            id: mapID,
            // Ensure we only update if current version hasn't been changed in
            // the time between reading the map and updating it.
            currentVersionID: oldVersion.id
          },
          data: {
            currentVersion: { connect: { id: newVersion.id } }
          }
        });
      } catch (error) {
        // Update failed to find a value, this means the map was updated by a
        // separate transaction from another request; throw and let transaction
        // rollback.
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2025'
        ) {
          throw new BadRequestException(
            'Submission version update race, ignoring.'
          );
        }

        throw error;
      }

      await this.generateSubmissionLeaderboards(
        tx,
        mapID,
        map.submission.suggestions as unknown as MapSubmissionSuggestion[], // TODO: #855
        zones
      );

      if (dto.resetLeaderboards === true) {
        // If it's been approved before, deleting runs is a majorly destructive
        // action that we probably don't want to allow the submitter to do.
        // If the submitter is fixing the maps in a significant enough way to
        // still require a leaderboard reset, they should just get an admin to
        // do it.
        if (map.info.approvedDate) {
          throw new ForbiddenException(
            'Cannot reset leaderboards on a previously approved map.' +
              ' Talk about it with an admin!'
          );
        }

        await tx.leaderboardRun.deleteMany({ where: { mapID: map.id } });
      }

      return newVersion;
    });

    const zippedVmf = hasVmf
      ? await this.zipVmfFiles(map.name, newVersionNum, vmfFiles)
      : undefined;

    await this.uploadMapVersionFiles(
      newVersion.bspDownloadId,
      bspFile,
      newVersion.vmfDownloadId,
      zippedVmf,
      map.name
    );

    if (
      map.status === MapStatus.PUBLIC_TESTING ||
      map.status === MapStatus.FINAL_APPROVAL
    ) {
      void this.mapListService.scheduleMapListUpdate(FlatMapList.SUBMISSION);
    }

    return DtoFactory(
      MapDto,
      await this.db.mMap.findUnique({
        where: { id: mapID },
        include: {
          currentVersion: true,
          versions: { include: { submitter: true } },
          submission: {
            include: {
              dates: { orderBy: { date: 'asc' }, include: { user: true } }
            }
          }
        }
      })
    );
  }

  private async checkCreateDto(userID: number, dto: CreateMapDto) {
    const user = await this.db.user.findUnique({
      where: { id: userID }
    });

    // 403 is user has the map submission ban
    if (Bitflags.has(user.bans, Ban.MAP_SUBMISSION)) {
      throw new ForbiddenException('User is banned from map submission');
    }

    const mapCount = await this.db.mMap.count({
      where: { submitterID: userID, status: { in: MapStatuses.IN_SUBMISSION } }
    });

    // Limit total maps a non-mod/admin can have in submission at once
    if (
      (mapCount >= MAX_OPEN_MAP_SUBMISSIONS &&
        !Bitflags.has(user.roles, CombinedRoles.MAPPER_AND_ABOVE)) ||
      (mapCount >= MAX_MAPPER_OPEN_MAP_SUBMISSIONS &&
        !Bitflags.has(user.roles, CombinedRoles.MOD_OR_ADMIN))
    ) {
      throw new ForbiddenException('Too many maps in submission');
    }

    // 403 if the user is not a mapper, porter, moderator or admin, they don't
    // have any approved maps, and they have a map in submission.
    if (
      !Bitflags.has(user.roles, CombinedRoles.MAPPER_AND_ABOVE) &&
      mapCount > 0
    ) {
      throw new ForbiddenException(
        'User is not an approved mapper and already has a map in review'
      );
    }

    // Don't allow maps with same name, ever.
    if (await this.db.mMap.exists({ where: { name: dto.name } }))
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
      ? MapStatus.PRIVATE_TESTING
      : MapStatus.CONTENT_APPROVAL;

    const zones = JSON.stringify(createMapDto.zones);
    const zoneHash = createHash('sha1').update(zones).digest('hex');

    const initialMap = (await tx.mMap.create({
      data: {
        submitter: { connect: { id: submitterID } },
        name: createMapDto.name,
        versions: {
          create: {
            versionNum: 1,
            changelog: createMapDto.portingChangelog,
            bspHash,
            zoneHash,
            zones,
            submitter: { connect: { id: submitterID } },
            bspDownloadId: randomUUID(),
            vmfDownloadId: hasVmf ? randomUUID() : undefined
          }
        },
        submission: {
          create: {
            type: createMapDto.submissionType,
            placeholders: createMapDto.placeholders,
            suggestions: createMapDto.suggestions,
            dates: {
              create: [
                {
                  status,
                  date: new Date(),
                  user: { connect: { id: submitterID } }
                }
              ]
            }
          }
        },
        stats: { create: {} },
        reviewStats: { create: {} },
        status,
        info: {
          create: {
            description: createMapDto.info.description,
            creationDate: createMapDto.info.creationDate,
            youtubeID: createMapDto.info.youtubeID,
            requiredGames: createMapDto.info.requiredGames
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
        versions: true
      }
    })) as unknown as { id: number; versions: MapVersion[] };

    const map = await tx.mMap.update({
      where: { id: initialMap.id },
      data: {
        currentVersion: {
          connect: { id: initialMap.versions[0].id }
        }
      }
    });

    return tx.mMap.findUnique({
      where: { id: map.id },
      include: {
        info: true,
        stats: true,
        currentVersion: true,
        versions: { include: { submitter: true } },
        submission: {
          include: {
            dates: { orderBy: { date: 'asc' }, include: { user: true } }
          }
        },
        submitter: true,
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
    const existingLeaderboards: LeaderboardHandler.LeaderboardProps[] =
      await this.db.leaderboard.findMany({
        where: { mapID },
        select: { gamemode: true, trackNum: true, trackType: true }
      });

    const desiredLeaderboards = LeaderboardHandler.getMaximalLeaderboards(
      suggestions as unknown as LeaderboardHandler.LeaderboardProps[], // TODO: #855
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
          type: LeaderboardType.IN_SUBMISSION
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

  private checkMapFiles(vmfFiles: File[], bspFile?: File) {
    if (bspFile && !bspFile.originalname.endsWith('.bsp')) {
      throw new BadRequestException('Bad BSP name');
    }

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

  private async uploadMapVersionFiles(
    bspId: string,
    bspFile?: File,
    vmfId?: string,
    vmfZip?: Buffer,
    mapName?: string
  ) {
    const storeFns: Promise<FileStoreFile | boolean>[] = [];

    if (bspFile) {
      if (bspFile.path) {
        storeFns.push(
          this.fileStoreService
            .copyFile(bspFile.path, bspPath(bspId), {
              'Content-Type': 'model/vnd.valve.source.compiled-map',
              'Content-Disposition': `attachment${mapName ? `; filename="${mapName}.bsp"` : ''}`
            })
            .then(() => this.fileStoreService.deleteFile(bspFile.path))
        );
      } else {
        storeFns.push(
          this.fileStoreService.storeFile(bspFile.buffer, bspPath(bspId))
        );
      }
    }

    if (vmfZip)
      storeFns.push(this.fileStoreService.storeFile(vmfZip, vmfsPath(vmfId)));

    return Promise.all(storeFns);
  }

  //#endregion

  //#region Updates

  /**
   * Handles updating the map data
   */
  async update(
    mapID: number,
    userID: number,
    dto: UpdateMapDto,
    isSubmitter = false
  ) {
    if (isEmpty(dto)) {
      throw new BadRequestException('Empty body');
    }

    const map = (await this.db.mMap.findUnique({
      where: { id: mapID },
      include: {
        currentVersion: true,
        versions: { include: { submitter: true } },
        submission: {
          include: {
            dates: { orderBy: { date: 'asc' }, include: { user: true } }
          }
        },
        info: true
      }
    })) as unknown as MapWithSubmission; // TODO: #855;

    if (!map) {
      throw new NotFoundException('Map does not exist');
    }

    const user = await this.db.user.findUnique({ where: { id: userID } });

    if (isSubmitter) {
      if (userID !== map.submitterID) {
        throw new ForbiddenException('User is not the map submitter');
      } else if (!MapStatuses.IN_SUBMISSION.includes(map.status)) {
        throw new ForbiddenException(
          'Submitters can only edit map during submission'
        );
      }
    } else if (!Bitflags.has(user.roles, CombinedRoles.MOD_OR_ADMIN)) {
      if (Bitflags.has(user.roles, Role.REVIEWER)) {
        // The *only* things reviewer is allowed is to go from
        // content approval -> public testing or rejected
        if (
          dto.status !== MapStatus.PUBLIC_TESTING || // updating to status other public testing
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

    const suggs =
      dto.suggestions ??
      (map.submission.suggestions as unknown as MapSubmissionSuggestion[]);
    const zones = JSON.parse(map.currentVersion.zones);

    // Force the submitter to keep their suggestions in sync with their zones.
    // If this requests has new suggestions, use those, otherwise use the
    // existing ones.
    //
    // A map version could've updated the zones to something that doesn't work
    // with the current suggestions, in this case, the submitter will be forced
    // to update suggestions next time they do a general update, including if
    // they want to change the map status. Frontend explains this to the user.

    this.checkSuggestionsAndZones(suggs, zones, SuggestionType.SUBMISSION);

    let oldStatus: MapStatus | undefined;
    let newStatus: MapStatus | undefined;
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

      const generalChanges = this.getGeneralMapDataUpdate(dto, map);

      const statusHandler = await this.mapStatusUpdateHandler(
        tx,
        map,
        dto,
        user,
        isSubmitter
      );

      let updatedMap: MMap;
      if (statusHandler) {
        updatedMap = await tx.mMap.update({
          where: { id: mapID },
          data: deepmerge({ all: true })(
            update,
            generalChanges,
            statusHandler[0]
          ) as Prisma.MMapUpdateInput
        });

        oldStatus = statusHandler[1];
        newStatus = statusHandler[2];

        // Discord notifications
        if (
          newStatus === MapStatus.CONTENT_APPROVAL &&
          !map.submission.dates.some(
            (date) => date.status === MapStatus.CONTENT_APPROVAL
          )
        ) {
          void this.discordNotificationService.sendMapContentApprovalNotification(
            await this.getMapInfoForNotification(map.id)
          );
        } else if (
          newStatus === MapStatus.PUBLIC_TESTING &&
          !map.submission.dates.some(
            (date) => date.status === MapStatus.PUBLIC_TESTING
          )
        ) {
          void this.discordNotificationService.sendPublicTestingNotification(
            await this.getMapInfoForNotification(map.id)
          );
        } else if (
          newStatus === MapStatus.APPROVED &&
          !map.submission.dates.some(
            (date) => date.status === MapStatus.APPROVED
          )
        ) {
          void this.discordNotificationService.sendApprovedNotification(
            await this.getMapInfoForNotification(map.id)
          );
        }
      } else {
        updatedMap = await tx.mMap.update({
          where: { id: mapID },
          data: deepmerge({ all: true })(
            update,
            generalChanges
          ) as Prisma.MMapUpdateInput
        });
      }

      if (dto.suggestions) {
        // It's very uncommon we actually need to do this, but someone *could*
        // change their suggestions from one mode to another incompatible mode),
        // so leaderboards would change. Usually there won't be any changes
        // required though.
        await this.generateSubmissionLeaderboards(
          tx,
          map.id,
          dto.suggestions,
          zones
        );
      }

      if (!isSubmitter && Bitflags.has(user.roles, CombinedRoles.MOD_OR_ADMIN))
        await this.adminActivityService.create(
          userID,
          AdminActivityType.MAP_UPDATE,
          mapID,
          updatedMap,
          map
        );
    });

    if (newStatus === undefined || oldStatus === undefined) return;

    const numInSubmissionStatuses = intersection(
      [newStatus, oldStatus],
      MapStatuses.IN_SUBMISSION
    ).length;

    // If going from submission -> submission just update submission list,
    // If submission -> approved or reverse, update both
    // If no submission (e.g. approved -> disabled), just update approved list
    if (numInSubmissionStatuses === 2) {
      void this.mapListService.scheduleMapListUpdate(FlatMapList.SUBMISSION);
    } else if (numInSubmissionStatuses === 1) {
      void this.mapListService.scheduleMapListUpdate(FlatMapList.APPROVED);
      void this.mapListService.scheduleMapListUpdate(FlatMapList.SUBMISSION);
    } else {
      void this.mapListService.scheduleMapListUpdate(FlatMapList.APPROVED);
    }
  }

  private getGeneralMapDataUpdate(
    dto: UpdateMapDto,
    map: MapWithSubmission
  ): Prisma.MMapUpdateInput {
    const update: Prisma.MMapUpdateInput = {};

    if (dto.name) {
      update.name = dto.name;
    }

    if (dto.info) {
      update.info = {
        update: {
          description: dto.info.description,
          youtubeID: dto.info.youtubeID,
          creationDate: dto.info.creationDate,
          requiredGames: dto.info.requiredGames
        }
      };
    }

    if (dto.submissionType != null) {
      update.submission = { update: { type: dto.submissionType } };
    }

    if (dto.placeholders) {
      update.submission ??= { update: {} };
      update.submission.update.placeholders = dto.placeholders;
    }

    if ('suggestions' in dto && dto.suggestions) {
      update.submission ??= { update: {} };
      update.submission.update.suggestions = dto.suggestions;
    }

    if (dto.portingChangelog) {
      const firstVersionId = map.versions.find(
        (version) => version.versionNum === 1
      )?.id;

      update.versions = {
        update: {
          where: { id: firstVersionId },
          data: { changelog: dto.portingChangelog }
        }
      };
    }

    return update;
  }

  private async mapStatusUpdateHandler(
    tx: ExtendedPrismaServiceTransaction,
    map: MapWithSubmission,
    dto: UpdateMapDto,
    user: User,
    isSubmitter: boolean
  ): Promise<[Prisma.MMapUpdateInput, MapStatus, MapStatus] | undefined> {
    const oldStatus = map.status;
    const newStatus = dto.status;

    if (oldStatus === newStatus || newStatus === undefined) {
      return;
    }

    // Check roles against allowed status changes
    const { roles: allowedRoles } = MapStatusChangeRules.find(
      ({ from, to }) => from === oldStatus && to === newStatus
    );

    const isChangeAllowed = allowedRoles.some((allowedRole) => {
      if (allowedRole === 'submitter') {
        if (isSubmitter) return true;
      } else if (Bitflags.has(user.roles, allowedRole)) {
        return true;
      }
      return false;
    });

    if (!isChangeAllowed)
      throw new ForbiddenException('Map status change is not allowed');

    // Call functions for specific status changes
    if (
      oldStatus === MapStatus.PRIVATE_TESTING &&
      newStatus === MapStatus.CONTENT_APPROVAL
    ) {
      await this.deletePrivateTestingInviteNotifications(map.id);
      await this.db.mapTestInvite.deleteMany({
        where: { state: MapTestInviteState.UNREAD, mapID: map.id }
      });
    } else if (
      oldStatus === MapStatus.PUBLIC_TESTING &&
      newStatus === MapStatus.FINAL_APPROVAL
    ) {
      await this.updateStatusFromPublicToFA(map, user.roles);
    } else if (
      oldStatus === MapStatus.FINAL_APPROVAL &&
      newStatus === MapStatus.APPROVED
    ) {
      await this.updateStatusFromFAToApproved(tx, map, dto, user.id);
    } else if (
      oldStatus === MapStatus.DISABLED &&
      newStatus === MapStatus.APPROVED &&
      !map.submission.dates.some((date) => date.status === MapStatus.APPROVED)
    ) {
      throw new ForbiddenException(
        "Can't approve a disabled map that has never been approved before"
      );
    } else if (oldStatus === MapStatus.PRIVATE_TESTING) {
      await this.updateStatusFromPrivate(tx, map);
    }

    return [
      {
        status: newStatus,
        submission: {
          update: {
            dates: {
              create: {
                status: newStatus,
                date: new Date(),
                user: { connect: { id: user.id } }
              }
            }
          }
        }
      },
      oldStatus,
      newStatus
    ];
  }

  /**
   * Public Testing -> Final Approval
   */
  private async updateStatusFromPublicToFA(
    map: MapWithSubmission,
    roles: number
  ) {
    // If it's met the criteria to go to FA once, allowed to skip these checks
    if (
      map.submission.dates.some(
        (date) => date.status === MapStatus.FINAL_APPROVAL
      )
    ) {
      return;
    }

    // Ensure it's been in testing for minimum period,
    // if it's never been to FINAL_APPROVAL before.
    const currentTime = Date.now();
    const latestPubTestDate = map.submission.dates
      .filter((x) => x.status === MapStatus.PUBLIC_TESTING)
      .sort(
        ({ date: dateA }, { date: dateB }) =>
          new Date(dateA).getTime() - new Date(dateB).getTime()
      )
      .at(-1)?.date;

    if (
      !latestPubTestDate &&
      !Bitflags.has(roles, CombinedRoles.MOD_OR_ADMIN)
    ) {
      throw new InternalServerErrorException(
        'Map is in PUBLIC_TESTING, but has no enteredPublicTesting value'
      );
    }

    const latestPubTestTime = new Date(latestPubTestDate).getTime();
    if (
      !Bitflags.has(roles, CombinedRoles.MOD_OR_ADMIN) &&
      currentTime - latestPubTestTime <
        this.config.getOrThrow('limits.minPublicTestingDuration')
    ) {
      throw new ForbiddenException(
        'Map has not been in public testing for mandatory time period'
      );
    }

    // All "required resolving" reviews must have been resolved.
    // Only reviewers and above can create these, however they can also
    // mark a non-reviewer review as needing resolving.
    const hasUnresolvedReview = await this.db.mapReview.exists({
      where: { mapID: map.id, resolved: false }
    });

    if (hasUnresolvedReview) {
      throw new ForbiddenException('Map has unresolved reviews');
    }

    // Must have at least one approving review unless you're mod/admin
    const hasApprovingReview = await this.db.mapReview.exists({
      where: { mapID: map.id, approves: true }
    });

    if (
      !hasApprovingReview &&
      !Bitflags.has(roles, CombinedRoles.MOD_OR_ADMIN)
    ) {
      throw new ForbiddenException('Map has no approving reviews');
    }
  }

  /**
   * Final Approval -> Approved
   */
  private async updateStatusFromFAToApproved(
    tx: ExtendedPrismaServiceTransaction,
    map: MapWithSubmission,
    dto: UpdateMapDto,
    adminID: number
  ) {
    // Check we don't have any unresolved reviews. Even admins shouldn't be able
    // to bypass this, if needed they can just go in and resolve those reviews!
    const reviews = await tx.mapReview.findMany({ where: { mapID: map.id } });
    if (reviews.some((review) => review.resolved === false)) {
      throw new BadRequestException('Map has unresolved reviews!');
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

    const { currentVersion, versions } = await this.db.mMap.findFirst({
      where: { id: map.id },
      include: {
        currentVersion: true,
        versions: { omit: { zones: true }, include: { submitter: true } }
      }
    });

    const zones = JSON.parse(currentVersion.zones);

    // Is it getting approved for first time?
    if (!map.info.approvedDate) {
      if (!dto.finalLeaderboards || dto.finalLeaderboards.length === 0)
        throw new BadRequestException('Missing finalized leaderboards');

      // Check final approval data
      this.checkSuggestionsAndZones(
        dto.finalLeaderboards,
        zones,
        SuggestionType.APPROVAL
      );

      // Send a notification to the submitter.
      await this.notificationService.sendNotifications({
        data: {
          type: NotificationType.MAP_STATUS_CHANGE,
          notifiedUserID: map.submitterID,
          json: { oldStatus: map.status, newStatus: dto.status },
          mapID: map.id,
          userID: adminID
        }
      });

      // Leaderboards always get wiped, easiest to just delete and remake, let
      // Postgres cascade delete all leaderboardRuns (pastRuns can stay)
      await tx.leaderboard.deleteMany({ where: { mapID: map.id } });

      // Okay, got a clean slate, make new leaderboards from finalLeaderboards
      await tx.leaderboard.createMany({
        data: [
          // Main and bonuses
          ...LeaderboardHandler.setLeaderboardLinearity(
            dto.finalLeaderboards,
            zones
          ),
          // Stages
          ...LeaderboardHandler.getStageLeaderboards(
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

    // Create placeholder users accounts for each non-account placeholders.
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
    // Remove non-account placeholders that we just used to create proper accounts for.
    await tx.mapSubmission.update({
      where: { mapID: map.id },
      data: { placeholders: [] }
    });

    // Update map approve date
    await this.db.mapInfo.update({
      where: { mapID: map.id },
      data: { approvedDate: new Date() }
    });

    // Do S3 stuff last in case something errors - this is well tested and
    // *should* behave well in production, but it's still complex stuff and
    // we can't rollback S3 operations like we can a Postgres transaction.

    // Delete all the previous submission files - these would take up a LOT of
    // space otherwise
    await parallel(
      this.fileStoreService
        .deleteFiles(
          versions
            .flatMap((v) => [
              currentVersion.bspDownloadId !== v.bspDownloadId
                ? bspPath(v.bspDownloadId)
                : undefined,
              currentVersion.vmfDownloadId !== v.vmfDownloadId
                ? vmfsPath(v.vmfDownloadId)
                : undefined
            ])
            .filter(Boolean)
        )
        .catch((error) => {
          error.message = `Failed to delete map version file for ${map.name}: ${error.message}`;
          throw new InternalServerErrorException(error);
        })
    );
  }
  /**
   * Private Testing -> Anything Else
   */
  private async updateStatusFromPrivate(
    tx: ExtendedPrismaServiceTransaction,
    map: MapWithSubmission
  ) {
    await tx.mapTestInvite.deleteMany({
      where: { mapID: map.id, state: MapTestInviteState.UNREAD }
    });
    await tx.notification.deleteMany({
      where: { type: NotificationType.MAP_TESTING_INVITE, mapID: map.id }
    });
  }

  //#endregion

  //#region Deletions

  async delete(mapID: number, userID: number, isAdmin = false): Promise<void> {
    const map = await this.db.mMap.findUnique({
      where: { id: mapID },
      include: {
        versions: { omit: { zones: true }, include: { submitter: true } },
        info: true
      }
    });
    if (!map) throw new NotFoundException('Map not found');

    if (!isAdmin && userID !== map.submitterID)
      throw new ForbiddenException('User is not the map submitter');

    if (!isAdmin && map.info.approvedDate)
      throw new ForbiddenException(
        'Only admins can disable maps that were previously approved.'
      );

    await this.deleteMapFiles(mapID);

    if (map.info.approvedDate) {
      // Disable map without touching leaderboards

      // Bump version with bspHash set to null to give frontend easy to tell bsp
      // file has been deleted
      const updated = await this.db.mMap.update({
        where: { id: mapID },
        data: {
          status: MapStatus.DISABLED,
          versions: {
            create: {
              versionNum: map.versions.at(-1).versionNum + 1,
              bspDownloadId: null,
              vmfDownloadId: null,
              bspHash: null,
              submitter: { connect: { id: userID } },
              zones: null
            }
          }
        },
        include: { versions: { include: { submitter: true } } }
      });

      await this.db.mMap.update({
        where: { id: mapID },
        data: {
          currentVersion: { connect: { id: updated.versions.at(-1).id } }
        }
      });
    } else {
      // Delete run files
      const runs = await this.db.leaderboardRun.findMany({
        where: { mapID: map.id }
      });
      await this.fileStoreService.deleteFiles(
        runs.map((run) => runPath(run.replayHash))
      );

      // Nuke everything
      await this.db.mMap.delete({
        where: { id: mapID }
      });
    }

    // TODO: Probably should make different activities for when
    // map was deleted or only it's files, but admin activities
    // are a bit broken rn, so will need to rework them after 0.10
    if (isAdmin) {
      await this.adminActivityService.create(
        userID,
        AdminActivityType.MAP_CONTENT_DELETE,
        mapID,
        {},
        map
      );
    }

    void this.mapListService.scheduleMapListUpdate(
      MapStatuses.IN_SUBMISSION.includes(map.status)
        ? FlatMapList.SUBMISSION
        : FlatMapList.APPROVED
    );
  }

  private async deleteMapFiles(mapID: number) {
    const map = await this.db.mMap.findUnique({
      where: { id: mapID },
      include: { versions: { include: { submitter: true } } }
    });

    if (!map) throw new NotFoundException('Map not found');

    // Delete any stored map files. Doesn't matter if any of these don't exist.
    await Promise.all(
      [
        this.fileStoreService.deleteFiles(
          map.versions.flatMap((v) => [
            bspPath(v.bspDownloadId),
            vmfsPath(v.vmfDownloadId)
          ])
        ),
        ...map.images.map((imageID) =>
          this.mapImageService.deleteStoredMapImage(imageID)
        ),
        this.mapReviewService.deleteAllReviewAssetsForMap(map.id)
      ].map((promise) => promise.catch(() => void 0))
    );
  }

  //#endregion

  //#region Info

  async getInfo(mapID: number, userID?: number): Promise<MapInfoDto> {
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

  async getZones(mapID: number): Promise<string> {
    const mapWithZones = await this.db.mMap.findUnique({
      where: { id: mapID },
      select: { currentVersion: { select: { zones: true } } }
    });

    if (!mapWithZones || !mapWithZones.currentVersion?.zones)
      throw new NotFoundException('Map/zones not found');

    return mapWithZones.currentVersion.zones;
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
    args: { userID?: number; submissionOnly?: boolean } & MergeExclusive<
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
          ? // Required by below code
            { id: true, status: true, submitterID: true, ...args.select }
          : undefined
      }));

    if (!map) {
      throw new NotFoundException('Map does not exist');
    }

    const mapID = map.id;

    if (map.status === undefined) {
      throw new InternalServerErrorException('Invalid map data');
    }

    // If APPROVED/PUBLIC_TESTING/FINAL_APPROVAL, anyone can access.
    if (
      (map.status === MapStatus.APPROVED && !args?.submissionOnly) ||
      map.status === MapStatus.PUBLIC_TESTING ||
      map.status === MapStatus.FINAL_APPROVAL
    ) {
      return map as GetMMapUnique<S, I>;
    }

    // Don't allow unauthorized users access non public maps
    if (args.userID === undefined) {
      throw new ForbiddenException('User is not authorized');
    }

    // For any other state, we need to know roles
    const user = await this.db.user.findUnique({ where: { id: args.userID } });

    switch (map.status) {
      // APPROVED, always allow unless:
      // - submissionOnly is true, and not mod/admin
      case MapStatus.APPROVED: {
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
      // - Has an accepted MapTestInvite
      case MapStatus.PRIVATE_TESTING: {
        if (
          map.submitterID === args.userID ||
          Bitflags.has(user.roles, CombinedRoles.MOD_OR_ADMIN)
        )
          return map as GetMMapUnique<S, I>;

        if (
          await this.db.mapTestInvite.exists({
            where: {
              mapID,
              userID: args.userID,
              state: MapTestInviteState.ACCEPTED
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
      // CONTENT_APPROVAL, only allow:
      // - The submitter
      // - Moderator/Admin
      // - Reviewer
      // - in the credits
      // - Has an accepted MapTestInvite
      case MapStatus.CONTENT_APPROVAL: {
        if (
          map.submitterID === args.userID ||
          Bitflags.has(user.roles, CombinedRoles.REVIEWER_AND_ABOVE)
        )
          return map as GetMMapUnique<S, I>;

        if (
          await this.db.mapTestInvite.exists({
            where: {
              mapID,
              userID: args.userID,
              state: MapTestInviteState.ACCEPTED
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
      // DISABLED, only allow:
      // - Moderator/Admin
      case MapStatus.DISABLED: {
        if (Bitflags.has(user.roles, CombinedRoles.MOD_OR_ADMIN))
          return map as GetMMapUnique<S, I>;
        break;
      }
    }

    throw new ForbiddenException('User not authorized to access map data');
  }

  async deletePrivateTestingInviteNotifications(mapID: number) {
    await this.db.notification.deleteMany({
      where: { mapID, type: NotificationType.MAP_TESTING_INVITE }
    });
  }

  async getMapInfoForNotification(mapID: number) {
    return await this.db.mMap.findUnique({
      where: { id: mapID },
      include: {
        info: true,
        leaderboards: true,
        submission: true,
        submitter: true,
        credits: { include: { user: true } }
      }
    });
  }

  /**
   * Validates zone data, throw if fails
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
    suggestions: MapSubmissionSuggestion[] | MapSubmissionApproval[],
    zones: MapZones,
    type: SuggestionType
  ) {
    try {
      validateZoneFile(zones);
      validateSuggestions(suggestions, zones, type);
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
    const header = await BspHeader.fromBlob(
      new Blob([bspFile.buffer.buffer as ArrayBuffer])
    ).catch((error) => {
      throw new BadRequestException(
        error instanceof BspReadError
          ? error.message
          : 'Unknown error reading BSP file'
      );
    });

    if (!header.isCompressed())
      throw new BadRequestException('BSP is not compressed');
  }

  async tryGetBspFromTempUploads(userID: number): Promise<File | null> {
    const userIDObjects = await this.fileStoreService.listFileKeys(
      `upload_tmp/${userID}`
    );

    if (userIDObjects.length === 0) {
      return null;
    }

    const bspData = await this.fileStoreService.getFile(userIDObjects[0]);

    return {
      fieldname: 'bsp',
      originalname: 'map.bsp',
      encoding: '7bit',
      mimetype: 'model/vnd.valve.source.compiled-map',
      path: userIDObjects[0],
      buffer: Buffer.from(bspData)
    };
  }

  //#endregion
}

interface MapWithSubmission extends MMap {
  currentVersion: MapVersion;
  versions: MapVersion[];
  info: MapInfo;
  submission: Merge<
    MapSubmission,
    {
      dates: MapSubmissionDate[];
      placeholders: MapSubmissionPlaceholder[];
      suggestions: MapSubmissionSuggestion[];
    }
  >;
}

type GetMMapUnique<S, I> = { id: number; status: MapStatus } & Prisma.Result<
  ExtendedPrismaService['mMap'],
  { select: S; include: I },
  'findUnique'
>;
