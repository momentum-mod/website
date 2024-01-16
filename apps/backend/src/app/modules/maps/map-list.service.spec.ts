import { FlatMapList } from '@momentum/constants';
import { MapListService } from './map-list.service';
import { Test, TestingModule } from '@nestjs/testing';
import { PRISMA_MOCK_PROVIDER } from '../../../../test/prisma-mock.const';
import { mockDeep } from 'jest-mock-extended';
import { FileStoreService } from '../filestore/file-store.service';

describe('MapListService', () => {
  describe('onModuleInit', () => {
    let service: MapListService;
    const fileStoreMock = {
      listFileKeys: jest.fn(() => Promise.resolve([])),
      deleteFiles: jest.fn()
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
    });

    it('should set version values based on files in storage', async () => {
      fileStoreMock.listFileKeys.mockResolvedValueOnce([
        'maplist/approved/1.json.deflate'
      ]);
      fileStoreMock.listFileKeys.mockResolvedValueOnce([
        'maplist/submissions/15012024.json.deflate'
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
        'maplist/approved/4.json.deflate',
        'maplist/approved/5.json.deflate',
        'maplist/approved/3.json.deflate',
        'maplist/approved/1.json.deflate'
      ]);

      await service.onModuleInit();

      expect(service['version']).toMatchObject({
        [FlatMapList.APPROVED]: 5,
        [FlatMapList.SUBMISSION]: 0
      });

      expect(fileStoreMock.deleteFiles).toHaveBeenCalledWith([
        'maplist/approved/4.json.deflate',
        'maplist/approved/3.json.deflate',
        'maplist/approved/1.json.deflate'
      ]);
    });
  });
});
