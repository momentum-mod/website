import { FlatMapList } from '@momentum/constants';
import { MapListService } from './map-list.service';
import { Test, TestingModule } from '@nestjs/testing';
import {
  PRISMA_MOCK_PROVIDER,
  PrismaMock
} from '../../../../test/prisma-mock.const';
import { mockDeep } from 'jest-mock-extended';
import { FileStoreService } from '../filestore/file-store.service';
import { EXTENDED_PRISMA_SERVICE } from '../database/db.constants';
import { promisify } from 'node:util';
import * as zlib from 'node:zlib';

describe('MapListService', () => {
  describe('onModuleInit', () => {
    let service: MapListService, db: PrismaMock;
    const fileStoreMock = {
      listFileKeys: jest.fn(() => Promise.resolve([])),
      storeFile: jest.fn(),
      deleteFiles: jest.fn(),
      deleteFile: jest.fn()
    };

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          MapListService,
          PRISMA_MOCK_PROVIDER,
          { provide: FileStoreService, useValue: fileStoreMock }
        ]
      })
        .useMocker(mockDeep)
        .compile();

      service = module.get(MapListService);
      db = module.get(EXTENDED_PRISMA_SERVICE);
    });

    describe('onModuleInit', () => {
      it('should set version values based on files in storage', async () => {
        fileStoreMock.listFileKeys.mockResolvedValueOnce([
          'maplist/approved/1.dat'
        ]);
        fileStoreMock.listFileKeys.mockResolvedValueOnce([
          'maplist/submissions/15012024.dat'
        ]);

        await service.onModuleInit();

        expect(service['version']).toMatchObject({
          [FlatMapList.APPROVED]: 1,
          [FlatMapList.SUBMISSION]: 15012024
        });

        expect(fileStoreMock.deleteFiles).not.toHaveBeenCalled();
      });

      it('should set version to 0 when no versions exist in storage', async () => {
        await service.onModuleInit();

        expect(service['version']).toMatchObject({
          [FlatMapList.APPROVED]: 0,
          [FlatMapList.SUBMISSION]: 0
        });

        expect(fileStoreMock.deleteFiles).not.toHaveBeenCalled();
      });

      it('should pick most recent when multiple versions exist in storage, and wipe old versions', async () => {
        fileStoreMock.listFileKeys.mockResolvedValueOnce([
          'maplist/approved/4.dat',
          'maplist/approved/5.dat',
          'maplist/approved/3.dat',
          'maplist/approved/1.dat'
        ]);

        await service.onModuleInit();

        expect(service['version']).toMatchObject({
          [FlatMapList.APPROVED]: 5,
          [FlatMapList.SUBMISSION]: 0
        });

        expect(fileStoreMock.deleteFiles).toHaveBeenCalledWith([
          'maplist/approved/4.dat',
          'maplist/approved/3.dat',
          'maplist/approved/1.dat'
        ]);
      });
    });

    describe('updateMapList', () => {
      // prettier-ignore
      const storedMap = {
        id: 1,
        name: 'The Map',
        status: 0,
        images: [ 'f2fecc26-34a0-448b-a3c7-007f43b9ec7e', 'a797e52e-3efc-4174-9f66-36e2c57ff55c', 'dee8bbd5-cec2-4341-9ddf-bdadd8337cdd' ],
        info: { description: 'A map that makes me think I am becoming a better person', youtubeID: null, creationDate: '2024-09-27T10:18:42.318Z', mapID: 1 },
        leaderboards: [ { mapID: 12345, gamemode: 8, trackType: 0, trackNum: 1, style: 0, tier: 3, linear: false, type: 1, tags: [] } ],
        credits: [ { type: 1, description: 'who am i', user: { id: 674, alias: 'John God', avatar: '0227a240393e6d62f539ee7b306dd048b0830eeb', steamID: '43576820710' } } ],
        createdAt: '2024-09-27T22:31:12.846Z',
        currentVersion: { id: 'fc89afc9-7ad2-4590-853c-a9ff4f41ddd5', versionNum: 3, bspHash: 'ddd39cbfc070e98e1e68131bab0f40df1d06645f', zoneHash: '608437d3bb461dd6e4abfff881f6b16827629d0b', hasVmf: false, submitterID: null, createdAt: '2024-09-27T18:12:52.465Z' }
      };

      it('should generate a Momentum Static Map List file and send to filestore', async () => {
        db.mMap.findMany.mockResolvedValueOnce([storedMap as any]);

        await service.updateMapList(FlatMapList.APPROVED);

        const buffer: Buffer = fileStoreMock.storeFile.mock.calls[0][0];
        expect(buffer.subarray(0, 4)).toMatchObject(
          Buffer.from('MSML', 'utf8')
        );
        expect(buffer.readUInt32LE(8)).toBe(1);

        const decompressed = await promisify(zlib.inflate)(buffer.subarray(12));
        expect(buffer.readUInt32LE(4)).toBe(decompressed.length);

        const parsed = JSON.parse(decompressed.toString('utf8'));

        // Can't do full toMatchObject, we've run through class-transformer.
        expect(parsed[0]).toMatchObject({
          id: storedMap.id,
          name: storedMap.name
        });
      });
    });
  });
});
