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

@Injectable()
export class MapListService implements OnModuleInit {
  constructor(
    @Inject(EXTENDED_PRISMA_SERVICE) private readonly db: ExtendedPrismaService,
    private readonly fileStoreService: FileStoreService
  ) {}

  // TODO: Move to Redis
  private version: Record<FlatMapList, number> = {
    [FlatMapList.APPROVED]: 0,
    [FlatMapList.SUBMISSION]: 0
  };

  private readonly logger = new Logger('Map List Service');

  async onModuleInit(): Promise<void> {
    for (const type of [FlatMapList.APPROVED, FlatMapList.SUBMISSION]) {
      const keys = await this.fileStoreService.listFileKeys(mapListDir(type));

      if (keys.length === 0) {
        this.version[type] = 0;
      } else if (keys.length === 1) {
        this.version[type] = this.extractVersionFromFileKey(keys[0]);
      } else {
        // If > 1 we have some old versions sitting around for some reason,
        // just delete.
        const sortedKeys = keys
          .map((k) => this.extractVersionFromFileKey(k))
          .sort((a, b) => b - a); // Largest to smallest
        this.version[type] = sortedKeys[0];
        await this.fileStoreService.deleteFiles(
          sortedKeys.slice(1).map((k) => mapListPath(type, k))
        );
      }
    }
  }

  getMapList(): MapListVersionDto {
    return DtoFactory(MapListVersionDto, {
      approved: this.version[FlatMapList.APPROVED],
      submissions: this.version[FlatMapList.SUBMISSION]
    });
  }

  async updateMapList(type: FlatMapList): Promise<void> {
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

    // We could get this way more memory-efficent by using streams, I just
    // can't be fucked with streaming to the S3 API (see https://stackoverflow.com/a/73332454).
    // This takes me ~100ms for ~3000 maps, could be brought down quite a bit
    // with streams.
    //
    // Hilariously, class-transformer serialization takes about 10 TIMES the
    // the time to JSON.stringify, compress, and concat the buffers.
    // So this isn't worth optimising whilst we're still using that piece of
    // crap library.
    const uncompressed = Buffer.from(mapListJson);
    const header = Buffer.alloc(12);

    header.write('MSML', 0, 'utf8');
    header.writeUInt32LE(uncompressed.length, 4);
    header.writeUInt32LE(maps.length, 8);

    const compressed = await promisify(zlib.deflate)(uncompressed, {
      level: 5
    });

    const outBuf = Buffer.concat([header, compressed]);

    const oldVersion = this.version[type];
    const newVersion = this.updateMapListVersion(type);
    const oldKey = mapListPath(type, oldVersion);
    const newKey = mapListPath(type, newVersion);

    this.logger.log(
      `Updating ${type} map list from v${oldVersion} to v${newVersion}, ${maps.length} maps, encoding took ${Date.now() - t1}ms`
    );

    await this.fileStoreService.deleteFile(oldKey);
    await this.fileStoreService.storeFile(outBuf, newKey);
  }

  private updateMapListVersion(type: FlatMapList): number {
    return ++this.version[type];
  }

  private extractVersionFromFileKey(key: string): number {
    return Number(/(?<=\/)\d+(?=.dat)/.exec(key)[0]);
  }
}
