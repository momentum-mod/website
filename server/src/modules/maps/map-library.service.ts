import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../repo/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class MapLibraryService {
    constructor(private prisma: PrismaService) {}

    async isMapInLibrary(userID: number, mapID: number) {
        const map = await this.prisma.map.findFirst({
            where: {
                id: mapID
            }
        });

        if (!map) throw new BadRequestException('Map does not exist');

        const where: Prisma.MapLibraryEntryWhereInput = {
            userID: userID,
            mapID: mapID
        };

        const dbResponse = await this.prisma.mapLibraryEntry.findFirst({
            where: where
        });

        if (!dbResponse) throw new NotFoundException('Map not found');
    }
}
