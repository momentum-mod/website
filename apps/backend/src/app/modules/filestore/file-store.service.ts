import { createHash } from 'node:crypto';
import { FileStoreFile } from './file-store.interface';

export abstract class FileStoreService {
  /**
   * Store a file buffer in cloud storage.
   *
   * @throws S3ServiceException
   */
  abstract storeFile(
    fileBuffer: Buffer,
    fileKey: string
  ): Promise<FileStoreFile>;

  /**
   * Delete a file from cloud storage.
   *
   * @returns `true` if file was found and deleted, `false` if file was missing.
   * @throws S3ServiceException
   */
  abstract deleteFile(fileKey: string): Promise<boolean>;

  /**
   * Get a file (as a byte array) from cloud storage.
   *
   * @returns A Uint8Array if found, otherwise `null`.
   * @throws S3ServiceException
   */
  abstract getFile(fileKey: string): Promise<Uint8Array | null>;

  /**
   * Get a SHA1 hash for a buffer.
   */
  static getHashForBuffer(buffer: Buffer): string {
    return createHash('sha1').update(buffer).digest('hex');
  }
}
