// noinspection DuplicatedCode

import {
  AuthUtil,
  DbUtil,
  FileStoreUtil,
  RequestUtil
} from '@momentum/test-utils';
import { PrismaClient } from '@prisma/client';

import {
  setupE2ETestEnvironment,
  teardownE2ETestEnvironment
} from './support/environment';
import { MapStatusNew, NotificationType } from '@momentum/constants';
import { NotificationDto } from 'apps/backend/src/app/dto';

describe('Notifications', () => {
  let app,
    prisma: PrismaClient,
    req: RequestUtil,
    db: DbUtil,
    fileStore: FileStoreUtil,
    auth: AuthUtil;
  let user, userToken, map, user2, user2Token;

  beforeAll(async () => {
    const env = await setupE2ETestEnvironment();
    app = env.app;
    prisma = env.prisma;
    req = env.req;
    db = env.db;
    auth = env.auth;
    fileStore = env.fileStore;

    [user, userToken] = await db.createAndLoginUser();
    [user2, user2Token] = await db.createAndLoginUser();
    map = await db.createMap({
      name: 'the_map_hard_version',
      submitter: { connect: { id: user2.id } },
      status: MapStatusNew.PRIVATE_TESTING
    });
  });

  afterAll(async () => await teardownE2ETestEnvironment(app));

  beforeEach(
    async () =>
      await prisma.notification.createMany({
        data: [
          {
            targetUserID: user.id,
            type: NotificationType.ANNOUNCEMENT,
            message: 'Game will explode in 10 minutes'
          },
          {
            targetUserID: user.id,
            type: NotificationType.ANNOUNCEMENT,
            message: 'nvm game is fine'
          },
          {
            targetUserID: user.id,
            type: NotificationType.ANNOUNCEMENT,
            message: 'web dev needed urgently'
          },
          {
            targetUserID: user.id,
            type: NotificationType.MAP_TESTING_REQUEST,
            mapID: map.id,
            userID: user2.id
          },
          {
            targetUserID: user2.id,
            type: NotificationType.ANNOUNCEMENT,
            message: 'this is just for u <3'
          }
        ]
      })
  );

  afterEach(() => db.cleanup('notification'));

  describe('notifications/ GET', () => {
    it('should get a list of notifications', async () => {
      const notifs = await req.get({
        url: 'notifications',
        status: 200,
        validateArray: NotificationDto,
        token: userToken
      });
      expect(notifs.body).toHaveLength(4);
      expect(notifs.body).toMatchObject([
        {
          targetUserID: user.id,
          type: NotificationType.ANNOUNCEMENT,
          message: 'Game will explode in 10 minutes'
        },
        {
          targetUserID: user.id,
          type: NotificationType.ANNOUNCEMENT,
          message: 'nvm game is fine'
        },
        {
          targetUserID: user.id,
          type: NotificationType.ANNOUNCEMENT,
          message: 'web dev needed urgently'
        },
        {
          targetUserID: user.id,
          type: NotificationType.MAP_TESTING_REQUEST,
          mapID: map.id,
          userID: user2.id
        }
      ]);
    });
    it('should 401 when no access token is provided', () =>
      req.unauthorizedTest('notifications', 'get'));
  });
});
