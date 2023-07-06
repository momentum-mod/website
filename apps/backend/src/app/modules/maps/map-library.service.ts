import {
  BadRequestException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { DbService } from '../database/db.service';

@Injectable()
export class MapLibraryService {
  constructor(private readonly db: DbService) {}

  async isMapInLibrary(userID: number, mapID: number) {
    if (!(await this.db.map.exists({ where: { id: mapID } })))
      throw new BadRequestException('Map does not exist');

    if (
      !(await this.db.mapLibraryEntry.exists({
        where: { userID, mapID }
      }))
    )
      throw new NotFoundException('Map not found');
  }
}
