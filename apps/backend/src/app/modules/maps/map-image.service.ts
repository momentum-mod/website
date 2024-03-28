import {
  BadGatewayException,
  BadRequestException,
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  InternalServerErrorException
} from '@nestjs/common';
import {
  AdminActivityType,
  CombinedMapStatuses,
  CombinedRoles,
  imgLargePath,
  imgMediumPath,
  imgSmallPath,
  imgXlPath
} from '@momentum/constants';
import { File } from '@nest-lab/fastify-multer';
import sharp from 'sharp';
import { parallel } from '@momentum/util-fn';
import { v4 as uuidv4 } from 'uuid';
import { DtoFactory, MapImageDto } from '../../dto';
import { FileStoreFile } from '../filestore/file-store.interface';
import { FileStoreService } from '../filestore/file-store.service';
import { EXTENDED_PRISMA_SERVICE } from '../database/db.constants';
import { ExtendedPrismaService } from '../database/prisma.extension';
import { MapsService } from './maps.service';
import { Bitflags } from '@momentum/bitflags';
import { AdminActivityService } from '../admin/admin-activity.service';

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
    loggedInUserID?: number
  ): Promise<MapImageDto[]> {
    const { images } = await this.mapsService.getMapAndCheckReadAccess({
      mapID,
      userID: loggedInUserID
    });

    return images.map((id) => DtoFactory(MapImageDto, { id }));
  }

  async updateImages(
    userID: number,
    mapID: number,
    imageIDs: string[],
    files: File[]
  ): Promise<MapImageDto[]> {
    const map = await this.mapsService.getMapAndCheckReadAccess({
      mapID,
      userID
    });

    const user = await this.db.user.findUnique({ where: { id: userID } });

    const isMod = Bitflags.has(user.roles, CombinedRoles.MOD_OR_ADMIN);
    const isSubmitter = map.submitterID === userID;
    const isInSubmission = CombinedMapStatuses.IN_SUBMISSION.includes(
      map.status
    );

    if (!isMod) {
      if (!isSubmitter)
        throw new ForbiddenException('User is not the submitter of the map');

      if (!isInSubmission)
        throw new ForbiddenException(
          'Map can only be edited during submission'
        );
    }

    // imageIDs is something like [0, 1, 87as6df98-dfsg-asdf6asf-safdadaf, 2, 3]
    const newIDs = imageIDs.filter((id) => !Number.isNaN(Number(id)));
    if (newIDs.length !== (files?.length ?? 0)) {
      throw new BadRequestException(
        'Must have same number of new image places as files!'
      );
    }

    // Buffer fs tasks in case validation fails
    const fsTasks: Array<() => Promise<any>> = [];
    const newArray = [];
    for (const id of imageIDs) {
      const numberified = Number(id);
      if (Number.isNaN(numberified)) {
        // Was a UUID, so it's an existing image
        newArray.push(id);
        continue;
      }

      const newID = uuidv4();
      const file = files[numberified];
      if (!(file && file.size > 0 && Buffer.isBuffer(file.buffer)))
        throw new BadRequestException(
          'Image place does not refer to valid file'
        );

      fsTasks.push(() => this.storeMapImage(file.buffer, newID));
      newArray.push(newID);
    }

    try {
      await parallel(
        // Store new files
        ...fsTasks.map((task) => task()),
        // Delete old files
        ...map.images
          .filter((id) => !newArray.includes(id))
          .map((id) => this.deleteStoredMapImage(id))
      );
    } catch {
      throw new BadGatewayException('Failed to upload to file store');
    }

    // Once S3 upload succeeds, update array in DB, ordered correctly!
    const { images } = await this.db.mMap.update({
      where: { id: mapID },
      data: { images: newArray },
      select: { images: true }
    });

    if (isMod && !(isSubmitter && isInSubmission)) {
      await this.adminActivityService.create(
        userID,
        AdminActivityType.MAP_UPDATE,
        mapID,
        { images: newArray },
        { images: map.images }
      );
    }

    return images.map((id) => DtoFactory(MapImageDto, { id }));
  }

  async storeMapImage(
    buffer: Buffer,
    imageID: string
  ): Promise<FileStoreFile[]> {
    return parallel(
      this.storeImageFile(buffer, imgSmallPath(imageID), 480, 360),
      this.storeImageFile(buffer, imgMediumPath(imageID), 1280, 720),
      this.storeImageFile(buffer, imgLargePath(imageID), 1920, 1080),
      this.storeImageFile(buffer, imgXlPath(imageID), 2560, 1440)
    );
  }

  private async jpegEncodeImageFile(
    buffer: Buffer,
    width: number,
    height: number
  ): Promise<Buffer> {
    try {
      return sharp(buffer)
        .resize(width, height, { fit: 'inside' })
        .jpeg({ mozjpeg: true, quality: 90 })
        .toBuffer();
    } catch {
      // This looks bad, but sharp is very non-specific about its errors
      throw new BadRequestException('Invalid image file');
    }
  }

  private async storeImageFile(
    buffer: Buffer,
    fileName: string,
    width: number,
    height: number
  ): Promise<FileStoreFile> {
    const jpeg = await this.jpegEncodeImageFile(buffer, width, height);
    try {
      return this.fileStoreService.storeFile(jpeg, fileName);
    } catch {
      // This looks bad, but sharp is very non-specific about its errors
      throw new InternalServerErrorException('Failed to store image file');
    }
  }

  async deleteStoredMapImage(imageID: string): Promise<void> {
    await parallel(
      this.fileStoreService.deleteFile(imgSmallPath(imageID)),
      this.fileStoreService.deleteFile(imgMediumPath(imageID)),
      this.fileStoreService.deleteFile(imgLargePath(imageID)),
      this.fileStoreService.deleteFile(imgXlPath(imageID))
    );
  }

  //#endregion
}
