import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { EXTENDED_PRISMA_SERVICE } from '../database/db.constants';
import { ExtendedPrismaService } from '../database/prisma.extension';

@Injectable()
export class MapLibraryService {
  constructor(
    @Inject(EXTENDED_PRISMA_SERVICE) private readonly db: ExtendedPrismaService
  ) {}

  async isMapInLibrary(userID: number, mapID: number) {
    if (!(await this.db.mMap.exists({ where: { id: mapID } })))
      throw new BadRequestException('Map does not exist');

    if (
      !(await this.db.mapLibraryEntry.exists({
        where: { userID, mapID }
      }))
    )
      throw new NotFoundException('Map not found');
  }
}
