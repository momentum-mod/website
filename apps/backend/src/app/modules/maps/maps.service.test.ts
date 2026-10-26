import * as assert from 'node:assert/strict';
import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import { Test, TestingModule } from '@nestjs/testing';
import { mockDeep, resetDeepMockCalls } from '@momentum/test-utils';
import {
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException
} from '@nestjs/common';
import { MapStatus, Role } from '@momentum/constants';
import * as Enum from '@momentum/enum';
import { EXTENDED_PRISMA_SERVICE } from '../database/db.constants';
import {
  PRISMA_MOCK_PROVIDER,
  PrismaMock
} from '../../../../test/prisma-mock.const';
import { MapsService } from './maps.service';

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
    assert.notStrictEqual(service, undefined);
  });

  //prettier-ignore
  describe('getMapAndCheckReadAccess', () => {
    // Not every test calls every mock we set for it, so clear after each test.
    it('should 404 for a missing map', async () => {
      db.mMap.findUnique.mock.mockImplementationOnce(() => Promise.resolve(undefined));

      await assert.rejects(service.getMapAndCheckReadAccess({ mapID: 1, userID: 1 }), NotFoundException);
    });

    it('should 500 for invalid map data', async () => {
      db.mMap.findUnique.mock.mockImplementationOnce(() => Promise.resolve('sausage' as any));

      await assert.rejects(service.getMapAndCheckReadAccess({ mapID: 1, userID: 1 }), InternalServerErrorException);
    });

     it('should only non-logged in requests to access APPROVED and PUBLIC_TESTING maps', async () => {
       for (const status of Enum.values(MapStatus)) {
           db.mMap.findUnique.mock.mockImplementationOnce(() => Promise.resolve({id: 1, status } as any));

           if ([MapStatus.APPROVED, MapStatus.PUBLIC_TESTING, MapStatus.FINAL_APPROVAL].includes(status)) {
             assert.ok(await service.getMapAndCheckReadAccess({ mapID: 1, }));
           } else {
             await assert.rejects(service.getMapAndCheckReadAccess({ mapID: 1 }), ForbiddenException);
           }
       }
     });

    // Map of what states should PASS access checks for each MapStatus,
    // otherwise should fail. Below code performs each check against each state.
    const tests = {
      [MapStatus.APPROVED]: 'any',
      [MapStatus.PUBLIC_TESTING]: 'any',
      [MapStatus.PRIVATE_TESTING]: ['admin', 'moderator', 'submitter', 'acceptedRequest', 'inCredits'],
      [MapStatus.CONTENT_APPROVAL]: ['admin', 'moderator', 'submitter' ,'reviewer',  'acceptedRequest', 'inCredits'],
      [MapStatus.FINAL_APPROVAL]: 'any',
      [MapStatus.DISABLED]: ['admin', 'moderator']
    };

    const expects = async (pass: boolean, map: any, userID = 1) =>
      pass
        ? assert.partialDeepStrictEqual(await service.getMapAndCheckReadAccess({ mapID: map.id, userID }), map)
        : await assert.rejects(service.getMapAndCheckReadAccess({ mapID: map.id, userID }), ForbiddenException);

    const mockMapValue = (map) => db.mMap.findUnique.mock.mockImplementationOnce(() => Promise.resolve(map));
    const mockUserValue = (user) => db.user.findUnique.mock.mockImplementationOnce(() => Promise.resolve(user));
    const mockTestInviteExists = (exists: boolean) => db.mapTestInvite.exists.mock.mockImplementationOnce(() => Promise.resolve(exists));
    const mockMapCreditExists = (exists: boolean) => db.mapCredit.exists.mock.mockImplementationOnce(() => Promise.resolve(exists));

    for (const status of Enum.values(MapStatus)) {
      describe(MapStatus[status], () => {
        afterEach(() => {
          mock.restoreAll();
          resetDeepMockCalls();
        });

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
          mockTestInviteExists(false);
          mockMapCreditExists(false);

          await expects(pass, map);
        });

        it(`should ${shouldPass('moderator')} a moderator`, async () => {
          const pass = passes('moderator');

          mockMapValue(map);
          mockUserValue({ id: 1, roles: Role.MODERATOR });
          mockTestInviteExists(false);
          mockMapCreditExists(false);

          await expects(pass, map);
        });

        it(`should ${shouldPass('reviewer')} a reviewer`, async () => {
          const pass = passes('reviewer');

          mockMapValue(map);
          mockUserValue({ id: 1, roles: Role.REVIEWER });
          mockTestInviteExists(false);
          mockMapCreditExists(false);

          await expects(pass, map);
        });

        it(`should ${shouldPass('submitter')} the submitter`, async () => {
          const pass = passes('submitter');

          const submittedMap = { ...map, submitterID: 1 };
          mockMapValue(submittedMap);
          mockUserValue({ id: 1, roles: 0 });
          mockTestInviteExists(false);
          mockMapCreditExists(false);

          await expects(pass, submittedMap, 1);
        });

        it(`should ${shouldPass('acceptedRequest')} a user with an accepted test invite`, async () => {
          const pass = passes('acceptedRequest');

          mockMapValue(map);
          mockUserValue({ id: 1, roles: 0 });
          mockTestInviteExists(true);
          mockMapCreditExists(false);

          await expects(pass, map);
        });

        it(`should ${shouldPass('inCredits')} a user in the credits`, async () => {
          const pass = passes('inCredits');

          mockMapValue(map);
          mockUserValue({ id: 1, roles: 0 });
          mockTestInviteExists(false);
          mockMapCreditExists(true);

          await expects(pass, map);
        });

        it('should reject a user that does not match any above conditions', async () => {
          mockMapValue(map);
          mockUserValue({ id: 1, roles: 0 });
          mockTestInviteExists(false);
          mockMapCreditExists(false);

          await expects(false, map);
        });
      });
    }
  });
});
