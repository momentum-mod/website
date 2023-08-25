import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import {
  CreateMapDto,
  DtoFactory,
  MapDto,
  MapSummaryDto,
  PagedResponseDto
} from '@momentum/backend/dto';
import { MapCredit, MapTrack, Prisma } from '@prisma/client';
import { EXTENDED_PRISMA_SERVICE } from '../database/db.constants';
import {
  ExtendedPrismaService,
  ExtendedPrismaServiceTransaction
} from '../database/prisma.extension';
import { difference, expandToIncludes } from '@momentum/util-fn';
import { Bitflags } from '@momentum/bitflags';
import {
  ActivityType,
  Ban,
  CombinedRoles,
  MapCreditType,
  MapStatus,
  MapStatusNew,
  MapTestingRequestState
} from '@momentum/constants';
import { FileStoreCloudService } from '../filestore/file-store-cloud.service';
import { FileStoreCloudFile } from '../filestore/file-store.interface';
import { File } from '@nest-lab/fastify-multer';
import { vdf } from 'fast-vdf';
import Zip from 'adm-zip';

@Injectable()
export class MapSubmissionService {
  constructor(
    @Inject(EXTENDED_PRISMA_SERVICE) private readonly db: ExtendedPrismaService,
    private readonly fileStore: FileStoreCloudService
  ) {}

  //#region Create/New Versions

  async submitMap(
    dto: CreateMapDto,
    userID: number,
    bspFile: File,
    vmfFiles?: File[]
  ): Promise<MapDto> {
    await this.createDtoChecks(userID, dto);
    this.fileChecks(dto.fileName, bspFile, vmfFiles);

    const hasVmf = vmfFiles?.length > 0;
    const bspHash = FileStoreCloudService.getHashForBuffer(bspFile.buffer);

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
          this.createOrUpdatePrivateTestingInvites(tx, map.id, dto.testInvites)
        );
      }

      await Promise.all(tasks);

      return DtoFactory(MapDto, map);
    });
  }

  private async createDtoChecks(userID: number, dto: CreateMapDto) {
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
        [
          MapStatusNew.PRIVATE_TESTING,
          MapStatusNew.CONTENT_APPROVAL,
          MapStatusNew.PUBLIC_TESTING,
          MapStatusNew.FINAL_APPROVAL
        ].includes(map.status)
      )
    ) {
      throw new ForbiddenException(
        'User is not an approved mapper and already has a map in review'
      );
    }

    // Don't allow maps with same filename unless rejected/removed.
    if (
      await this.db.mMap.exists({
        where: {
          fileName: dto.fileName,
          NOT: { status: { in: [MapStatus.REJECTED, MapStatus.REMOVED] } }
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

  // This function will get make less insane once we do 0.10.0 zoning!
  private async createMapDbEntry(
    tx: ExtendedPrismaServiceTransaction,
    createMapDto: CreateMapDto,
    submitterID: number,
    bspHash: string,
    hasVmf: boolean
  ) {
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
            versions: { create: { versionNum: 1, hash: bspHash, hasVmf } }
          }
        },
        stats: { create: { baseStats: { create: {} } } },
        status: createMapDto.wantsPrivateTesting
          ? MapStatusNew.PRIVATE_TESTING
          : MapStatusNew.CONTENT_APPROVAL,
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

  private async createOrUpdatePrivateTestingInvites(
    tx: ExtendedPrismaServiceTransaction,
    mapID: number,
    userIDs: number[]
  ): Promise<void> {
    if (userIDs.length !== new Set(userIDs).size) {
      throw new BadRequestException('Duplicated user IDs in tested invites');
    }

    const existingUsers = await tx.user.findMany({
      where: { id: { in: userIDs } }
    });

    if (userIDs.length !== new Set(existingUsers).size) {
      throw new BadRequestException('Invalid userID in testing invites');
    }

    const existingInvites = await tx.mapTestingRequest.findMany({
      where: { mapID },
      select: { userID: true }
    });
    const existingInviteUserIDs = existingInvites.map((x) => x.userID);

    // We assume some invites may exist already, then add invites for any users
    // on new invites but not existing invites, and remove for any users on
    // existing invites but not new invites.
    await tx.mapTestingRequest.createMany({
      data: difference(userIDs, existingInviteUserIDs).map((userID) => ({
        mapID,
        userID,
        state: MapTestingRequestState.UNREAD
      }))
    });

    await tx.mapTestingRequest.deleteMany({
      where: {
        userID: { in: difference(existingInviteUserIDs, userIDs) }
      }
    });
  }

  private fileChecks(fileName: string, bspFile: File, vmfFiles: File[]) {
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
    const storeFns: Promise<FileStoreCloudFile>[] = [
      this.fileStore.storeFileCloud(bspFile.buffer, `submissions/${uuid}.bsp`)
    ];

    if (vmfZip)
      storeFns.push(
        this.fileStore.storeFileCloud(vmfZip, `submissions/${uuid}_VMFs.zip`)
      );

    return Promise.all(storeFns);
  }

  //#endregion

  //#region Updates

  //#endregion

  //#region Get Submitted

  async getSubmittedMaps(
    userID: number,
    skip?: number,
    take?: number,
    search?: string,
    expand?: string[]
  ): Promise<PagedResponseDto<MapDto>> {
    const where: Prisma.MMapWhereInput = { submitterID: userID };

    if (search) where.name = { contains: search };

    const submittedMapsRes = await this.db.mMap.findManyAndCount({
      where,
      include: expandToIncludes(expand),
      skip,
      take
    });

    return new PagedResponseDto(MapDto, submittedMapsRes);
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
}
