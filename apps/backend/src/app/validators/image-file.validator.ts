import { FileValidator } from '@nestjs/common';
import sharp from 'sharp';
import * as Multer from '@nest-lab/fastify-multer';
import { IFile } from '@nestjs/common/pipes/file/interfaces';
import { ImageType } from '@momentum/constants';

// Fastify Multer's version has `size` optional for some reason, let Nest
// interface take precedence.
type NestCompatibleFile = Multer.File & IFile;

export interface ImageFileValidatorOptions {
  /** Omit to accept any format */
  format?: ImageType; // Not bother handling an array for now
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
}

/**
 * Basic validator using sharp to validate JPEG and PNG metadata.
 */
export class ImageFileValidator extends FileValidator<
  ImageFileValidatorOptions,
  NestCompatibleFile
> {
  async isValid(file?: NestCompatibleFile): Promise<boolean> {
    if (!file) return false;
    let mimetype: ImageType | undefined;
    if (file.mimetype) {
      if (/^image\/(jpg|jpeg)$/.test(file.mimetype)) {
        mimetype = ImageType.JPG;
      } else if (file.mimetype === 'image/png') {
        mimetype = ImageType.PNG;
      } else if (file.mimetype === 'application/octet-stream') {
        // Some endpoints take an octet-stream, so no mimetype
      } else {
        return false;
      }
    }

    let metadata: sharp.Metadata;
    try {
      // This does the brunt of the validation - sharp will autodetect image
      // formats, and throw if it can't parse it at all
      metadata = await sharp(file.buffer).metadata();
    } catch {
      return false;
    }

    const { format, minWidth, minHeight, maxWidth, maxHeight } =
      this.validationOptions;

    // No big deal if we don't have a mimetype, we trust what sharp says. But
    // if we DO have a mimetime, check they match.
    if (mimetype !== undefined) {
      if (format && format !== mimetype) {
        return false;
      }
      if (!ImageFileValidator.compareImageType(mimetype, metadata.format)) {
        return false;
      }
    } else {
      if (
        format &&
        !ImageFileValidator.compareImageType(format, metadata.format)
      ) {
        return false;
      }
      if (!['png', 'jpeg', 'jpg'].includes(metadata.format)) {
        return false;
      }
    }

    return (
      metadata.width >= (minWidth ?? 1) &&
      metadata.height >= (minHeight ?? 1) &&
      metadata.width <= (maxWidth ?? 8192) &&
      metadata.height <= (maxHeight ?? 8192)
    );
  }

  private static compareImageType(
    imageType: ImageType,
    sharpType: keyof sharp.FormatEnum
  ): boolean {
    switch (imageType) {
      case ImageType.JPG:
        return ['jpeg', 'jpg'].includes(sharpType);
      case ImageType.PNG:
        return sharpType === 'png';
    }
  }

  buildErrorMessage(): string {
    return 'Invalid image file';
  }
}
