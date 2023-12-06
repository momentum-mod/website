// noinspection DuplicatedCode

import {
  createSha1Hash,
  DbUtil,
  FILES_PATH,
  RequestUtil
} from '@momentum/backend/test-utils';
import { MapDto } from '@momentum/backend/dto';
import {
  Gamemode,
  MapCreditType,
  MapStatusNew,
  MapSubmissionDate,
  MapSubmissionType,
  MIN_PUBLIC_TESTING_DURATION,
  Role,
  TrackType
} from '@momentum/constants';
import { PrismaClient } from '@prisma/client';
import {
  setupE2ETestEnvironment,
  teardownE2ETestEnvironment
} from './support/environment';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import axios from 'axios';
import Zip from 'adm-zip';
import { BabyZonesStub } from '@momentum/formats/zone';

describe('Multi-stage E2E tests', () => {
  let app, prisma: PrismaClient, req: RequestUtil, db: DbUtil;

  beforeAll(async () => {
    const env = await setupE2ETestEnvironment();
    prisma = env.prisma;
    app = env.app;
    req = env.req;
    db = env.db;
  });

  afterAll(() => teardownE2ETestEnvironment(app));

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

    const {
      body: { id: mapID }
    } = await req.postAttach({
      url: 'maps',
      status: 201,
      data: {
        name: 'todd_howard',
        fileName: 'surf_todd_howard',
        info: {
          description: 'fallout',
          creationDate: '2023-02-01T12:43:33.410Z'
        },
        submissionType: MapSubmissionType.ORIGINAL,
        placeholders: [{ alias: 'todd howard', type: MapCreditType.AUTHOR }],
        suggestions: [
          {
            gamemode: Gamemode.SURF,
            trackType: TrackType.MAIN,
            trackNum: 0,
            tier: 1,
            ranked: true
          }
        ],
        wantsPrivateTesting: true,
        credits: [
          { userID: user.id, type: MapCreditType.AUTHOR, description: 'Walrus' }
        ],
        zones: BabyZonesStub
      },
      files: [
        { file: bspBuffer, field: 'bsp', fileName: 'surf_todd_howard.bsp' },
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
          trackNum: 0
        })
      ])
    );

    await req.patch({
      url: `maps/${mapID}`,
      status: 204,
      body: { status: MapStatusNew.CONTENT_APPROVAL },
      token
    });

    await req.patch({
      url: `admin/maps/${mapID}`,
      status: 204,
      body: { status: MapStatusNew.PUBLIC_TESTING },
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

    await req.postAttach({
      url: `maps/${mapID}`,
      status: 201,
      data: { changelog: 'it just works' },
      files: [
        { file: bsp2Buffer, field: 'bsp', fileName: 'surf_todd_howard.bsp' },
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
      body: { status: MapStatusNew.FINAL_APPROVAL },
      token
    });

    // Map must have been submitted a week ago to pass. Best way to test this
    // would be Jest's `setSystemTime`, but then MinIO will refuse S3 operations
    // because it's system time is ridiculously out of sync with ours.
    // So, boring way, just patch the date in DB.
    const tmpMap = await prisma.mapSubmission.findUnique({ where: { mapID } });
    const dates = tmpMap.dates as MapSubmissionDate[];
    dates.find((x) => x.status === MapStatusNew.PUBLIC_TESTING).date = new Date(
      Date.now() - MIN_PUBLIC_TESTING_DURATION
    ).toJSON();
    await prisma.mapSubmission.update({ where: { mapID }, data: { dates } });

    await req.patch({
      url: `maps/${mapID}`,
      status: 204,
      body: { status: MapStatusNew.FINAL_APPROVAL },
      token
    });

    // Aaaaactually this is a bhop map lol. owned!
    await req.patch({
      url: `admin/maps/${mapID}`,
      status: 204,
      body: {
        status: MapStatusNew.APPROVED,
        finalLeaderboards: [
          {
            gamemode: Gamemode.BHOP,
            trackType: TrackType.MAIN,
            trackNum: 0,
            tier: 10,
            ranked: true
          }
        ]
      },
      token: adminToken
    });

    const { body: mapRes } = await req.get({
      url: `maps/${mapID}`,
      query: { expand: 'credits,info,leaderboards' },
      status: 200,
      token
    });

    expect(mapRes).toMatchObject({
      status: MapStatusNew.APPROVED,
      name: 'todd_howard',
      fileName: 'surf_todd_howard',
      credits: [
        {
          user: { alias: user.alias },
          type: MapCreditType.AUTHOR,
          description: 'Walrus'
        },
        { user: { alias: 'todd howard' }, type: MapCreditType.AUTHOR }
      ],
      info: {
        description: 'fallout',
        creationDate: '2023-02-01T12:43:33.410Z'
      },
      leaderboards: [
        {
          gamemode: Gamemode.BHOP,
          trackType: TrackType.MAIN,
          trackNum: 0,
          linear: true,
          style: 0,
          tier: 10,
          ranked: true,
          tags: []
        }
      ]
    });

    expect(bsp2Hash).not.toBe(bspHash);
    expect(vmf2Hash).not.toBe(vmfHash);
    expect(
      (mapRes.downloadURL as string).endsWith('surf_todd_howard.bsp')
    ).toBeTruthy();
    const bspDownloadBuffer = await axios
      .get(mapRes.downloadURL, { responseType: 'arraybuffer' })
      .then((res) => Buffer.from(res.data, 'binary'));
    expect(createSha1Hash(bspDownloadBuffer)).toBe(bsp2Hash);

    const vmfZip = new Zip(
      await axios
        .get(mapRes.vmfDownloadURL, { responseType: 'arraybuffer' })
        .then((res) => Buffer.from(res.data, 'binary'))
    );
    expect(
      createSha1Hash(vmfZip.getEntry('surf_todd_howard_main.vmf').getData())
    ).toBe(vmf2Hash);
    expect(
      createSha1Hash(vmfZip.getEntry('surf_todd_howard_instance.vmf').getData())
    ).toBe(vmf2Hash);
  });
});
