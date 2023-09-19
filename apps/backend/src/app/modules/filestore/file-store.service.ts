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
   * Copy an object from one key to another.
   *
   * @returns true - if successful, `false` if the source file was missing.
   * @throws S3ServiceException
   */
  abstract copyFile(fromKey: string, toKey: string): Promise<boolean>;

  /**
   * Delete a file from cloud storage.
   *
   * @returns `true` if file was found and deleted, `false` if file was missing.
   * @throws S3ServiceException
   */
  abstract deleteFile(fileKey: string): Promise<boolean>;

  /**
   * Delete multiple files from cloud storage.
   *
   * @returns `true` - if all files were found and deleted, `false` if any files
   * were missing.
   * @throws S3ServiceException
   */
  abstract deleteFiles(fileKeys: string[]): Promise<boolean>;

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
