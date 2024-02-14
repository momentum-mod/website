import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import {
  CombinedMapStatuses,
  imgLargePath,
  imgMediumPath,
  imgSmallPath
} from '@momentum/constants';
import sharp from 'sharp';
import { parallel } from '@momentum/util-fn';
import { DtoFactory, MapImageDto } from '../../dto';
import { FileStoreFile } from '../filestore/file-store.interface';
import { FileStoreService } from '../filestore/file-store.service';
import { EXTENDED_PRISMA_SERVICE } from '../database/db.constants';
import { ExtendedPrismaService } from '../database/prisma.extension';
import { MapsService } from './maps.service';

@Injectable()
export class MapImageService {
  constructor(
    @Inject(EXTENDED_PRISMA_SERVICE) private readonly db: ExtendedPrismaService,
    @Inject(forwardRef(() => MapsService))
    private readonly mapsService: MapsService,
    private readonly fileStoreService: FileStoreService,
    private readonly adminActivityService: AdminActivityService
  ) {}

  async getImages(
    mapID: number,
    loggedInUserID: number
  ): Promise<MapImageDto[]> {
    const { images } = await this.mapsService.getMapAndCheckReadAccess({
      mapID,
      userID: loggedInUserID,
      include: { images: true }
    });

    return images.map((x) => DtoFactory(MapImageDto, x));
  }

      userID: loggedInUserID
    });

  }

    userID: number,
    mapID: number,




    }






  }

    fileName: string,
    width: number,
    height: number
  ): Promise<FileStoreFile> {
    try {
      return this.fileStoreService.storeFile(
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
  ): Promise<FileStoreFile[]> {
    return parallel(
      this.editSaveMapImageFile(imgBuffer, imgSmallPath(imgID), 480, 360),
      this.editSaveMapImageFile(imgBuffer, imgMediumPath(imgID), 1280, 720),
      this.editSaveMapImageFile(imgBuffer, imgLargePath(imgID), 1920, 1080)
    );
  }

  async deleteStoredMapImage(imgID: number): Promise<void> {
    await parallel(
      this.fileStoreService.deleteFile(imgSmallPath(imgID)),
      this.fileStoreService.deleteFile(imgMediumPath(imgID)),
      this.fileStoreService.deleteFile(imgLargePath(imgID))
    );
  }

  //#endregion
}
