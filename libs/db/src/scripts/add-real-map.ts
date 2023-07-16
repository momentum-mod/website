import { PrismaClient } from '@prisma/client';
import { prismaWrapper } from './prisma-wrapper';
import { MapCreditType, MapStatus, MapType } from '@momentum/constants';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import * as fs from 'node:fs';
import sharp from 'sharp';
import path = require('node:path');
import { createHash } from 'node:crypto';

prismaWrapper(async (prisma: PrismaClient) => {
  const s3 = new S3Client({
    region: process.env['STORAGE_REGION'],
    endpoint: process.env['STORAGE_ENDPOINT_URL'],
    credentials: {
      accessKeyId: process.env['STORAGE_ACCESS_KEY_ID'],
      secretAccessKey: process.env['STORAGE_SECRET_ACCESS_KEY']
    },
    forcePathStyle: true
  });

  const Bucket = process.env['STORAGE_BUCKET_NAME'];
  const dir = path.join(__dirname, '../../../../libs/db/src/scripts/assets');
  const imageBuffer = fs.readFileSync(path.join(dir, '/bhop_apitest.jpg'));
  const mapBuffer = fs.readFileSync(path.join(dir, '/bhop_apitest.bsp'));

  const map = await prisma.map.create({
    data: {
      name: 'bhop_apitest',
      type: MapType.BHOP,
      status: MapStatus.APPROVED,
      hash: createHash('sha1').update(mapBuffer).digest('hex'),
      fileKey: 'maps/bhop_apitest.bsp',
      info: { create: { numTracks: 1, creationDate: new Date() } },
      images: { create: {} },
      stats: { create: { baseStats: { create: {} } } },
      submitter: { create: { alias: 'bhopfan9000', profile: { create: {} } } },
      tracks: {
        create: {
          trackNum: 0,
          numZones: 2,
          isLinear: true,
          difficulty: 1,
          stats: { create: { baseStats: { create: {} } } },
          zones: {
            createMany: {
              data: [{ zoneNum: 0 }, { zoneNum: 1 }, { zoneNum: 2 }]
            }
          }
        }
      }
    },
    include: {
      images: true,
      tracks: { include: { zones: true } },
      submitter: true
    }
  });

  await Promise.all(
    map.tracks.flatMap((track) =>
      track.zones.flatMap((zone) =>
        prisma.mapZone.update({
          where: { id: zone.id },
          data: { stats: { create: { baseStats: { create: {} } } } }
        })
      )
    )
  );

  await prisma.map.update({
    where: { id: map.id },
    data: {
      thumbnail: { connect: { id: map.images[0].id } },
      mainTrack: { connect: { id: map.tracks[0].id } },
      credits: {
        create: {
          user: { connect: { id: map.submitterID } },
          type: MapCreditType.AUTHOR
        }
      }
    },
    include: {
      info: true,
      images: true,
      stats: true,
      thumbnail: true,
      mainTrack: { include: { zones: true } }
    }
  });

  await prisma.mapZoneTrigger.createMany({
    data: [
      {
        zoneID: map.tracks[0].zones[0].id,
        type: 0,
        points: {
          p0: '384.000 -192.000',
          p1: '512.000 -192.000',
          p2: '512.000 192.000',
          p3: '384.000 192.000'
        },
        pointsZPos: 0,
        pointsHeight: 128
      },
      {
        zoneID: map.tracks[0].zones[2].id,
        type: 2,
        points: {
          p0: '32.000 -192.000',
          p1: '-32.000 -192.000',
          p2: '32.000 192.000',
          p3: '-32.000 192.000'
        },
        pointsZPos: 0,
        pointsHeight: 128
      }
    ]
  });
  await prisma.mapZoneTrigger.create({
    data: {
      zoneID: map.tracks[0].zones[1].id,
      type: 1,
      points: {
        p0: '-512.000 -192.000',
        p1: '-384.000 -192.000',
        p2: '-384.000 192.000',
        p3: '-512.000 192.000'
      },
      pointsZPos: 0,
      pointsHeight: 128,
      properties: {
        create: {
          properties: {
            speed_limit: '289',
            limiting_speed: '1',
            start_on_jump: '1',
            speed_limit_type: '0'
          }
        }
      }
    }
  });

  const imageID = map.images[0].id;
  await Promise.all(
    [
      { Bucket, Key: 'maps/bhop_apitest.bsp', Body: mapBuffer },
      { Bucket, Key: `img/${imageID}-large.jpg`, Body: imageBuffer },
      {
        Bucket,
        Key: `img/${imageID}-medium.jpg`,
        Body: await sharp(imageBuffer)
          .resize(1280, 720, { fit: 'inside' })
          .jpeg({ mozjpeg: true })
          .toBuffer()
      },
      {
        Bucket,
        Key: `img/${imageID}-small.jpg`,
        Body: await sharp(imageBuffer)
          .resize(480, 360, { fit: 'inside' })
          .jpeg({ mozjpeg: true })
          .toBuffer()
      }
    ].map((x) => s3.send(new PutObjectCommand(x)))
  );
});
