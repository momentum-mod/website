import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  CopyObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { FileStoreFile } from './file-store.interface';
import { createHash } from 'node:crypto';

export class FileStoreService {
  private readonly s3Client: S3Client;
  private readonly bucket: string;

  constructor(config: S3ClientConfig) {
    this.s3Client = new S3Client({
      region: config.region,
      endpoint: config.endpointUrl,
      credentials: {
        accessKeyId: config.accessKeyID,
        secretAccessKey: config.secretAccessKey
      },
      forcePathStyle: true
    });

    this.bucket = config.bucket;
  }

  /**
   * Store a file buffer in cloud storage.
   *
   * @throws S3ServiceException
   */
  async storeFile(
    fileBuffer: Buffer,
    fileKey: string,
    contentType?: string
  ): Promise<FileStoreFile> {
    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: fileKey,
        Body: fileBuffer,
        ContentType: contentType
      })
    );

    return {
      fileKey,
      hash: FileStoreService.getHashForBuffer(fileBuffer)
    };
  }

  /**
   * Copy an object from one key to another.
   *
   * @returns true - if successful, `false` if the source file was missing.
   * @throws S3ServiceException
   */
  async copyFile(
    fromKey: string,
    toKey: string,
    metadata: Record<string, string> = {}
  ): Promise<boolean> {
    try {
      await this.s3Client.send(
        new CopyObjectCommand({
          Bucket: this.bucket,
          CopySource: `${this.bucket}/${fromKey}`,
          Key: toKey,
          Metadata: metadata
        })
      );
      return true;
    } catch (error) {
      // If file isn't found, just return undefined and let the service handle
      // 404 behaviour.
      if (error?.Code === 'NoSuchKey') return false;
      throw error;
    }
  }

  /**
   * Delete a file from cloud storage.
   *
   * @returns `true` if file was found and deleted, `false` if file was missing.
   * @throws S3ServiceException
   */
  async deleteFile(fileKey: string): Promise<boolean> {
    return this.isMissingHandler(
      this.s3Client.send(
        new DeleteObjectCommand({ Bucket: this.bucket, Key: fileKey })
      )
    );
  }

  /**
   * Delete multiple files from cloud storage.
   *
   * @returns `true` - if all files were found and deleted, `false` if any files
   * were missing.
   * @throws S3ServiceException
   */
  async deleteFiles(fileKeys: string[]): Promise<boolean> {
    // AWS S3 docs limit this command to 1000 keys, assuming other S3 providers
    // do the same.
    // https://docs.aws.amazon.com/AmazonS3/latest/API/API_DeleteObjects.html
    for (let i = 0; i < fileKeys.length; i += 1000) {
      const ok = await this.isMissingHandler(
        this.s3Client.send(
          new DeleteObjectsCommand({
            Bucket: this.bucket,
            Delete: {
              Objects: fileKeys.slice(i, i + 1000).map((Key) => ({ Key }))
            }
          })
        )
      );

      if (!ok) return false;
    }

    return true;
  }

  /**
   * Get a file (as a byte array) from cloud storage.
   *
   * @returns A Uint8Array if found, otherwise `null`.
   * @throws S3ServiceException
   */
  async getFile(fileKey: string): Promise<Uint8Array | null> {
    try {
      const commandResponse = await this.s3Client.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: fileKey
        })
      );

      return commandResponse.Body.transformToByteArray();
    } catch (error) {
      // If file isn't found, just return null and let the service handle
      // 404 behaviour.
      if (error?.Code === 'NoSuchKey') return null;
      throw error;
    }
  }

  /**
   * Get the keys of all objects in a bucket (usually with some prefix so like a
   * directory
   */
  async listFileKeys(prefix: string): Promise<string[]> {
    const response = await this.s3Client.send(
      new ListObjectsV2Command({
        Bucket: this.bucket,
        Delimiter: '/',
        Prefix: prefix
      })
    );

    if (response.KeyCount === 0 || !response.Contents) return [];
    return response.Contents.map(({ Key }) => Key);
  }

  /**
   * Get pre-signed url for an object with set key and size
   */
  async getPreSignedUrl(
    fileKey: string,
    fileSize: number,
    urlExpires: number
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: fileKey,
      ContentLength: fileSize
    });

    return await getSignedUrl(this.s3Client, command, {
      expiresIn: urlExpires
    });
  }

  private async isMissingHandler(
    commandOutput: Promise<unknown>
  ): Promise<boolean> {
    try {
      await commandOutput;
      return true;
    } catch (error) {
      // If file isn't found, just return false and let the service handle
      // 404 behaviour.
      if (error?.Code === 'NoSuchKey') return false;
      throw error;
    }
  }

  /**
   * Get a SHA1 hash for a buffer.
   */
  static getHashForBuffer(buffer: Buffer): string {
    return createHash('sha1').update(buffer).digest('hex');
  }
}

export interface S3ClientConfig {
  region: string;
  endpointUrl: string;
  accessKeyID: string;
  secretAccessKey: string;
  bucket: string;
}
