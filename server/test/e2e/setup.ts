import 'tsconfig-paths/register'; // This MUST be imported for absolute modules to be recognised!
import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { nuke } from '@db/scripts/nuke';
import { DeleteObjectsCommand, ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3';

export default async () => {
    // Load in environment variables
    config({ path: '../.env' });

    const prisma = new PrismaClient();

    // Nuke the current DB (Bye)
    await nuke(prisma);
    await prisma.$disconnect();

    const s3 = new S3Client({
        region: process.env.STORAGE_REGION,
        endpoint:
            process.env.IS_DOCKERIZED_API === 'true'
                ? process.env.STORAGE_ENDPOINT_URL_DOCKERIZED
                : process.env.STORAGE_ENDPOINT_URL,
        credentials: {
            accessKeyId: process.env.STORAGE_ACCESS_KEY_ID,
            secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY
        },
        forcePathStyle: true
    });

    // Clear out the S3 bucket
    const objects = await s3.send(new ListObjectsV2Command({ Bucket: process.env.STORAGE_BUCKET_NAME }));
    if (objects?.Contents?.length > 0)
        await s3.send(
            new DeleteObjectsCommand({
                Bucket: process.env.STORAGE_BUCKET_NAME,
                Delete: { Objects: objects.Contents.map((object) => ({ Key: object.Key })) }
            })
        );
};
