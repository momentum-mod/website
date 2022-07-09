import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { Map, MapZone, MapZoneTrigger, Prisma } from '@prisma/client';

@Injectable()
export class MapsRepoService {
    constructor(private prisma: PrismaService) {}

    //#region Map

    async create(input: MapCreateRequireInfoAndTracks): Promise<Map> {
        const map = await this.prisma.map.create({
            data: input,
            include: {
                tracks: true
            }
        });

        const mainTrack = map.tracks.find((track) => track.trackNum === 0);

        // We also want to ensure that various stats entries are initialised when creating maps, but requires
        // complex (and slow) looping, which the logic in the maps service already needs to do. So it's being done there
        // for now, worth keeping in mind if anything else ever needs this method (nothing should really).

        return await this.prisma.map.update({
            where: { id: map.id },
            data: {
                mainTrack: {
                    connect: {
                        id: mainTrack.id
                    }
                }
            },
            include: {
                info: true,
                credits: true,
                tracks: true
            }
        });
    }

    async update(mapId: number, data: Prisma.MapUpdateInput): Promise<Map> {
        return await this.prisma.map.update({
            where: {
                id: mapId
            },
            data: data
        });
    }

    async getAll(
        where: Prisma.MapWhereInput,
        include?: Prisma.MapInclude,
        order?: Prisma.MapOrderByWithRelationInput,
        skip?: number,
        take?: number
    ): Promise<[Map[], number]> {
        const count = await this.prisma.map.count({
            where: where
        });

        const maps = await this.prisma.map.findMany({
            where: where,
            skip: skip,
            take: take,
            include: include,
            orderBy: {
                createdAt: 'desc'
            }
        });

        return [maps, count];
    }

    async get(id: number, include?: Prisma.MapInclude): Promise<Map> {
        return await this.prisma.map.findFirst({
            where: {
                id: id
            },
            include: include
        });
    }

    async count(where: Prisma.MapWhereInput): Promise<number> {
        return await this.prisma.map.count({
            where: where
        });
    }

    //#region MapCredit

    async updateCredit(
        where: Prisma.MapCreditWhereInput,
        input: Prisma.MapCreditUncheckedUpdateManyInput
    ): Promise<void> {
        await this.prisma.mapCredit.updateMany({
            where: where,
            data: input
        });
    }

    //#endregion

    //#region MapTrack
    // TODO: I assume we'll do more here in the future, I just need this rn

    async updateMapTrack(where: Prisma.MapTrackWhereUniqueInput, input: Prisma.MapTrackUpdateInput): Promise<void> {
        await this.prisma.mapTrack.update({
            where: where,
            data: input
        });
    }

    //#endregion

    //#region MapZone

    async createMapZone(input: Prisma.MapZoneCreateInput): Promise<MapZone> {
        return await this.prisma.mapZone.create({
            data: input
        });
    }

    //#endregion

    //#region MapZoneTrigger

    async createMapZoneTrigger(input: Prisma.MapZoneTriggerCreateInput): Promise<MapZoneTrigger> {
        return await this.prisma.mapZoneTrigger.create({
            data: input
        });
    }

    //#region
}

// We can't enforce this at a Prisma level (https://github.com/prisma/prisma/discussions/12866)
// but maps should always have MapInfo data.
export type MapCreateRequireInfoAndTracks = Prisma.MapCreateInput & {
    info: NonNullable<Prisma.MapCreateInput['info']>;
    tracks: NonNullable<Prisma.MapCreateInput['tracks']>;
};
