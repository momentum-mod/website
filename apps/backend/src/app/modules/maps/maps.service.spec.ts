import { Test, TestingModule } from '@nestjs/testing';
import { MapsService } from './maps.service';
import { mockDeep } from 'jest-mock-extended';
import {
  PRISMA_MOCK_PROVIDER,
  PrismaMock
} from '../../../../test/prisma-mock.const';
import { EXTENDED_PRISMA_SERVICE } from '../database/db.constants';
import {
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException
} from '@nestjs/common';
import { MapStatusNew, Role } from '@momentum/constants';
import { Enum } from '@momentum/enum';

describe('MapsService', () => {
  let service: MapsService, db: PrismaMock;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MapsService, PRISMA_MOCK_PROVIDER]
    })
      .useMocker(mockDeep)
      .compile();

    service = module.get(MapsService);
    db = module.get(EXTENDED_PRISMA_SERVICE);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  //prettier-ignore
  describe('getMapAndCheckReadAccess', () => {
    // Not every test calls every mock we set for it, so clear after each test.
    it('should 404 for a missing map', async () => {
      db.mMap.findUnique.mockResolvedValueOnce(undefined);

      await expect(service.getMapAndCheckReadAccess(1, 99999999, {})).rejects.toThrow(NotFoundException);
    });

    it('should 500 for invalid map data', async () => {
      db.mMap.findUnique.mockResolvedValueOnce('sausage' as any);

      await expect(service.getMapAndCheckReadAccess(1, 1, {})).rejects.toThrow(InternalServerErrorException);
    });

    // Map of what states should PASS access checks for each MapStatus,
    // otherwise should fail. Below code performs each check against each state.
    const tests = {
      [MapStatusNew.APPROVED]: 'any',
      [MapStatusNew.PUBLIC_TESTING]: 'any',
      [MapStatusNew.PRIVATE_TESTING]: ['admin', 'moderator', 'submitter', 'acceptedRequest', 'inCredits'],
      [MapStatusNew.CONTENT_APPROVAL]: ['admin', 'moderator', 'submitter'],
      [MapStatusNew.FINAL_APPROVAL]: ['admin', 'moderator', 'submitter'],
      [MapStatusNew.REJECTED]: ['admin', 'moderator'],
      [MapStatusNew.DISABLED]: ['admin', 'moderator']
    };

    const expects = async (pass: boolean, map: any, userID = 1) =>
      pass
        ? expect(await service.getMapAndCheckReadAccess(map.id, userID, {})).toMatchObject(map)
        : await expect(service.getMapAndCheckReadAccess(map.id, userID, {})).rejects.toThrow(ForbiddenException);
    
    const mockMapValue = (map) => db.mMap.findUnique.mockResolvedValueOnce(map);
    const mockUserValue = (user) => db.user.findUnique.mockResolvedValueOnce(user);
    const mockTestingReqExists = (exists) => db.mapTestingRequest.exists.mockResolvedValueOnce(exists);
    const mockMapCreditExists = (exists) => db.mapCredit.exists.mockResolvedValueOnce(exists);

    for (const status of Enum.values(MapStatusNew)) {
      describe(MapStatusNew[status], () => {
        afterEach(() => jest.resetAllMocks());

        const conditions = tests[status];
        const map = { id: 1, status };

        const passes = (condition): boolean => conditions.includes(condition);
        const shouldPass = (condition) => passes(condition) ? 'accept' : 'reject';

        if (conditions === 'any') {
          it('should accept with any user', async () => {
            mockMapValue(map);
            await expects(true, map);
          });

          return;
        }

        it(`should ${shouldPass('admin')} an admin`, async () => {
          const pass = passes('admin');

          mockMapValue(map);
          mockUserValue({ id: 1, roles: Role.ADMIN });
          mockTestingReqExists(false);
          mockMapCreditExists(false);

          await expects(pass, map);
        });

        it(`should ${shouldPass('moderator')} a moderator`, async () => {
          const pass = passes('moderator');

          mockMapValue(map);
          mockUserValue({ id: 1, roles: Role.MODERATOR });
          mockTestingReqExists(false);
          mockMapCreditExists(false);

          await expects(pass, map);
        });

        it(`should ${shouldPass('reviewer')} a reviewer`, async () => {
          const pass = passes('reviewer');

          mockMapValue(map);
          mockUserValue({ id: 1, roles: Role.REVIEWER });
          mockTestingReqExists(false);
          mockMapCreditExists(false);

          await expects(pass, map);
        });

        it(`should ${shouldPass('submitter')} the submitter`, async () => {
          const pass = passes('submitter');

          const submittedMap = { ...map, submitterID: 1 };
          mockMapValue(submittedMap);
          mockUserValue({ id: 1, roles: 0 });
          mockTestingReqExists(false);
          mockMapCreditExists(false);

          await expects(pass, submittedMap, 1);
        });

        it(`should ${shouldPass('acceptedRequest')} a user with an accepted testing request`, async () => {
          const pass = passes('acceptedRequest');

          mockMapValue(map);
          mockUserValue({ id: 1, roles: 0 });
          mockTestingReqExists(true);
          mockMapCreditExists(false);

          await expects(pass, map);
        });

        it(`should ${shouldPass('inCredits')} a user in the credits`, async () => {
          const pass = passes('inCredits');

          mockMapValue(map);
          mockUserValue({ id: 1, roles: 0 });
          mockTestingReqExists(false);
          mockMapCreditExists(true);

          await expects(pass, map);
        });

        it('should reject a user that does not match any above conditions', async () => {
          mockMapValue(map);
          mockUserValue({ id: 1, roles: 0 });
          mockTestingReqExists(false);
          mockMapCreditExists(false);

          await expects(false, map);
        });
      });
    }
  });
});
