import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { DtoFactory, MapImageDto } from '@momentum/backend/dto';
import { MapStatus } from '@momentum/constants';
import { FileStoreCloudFile } from '../filestore/file-store.interface';
import sharp from 'sharp';
import { DbService } from '../database/db.service';
import { FileStoreCloudService } from '../filestore/file-store-cloud.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MapImageService {
  constructor(
    private readonly db: DbService,
    private readonly fileCloudService: FileStoreCloudService,
    private readonly config: ConfigService
  ) {}

  async getImages(mapID: number): Promise<MapImageDto[]> {
    if (!(await this.db.map.exists({ where: { id: mapID } })))
      throw new NotFoundException('Map not found');

    const images = await this.db.mapImage.findMany({ where: { mapID } });

    return images.map((x) => DtoFactory(MapImageDto, x));
  }

  async getImage(imgID: number): Promise<MapImageDto> {
    const img = await this.db.mapImage.findUnique({ where: { id: imgID } });

    if (!img) throw new NotFoundException('Map image not found');

    return DtoFactory(MapImageDto, img);
  }

  async createImage(
    userID: number,
    mapID: number,
    imgBuffer: Buffer
  ): Promise<MapImageDto> {
    const map = await this.db.map.findUnique({ where: { id: mapID } });

    if (!map) throw new NotFoundException('Map not found');

    if (map.submitterID !== userID)
      throw new ForbiddenException('User is not the submitter of the map');

    if (map.status !== MapStatus.NEEDS_REVISION)
      throw new ForbiddenException('Map is not in NEEDS_REVISION state');

    const images = await this.db.mapImage.findMany({ where: { mapID } });
    let imageCount = images.length;
    if (map.thumbnailID) imageCount--; // Don't count the thumbnail towards this limit
    if (imageCount >= this.config.get('limits.mapImageUploads'))
      throw new ConflictException('Map image file limit reached');

    // It may seem strange to create an entry with nothing but a key into Map,
    // but we're doing it so we get an ID from Postgres, and can store the image
    // file at a corresponding URL.
    const newImage = await this.db.mapImage.create({ data: { mapID } });

    const uploadedImages = await this.storeMapImage(imgBuffer, newImage.id);

    if (!uploadedImages) {
      await this.db.mapImage.delete({ where: { id: newImage.id } });
      throw new BadGatewayException('Error uploading image to CDN');
    }

    return DtoFactory(MapImageDto, newImage);
  }

  async updateImage(
    userID: number,
    imgID: number,
    imgBuffer: Buffer
  ): Promise<void> {
    await this.editMapImageChecks(userID, imgID);

    const uploadedImages = await this.storeMapImage(imgBuffer, imgID);

    if (!uploadedImages)
      throw new BadGatewayException('Failed to upload image to CDN');
  }

  async deleteImage(userID: number, imgID: number): Promise<void> {
    await this.editMapImageChecks(userID, imgID);

    await Promise.all([
      this.deleteStoredMapImage(imgID),
      this.db.mapImage.delete({ where: { id: imgID } })
    ]);
  }

  private async editMapImageChecks(
    userID: number,
    imgID: number
  ): Promise<void> {
    const image = await this.db.mapImage.findUnique({ where: { id: imgID } });

    if (!image) throw new NotFoundException('Image not found');

    const map = await this.db.map.findUnique({ where: { id: image.mapID } });

    if (map.submitterID !== userID)
      throw new ForbiddenException('User is not the submitter of the map');

    if (map.status !== MapStatus.NEEDS_REVISION)
      throw new ForbiddenException('Map is not in NEEDS_REVISION state');
  }

  private async editSaveMapImageFile(
    imgBuffer: Buffer,
    fileName: string,
    width: number,
    height: number
  ): Promise<FileStoreCloudFile> {
    try {
      return this.fileCloudService.storeFileCloud(
        await sharp(imgBuffer)
          .resize(width, height, { fit: 'inside' })
          .jpeg({ mozjpeg: true })
          .toBuffer(),
        fileName
      );
    } catch {
      // This looks bad, but sharp is very non-specific about its errors
      throw new BadRequestException('Invalid image file');
    }
  }

  async storeMapImage(
    imgBuffer: Buffer,
    imgID: number
  ): Promise<FileStoreCloudFile[]> {
    return Promise.all([
      this.editSaveMapImageFile(imgBuffer, `img/${imgID}-small.jpg`, 480, 360),
      this.editSaveMapImageFile(
        imgBuffer,
        `img/${imgID}-medium.jpg`,
        1280,
        720
      ),
      this.editSaveMapImageFile(imgBuffer, `img/${imgID}-large.jpg`, 1920, 1080)
    ]);
  }

  async deleteStoredMapImage(imgID: number): Promise<void> {
    await Promise.all([
      this.fileCloudService.deleteFileCloud(`img/${imgID}-small.jpg`),
      this.fileCloudService.deleteFileCloud(`img/${imgID}-medium.jpg`),
      this.fileCloudService.deleteFileCloud(`img/${imgID}-large.jpg`)
    ]);
  }

  //#endregion

  //#region Thumbnails

  async updateThumbnail(
    userID: number,
    mapID: number,
    imgBuffer: Buffer
  ): Promise<void> {
    let map = await this.db.map.findUnique({
      where: { id: mapID },
      select: { thumbnailID: true, submitterID: true, status: true }
    });

    if (!map) throw new NotFoundException('Map not found');
    if (map.submitterID !== userID)
      throw new ForbiddenException('User is not the submitter of the map');
    if (map.status !== MapStatus.NEEDS_REVISION)
      throw new ForbiddenException('Map is not in NEEDS_REVISION state');

    if (!map.thumbnailID) {
      const newThumbnail = await this.db.mapImage.create({ data: { mapID } });
      map = await this.db.map.update({
        where: { id: mapID },
        data: { thumbnail: { connect: { id: newThumbnail.id } } }
      });
    }

    const thumbnail = await this.db.mapImage.findUnique({
      where: { id: map.thumbnailID }
    });

    const uploadedImages = await this.storeMapImage(imgBuffer, thumbnail.id);
    if (!uploadedImages) {
      // If the images failed to upload, we want to delete the map image object
      // if there was no previous thumbnail
      await this.db.mapImage.delete({ where: { id: thumbnail.id } });
      throw new BadGatewayException('Failed to upload image to CDN');
    }
  }
}
