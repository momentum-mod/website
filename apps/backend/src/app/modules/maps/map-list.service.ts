import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { FileStoreService } from '../filestore/file-store.service';
import { EXTENDED_PRISMA_SERVICE } from '../database/db.constants';
import { ExtendedPrismaService } from '../database/prisma.extension';
import { DtoFactory, MapDto } from '../../dto';
import { MapListVersionDto } from '../../dto/map/map-list-version.dto';
import {
  FlatMapList,
  mapListDir,
  mapListPath,
  MapStatus
} from '@momentum/constants';
import * as zlib from 'node:zlib';
import { promisify } from 'node:util';
import { instanceToPlain, plainToInstance } from 'class-transformer';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { ConfigService } from '@nestjs/config';
import { ClusterService } from '../cluster/cluster.service';
import { ValkeyService } from '../valkey/valkey.service';

export const MAPLIST_UPDATE_JOB_NAME = 'MapListUpdateJob';

const versionKeys = {
  [FlatMapList.APPROVED]: 'maplistver:approved',
  [FlatMapList.SUBMISSION]: 'maplistver:submission'
};

const updateFlagKeys = {
  [FlatMapList.APPROVED]: 'maplistupdate:approved',
  [FlatMapList.SUBMISSION]: 'maplistupdate:submission'
};

@Injectable()
export class MapListService implements OnModuleInit {
  constructor(
    @Inject(EXTENDED_PRISMA_SERVICE) private readonly db: ExtendedPrismaService,
    private readonly fileStoreService: FileStoreService,
    private readonly config: ConfigService,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly clusterService: ClusterService,
    private readonly valkey: ValkeyService
  ) {}

  private readonly logger = new Logger('Map List Service');

  async onModuleInit(): Promise<void> {
    if (this.clusterService.areWeFirstWorker) {
      for (const type of [FlatMapList.APPROVED, FlatMapList.SUBMISSION]) {
        const keys = await this.fileStoreService.listFileKeys(mapListDir(type));

        if (keys.length === 0) {
          await this.valkey.set(versionKeys[type], 0);
        } else if (keys.length === 1) {
          await this.valkey.set(
            versionKeys[type],
            this.extractVersionFromFileKey(keys[0])
          );
        } else {
          // If > 1 we have some old versions sitting around for some reason,
          // just delete.
          const sortedKeys = keys
            .map((k) => this.extractVersionFromFileKey(k))
            .sort((a, b) => b - a); // Largest to smallest
          await Promise.all([
            this.valkey.set(versionKeys[type], sortedKeys[0]),
            this.fileStoreService.deleteFiles(
              sortedKeys.slice(1).map((k) => mapListPath(type, k))
            )
          ]);
        }
      }
    }

    // Need to schedule this cronjob on all workers so if the first worker
    // goes down another can take over.
    // Not a great approach, might want to rethink if we do more scheduling
    // in the future.
    this.schedulerRegistry.addCronJob(
      MAPLIST_UPDATE_JOB_NAME,
      CronJob.from({
        cronTime: this.config.get('mapListUpdateSchedule'),
        onTick: this.checkScheduledUpdates.bind(this),
        waitForCompletion: true,
        start: true
      })
    );
  }

  async getMapList(): Promise<MapListVersionDto> {
    return DtoFactory(MapListVersionDto, {
      approved: Number(
        await this.valkey.get(versionKeys[FlatMapList.APPROVED])
      ),
      submissions: Number(
        await this.valkey.get(versionKeys[FlatMapList.SUBMISSION])
      )
    });
  }

  async scheduleMapListUpdate(type: FlatMapList): Promise<void> {
    await this.valkey.set(updateFlagKeys[type], '1');
  }

  private async checkScheduledUpdates(): Promise<void> {
    if (!this.clusterService.areWeFirstWorker) return;

    await Promise.all(
      [FlatMapList.APPROVED, FlatMapList.SUBMISSION].map(async (type) => {
        const scheduled = await this.valkey.get(updateFlagKeys[type]);

        if (scheduled === '1') {
          return Promise.all([
            this.updateMapList(type),
            this.valkey.set(updateFlagKeys[type], '0')
          ]);
        } else {
          return [];
        }
      })
    );
  }

  private async updateMapList(type: FlatMapList): Promise<void> {
    // Important: Seed script (seed.ts) copies this logic, if changing here,
    // change there as well.
    const maps = await this.db.mMap.findMany({
      where: {
        status:
          type === FlatMapList.APPROVED
            ? MapStatus.APPROVED
            : { in: [MapStatus.PUBLIC_TESTING, MapStatus.FINAL_APPROVAL] }
      },
      select: {
        id: true,
        name: true,
        status: true,
        images: true,
        info: true,
        leaderboards: true,
        credits: {
          select: {
            type: true,
            description: true,
            user: {
              select: { id: true, alias: true, avatar: true, steamID: true }
            }
          }
        },
        createdAt: true,
        currentVersion: { omit: { zones: true, changelog: true, mapID: true } },
        ...(type === FlatMapList.SUBMISSION
          ? {
              submission: true,
              versions: { omit: { zones: true, mapID: true } }
            }
          : {})
      }
    });

    const t1 = Date.now();

    // Convert to DTO then serialize back to JSON so any class-transformer
    // transformations are applied.
    const mapListJson = JSON.stringify(
      maps.map((map) => instanceToPlain(plainToInstance(MapDto, map)))
    );

    // Momentum Static Map List
    //
    // -- Header [12 bytes] --
    // Ident [4 bytes - "MSML" 4D 53 4D 4C]
    // Length of uncompressed data [4 bytes - uint32 LE]
    // Total number of maps [4 bytes - uint32 LE]
    //
    // -- Contents [Variable] --
    // Deflate compressed map list

    // Not very memory-efficent, could be improved using streams, but if doing
    // that we should hook up streaming uploads to API and I can't be fucked
    // with the S3 API. (see https://stackoverflow.com/a/73332454).
    // This takes me ~100ms for ~3000 maps.
    //
    // Hilariously, class-transformer serialization takes about 10 TIMES
    // (~1000ms) the time to JSON.stringify, compress, and concat the buffers.
    // So this isn't worth optimising whilst we're still using that piece of
    // crap library.
    const uncompressed = Buffer.from(mapListJson);
    const header = Buffer.alloc(12);

    header.write('MSML', 0, 'utf8');
    header.writeUInt32LE(uncompressed.length, 4);
    header.writeUInt32LE(maps.length, 8);

    const compressed = await promisify(zlib.deflate)(uncompressed);

    const outBuf = Buffer.concat([header, compressed]);

    const newVersion = await this.valkey.incr(versionKeys[type]);
    const oldVersion = newVersion - 1;

    const oldKey = mapListPath(type, oldVersion);
    const newKey = mapListPath(type, newVersion);

    this.logger.log(
      `Updating ${type} map list from v${oldVersion} to v${newVersion}, ${maps.length} maps, encoding took ${Date.now() - t1}ms`
    );

    await Promise.all([
      this.fileStoreService.deleteFile(oldKey),
      this.fileStoreService.storeFile(outBuf, newKey)
    ]);
  }

  private extractVersionFromFileKey(key: string): number {
    return Number(/(?<=\/)\d+(?=.dat)/.exec(key)[0]);
  }
}
