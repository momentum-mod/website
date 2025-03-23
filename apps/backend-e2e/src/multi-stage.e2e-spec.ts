// noinspection DuplicatedCode

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import {
  Gamemode,
  LeaderboardType,
  MapCreditType,
  MapStatus,
  MapSubmissionDate,
  MapSubmissionType,
  MIN_PUBLIC_TESTING_DURATION,
  Role,
  TrackType
} from '@momentum/constants';
import {
  createSha1Hash,
  DbUtil,
  FILES_PATH,
  FileStoreUtil,
  RequestUtil
} from '@momentum/test-utils';
import Zip from 'adm-zip';
import { BabyZonesStub } from '@momentum/formats/zone';
import { MapDto } from '../../backend/src/app/dto';
import {
  setupE2ETestEnvironment,
  teardownE2ETestEnvironment
} from './support/environment';

describe('Multi-stage E2E tests', () => {
  let app,
    prisma: PrismaClient,
    req: RequestUtil,
    db: DbUtil,
    fileStore: FileStoreUtil;

  beforeAll(async () => {
    const env = await setupE2ETestEnvironment();
    prisma = env.prisma;
    app = env.app;
    req = env.req;
    db = env.db;
    fileStore = env.fileStore;
  });

  afterAll(() => teardownE2ETestEnvironment(app, prisma));

  afterEach(() => db.cleanup('mMap', 'user'));

  it('Map submission', async () => {
    const [user, token] = await db.createAndLoginUser();
    const adminToken = await db.loginNewUser({
      data: { roles: Role.ADMIN }
    });
    const reviewerToken = await db.loginNewUser({
      data: { roles: Role.REVIEWER }
    });

    const bspBuffer = readFileSync(path.join(FILES_PATH, 'map.bsp'));
    const bspHash = createSha1Hash(bspBuffer);

    const vmfBuffer = readFileSync(path.join(FILES_PATH, 'map.vmf'));
    const vmfHash = createSha1Hash(vmfBuffer);

    const preSignedUrlRes = await req.get({
      url: 'maps/getMapUploadUrl',
      query: {
        fileSize: bspBuffer.length
      },
      status: 200,
      token
    });

    await fileStore.putToPreSignedUrl(preSignedUrlRes.body.url, bspBuffer);

    const {
      body: { id: mapID }
    } = await req.postAttach({
      url: 'maps',
      status: 201,
      data: {
        name: 'surf_todd_howard',
        info: {
          description: 'falloutfalloutfalloutfalloutfalloutfalloutfallout',
          creationDate: '2023-02-01T12:43:33.410Z'
        },
        submissionType: MapSubmissionType.ORIGINAL,
        placeholders: [{ alias: 'todd howard', type: MapCreditType.AUTHOR }],
        suggestions: [
          {
            gamemode: Gamemode.SURF,
            trackType: TrackType.MAIN,
            trackNum: 1,
            tier: 1,
            type: LeaderboardType.RANKED
          }
        ],
        wantsPrivateTesting: true,
        credits: [
          { userID: user.id, type: MapCreditType.AUTHOR, description: 'Walrus' }
        ],
        zones: BabyZonesStub
      },
      files: [
        {
          file: vmfBuffer,
          field: 'vmfs',
          fileName: 'surf_todd_howard_main.vmf'
        },
        {
          file: vmfBuffer,
          field: 'vmfs',
          fileName: 'surf_todd_howard_instance.vmf'
        }
      ],
      token
    });

    expect(await prisma.leaderboard.findMany({ where: { mapID } })).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          gamemode: Gamemode.SURF,
          trackType: TrackType.MAIN,
          trackNum: 1
        })
      ])
    );

    await req.patch({
      url: `maps/${mapID}`,
      status: 204,
      body: { status: MapStatus.CONTENT_APPROVAL },
      token
    });

    await req.patch({
      url: `admin/maps/${mapID}`,
      status: 204,
      body: { status: MapStatus.PUBLIC_TESTING },
      token: reviewerToken
    });

    // We're never gonna do full BSP parsing so this is enough to get a
    // separate hash, whilst still have a valid header.
    const bsp2Buffer = Buffer.from(bspBuffer);
    bsp2Buffer[bspBuffer.length - 100] = 0xf;
    const bsp2Hash = createSha1Hash(bsp2Buffer);

    // This should still be a valid VMF... right?
    const vmf2Buffer = Buffer.from(
      vmfBuffer.toString().replaceAll('visgroups', 'pissgroups')
    );
    const vmf2Hash = createSha1Hash(vmf2Buffer);

    const preSignedUrl2Res = await req.get({
      url: 'maps/getMapUploadUrl',
      query: {
        fileSize: bsp2Buffer.length
      },
      status: 200,
      token
    });

    await fileStore.putToPreSignedUrl(preSignedUrl2Res.body.url, bsp2Buffer);

    await req.postAttach({
      url: `maps/${mapID}`,
      status: 201,
      data: { changelog: 'it just works', hasBSP: true },
      files: [
        {
          file: vmf2Buffer,
          field: 'vmfs',
          fileName: 'surf_todd_howard_main.vmf'
        },
        {
          file: vmf2Buffer,
          field: 'vmfs',
          fileName: 'surf_todd_howard_instance.vmf'
        }
      ],
      validate: MapDto,
      token
    });

    await req.patch({
      url: `maps/${mapID}`,
      status: 403,
      body: { status: MapStatus.FINAL_APPROVAL },
      token
    });

    // Map must have been submitted a week ago to pass. Best way to test this
    // would be Jest's `setSystemTime`, but then MinIO will refuse S3 operations
    // because it's system time is ridiculously out of sync with ours.
    // So, boring way, just patch the date in DB.
    const tmpMap = await prisma.mapSubmission.findUnique({ where: { mapID } });
    const dates = tmpMap.dates as MapSubmissionDate[];
    dates.find((x) => x.status === MapStatus.PUBLIC_TESTING).date = new Date(
      Date.now() - MIN_PUBLIC_TESTING_DURATION
    ).toISOString();
    await prisma.mapSubmission.update({ where: { mapID }, data: { dates } });

    await req.patch({
      url: `maps/${mapID}`,
      status: 204,
      body: { status: MapStatus.FINAL_APPROVAL },
      token
    });

    // Aaaaactually this is a bhop map lol. owned!
    await req.patch({
      url: `admin/maps/${mapID}`,
      status: 204,
      body: {
        status: MapStatus.APPROVED,
        finalLeaderboards: [
          {
            gamemode: Gamemode.BHOP,
            trackType: TrackType.MAIN,
            trackNum: 1,
            tier: 10,
            type: LeaderboardType.UNRANKED
          }
        ]
      },
      token: adminToken
    });

    const { body: mapRes } = await req.get({
      url: `maps/${mapID}`,
      query: { expand: 'credits,info,leaderboards,currentVersion' },
      status: 200,
      token
    });

    const map = await prisma.mMap.findUnique({
      where: { id: mapID },
      include: { currentVersion: true }
    });

    expect(mapRes).toMatchObject({
      status: MapStatus.APPROVED,
      name: 'surf_todd_howard',
      credits: [
        {
          user: { alias: user.alias },
          type: MapCreditType.AUTHOR,
          description: 'Walrus'
        },
        { user: { alias: 'todd howard' }, type: MapCreditType.AUTHOR }
      ],
      info: {
        description: 'falloutfalloutfalloutfalloutfalloutfalloutfallout',
        creationDate: '2023-02-01T12:43:33.410Z'
      },
      leaderboards: [
        {
          gamemode: Gamemode.BHOP,
          trackType: TrackType.MAIN,
          trackNum: 1,
          linear: true,
          style: 0,
          tier: 10,
          type: LeaderboardType.UNRANKED,
          tags: []
        }
      ]
    });

    expect(bsp2Hash).not.toBe(bspHash);
    expect(vmf2Hash).not.toBe(vmfHash);
    expect(
      (mapRes.currentVersion.downloadURL as string).endsWith(
        `${map.currentVersion.bspDownloadId}.bsp`
      )
    ).toBeTruthy();
    const bspDownloadBuffer = await fileStore.downloadHttp(
      mapRes.currentVersion.downloadURL
    );
    expect(createSha1Hash(bspDownloadBuffer)).toBe(bsp2Hash);

    const vmfZip = new Zip(
      await fileStore.downloadHttp(mapRes.currentVersion.vmfDownloadURL)
    );
    expect(
      createSha1Hash(vmfZip.getEntry('surf_todd_howard_main.vmf').getData())
    ).toBe(vmf2Hash);
    expect(
      createSha1Hash(vmfZip.getEntry('surf_todd_howard_instance.vmf').getData())
    ).toBe(vmf2Hash);
  }, 1231123123);
});
