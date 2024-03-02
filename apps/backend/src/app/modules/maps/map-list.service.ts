import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { FileStoreService } from '../filestore/file-store.service';
import { EXTENDED_PRISMA_SERVICE } from '../database/db.constants';
import { ExtendedPrismaService } from '../database/prisma.extension';
import { DtoFactory } from '../../dto';
import { MapListVersionDto } from '../../dto/map/map-list-version.dto';
import {
  FlatMapList,
  mapListDir,
  mapListPath,
  MapStatus
} from '@momentum/constants';
import * as zlib from 'node:zlib';
import { promisify } from 'node:util';

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
        hash: true,
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
        submission:
          type === FlatMapList.SUBMISSION
            ? {
                select: {
                  currentVersion: {
                    select: {
                      id: true,
                      versionNum: true,
                      hash: true,
                      changelog: true,
                      createdAt: true
                    }
                  },
                  type: true,
                  placeholders: true,
                  suggestions: true,
                  dates: true
                }
              }
            : undefined,
        createdAt: true
      }
    });

    const mapListJson = JSON.stringify(maps);
    const compressed = await promisify(zlib.deflate)(mapListJson);

    const oldVersion = this.version[type];
    const newVersion = this.updateMapListVersion(type);
    const oldKey = mapListPath(type, oldVersion);
    const newKey = mapListPath(type, newVersion);

    await this.fileStoreService.deleteFile(oldKey);
    await this.fileStoreService.storeFile(compressed, newKey);
  }

  private updateMapListVersion(type: FlatMapList): number {
    return ++this.version[type];
  }

  private extractVersionFromFileKey(key: string): number {
    return Number(/(?<=\/)\d+(?=.json)/.exec(key)[0]);
  }
}
