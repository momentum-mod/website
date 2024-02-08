﻿import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client
} from '@aws-sdk/client-s3';
import { createSha1Hash } from './crypto.util';
import axios from 'axios';

/**
 * Simple handler class wrapped over the AWS S3 client for use in tests.
 */
export class FileStoreUtil {
  s3: S3Client;

  constructor() {
    this.s3 = new S3Client({
      region: process.env['STORAGE_REGION'] ?? '',
      endpoint:
        process.env['IS_DOCKERIZED_API'] === 'true'
          ? process.env['STORAGE_ENDPOINT_URL_DOCKERIZED'] ?? ''
          : process.env['STORAGE_ENDPOINT_URL'] ?? '',
      credentials: {
        accessKeyId: process.env['STORAGE_ACCESS_KEY_ID'] ?? '',
        secretAccessKey: process.env['STORAGE_SECRET_ACCESS_KEY'] ?? ''
      },
      forcePathStyle: true
    });
  }

  async add(key: string, file: Buffer): Promise<void> {
    try {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: process.env['STORAGE_BUCKET_NAME'] ?? '',
          Key: key,
          Body: file
        })
      );
    } catch {}
  }

  async delete(key: string): Promise<void> {
    try {
      await this.s3.send(
        new DeleteObjectCommand({
          Bucket: process.env['STORAGE_BUCKET_NAME'] ?? '',
          Key: key
        })
      );
    } catch {
      console.error(
        `Failed to delete file ${key}! Bucket likely now contains a junk file.`
      );
    }
  }

  async deleteDirectory(prefix: string) {
    try {
      const listedObjects = await this.s3.send(
        new ListObjectsV2Command({
          Bucket: process.env['STORAGE_BUCKET_NAME'] ?? '',
          Prefix: prefix
        })
      );

      if (listedObjects.Contents.length === 0) return;

      await this.s3.send(
        new DeleteObjectsCommand({
          Bucket: process.env['STORAGE_BUCKET_NAME'] ?? '',
          Delete: {
            Objects: listedObjects.Contents.map((object) => ({
              Key: object.Key
            }))
          }
        })
      );

      if (listedObjects.IsTruncated) await this.deleteDirectory(prefix);
    } catch {}
  }

  async get(key: string): Promise<Buffer | undefined> {
    try {
      const output = await this.s3.send(
        new GetObjectCommand({
          Bucket: process.env['STORAGE_BUCKET_NAME'] ?? '',
          Key: key
        })
      );
      return Buffer.from(await output.Body.transformToByteArray());
    } catch {
      return null;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      return !!(await this.get(key));
    } catch {
      return false;
    }
  }

  async getHash(key: string): Promise<string | undefined> {
    try {
      const buffer = await this.get(key);
      return createSha1Hash(buffer);
    } catch {
      return undefined;
    }
  }

  async checkHash(key: string, hash: string): Promise<boolean> {
    try {
      const buffer = await this.get(key);
      const fileHash = createSha1Hash(buffer);
      return fileHash === hash;
    } catch {
      return false;
    }
  }

  async downloadHttp(url: string): Promise<Buffer> {
    return axios
      .get(url, { responseType: 'arraybuffer' })
      .then((res) => Buffer.from(res.data, 'binary'));
  }
}
