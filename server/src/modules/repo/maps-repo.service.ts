import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { Map, MapCredit, MapInfo, MapStats, MapTrack, MapZone, MapZoneTrigger, Prisma } from '@prisma/client';

@Injectable()
export class MapsRepoService {
    constructor(private prisma: PrismaService) {}

    //#region Map

    async create(
        input: Prisma.MapCreateInput & {
            info: NonNullable<Prisma.MapCreateInput['info']>;
            tracks: NonNullable<Prisma.MapCreateInput['tracks']>;
        }
    ): Promise<Map> {
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

    //#endregion

    //#region MapCredit

    async findCredit(where: Prisma.MapCreditWhereInput): Promise<MapCredit> {
        return this.prisma.mapCredit.findFirst({ where: where });
    }

    async updateCredit(mapID: number, input: Prisma.MapCreditUncheckedUpdateManyInput): Promise<MapCredit> {
        return this.prisma.mapCredit.update({
            where: { id: mapID },
            data: input
        });
    }

    async updateCredits(
        where: Prisma.MapCreditWhereInput,
        input: Prisma.MapCreditUncheckedUpdateManyInput
    ): Promise<void> {
        await this.prisma.mapCredit.updateMany({
            where: where,
            data: input
        });
    }

    async getCredits(where: Prisma.MapCreditWhereInput, include?: Prisma.MapCreditInclude): Promise<MapCredit[]> {
        return this.prisma.mapCredit.findMany({ where: where, include: include });
    }

    async createCredit(input: Prisma.MapCreditCreateInput): Promise<MapCredit> {
        return this.prisma.mapCredit.create({
            data: input,
            include: {
                map: true
            }
        });
    }

    async getCredit(id: number, include?: Prisma.MapCreditInclude): Promise<MapCredit> {
        return this.prisma.mapCredit.findUnique({ where: { id: id }, include: include });
    }

    async deleteCredit(where: Prisma.MapCreditWhereUniqueInput): Promise<void> {
        await this.prisma.mapCredit.delete({ where: where });
    }

    //#endregion

    //#region MapInfo
    async getInfo(mapId: number): Promise<MapInfo> {
        const mapInfo = await this.prisma.mapInfo.findUnique({ where: { mapID: mapId } });

        return mapInfo;
    }

    async updateInfo(mapID: number, data: Prisma.MapInfoUpdateInput): Promise<MapInfo> {
        return this.prisma.mapInfo.update({
            where: {
                mapID: mapID
            },
            data: data
        });
    }
    //#endregion

    //#region Map Stats

    async updateMapStats(mapID: number, data: Prisma.MapStatsUpdateInput): Promise<MapStats> {
        return this.prisma.mapStats.update({
            where: {
                mapID: mapID
            },
            data: data
        });
    }

    //#endregion

    //#region MapTrack

    async getMapTrack(where: Prisma.MapTrackWhereInput, include?: Prisma.MapTrackInclude): Promise<MapTrack> {
        return await this.prisma.mapTrack.findFirst({ where: where, include: include });
    }

    async getMapTracks(where: Prisma.MapTrackWhereInput, include: Prisma.MapTrackInclude): Promise<MapTrack[]> {
        return this.prisma.mapTrack.findMany({
            where: where,
            include: include
        });
    }

    async updateMapTrack(where: Prisma.MapTrackWhereUniqueInput, input: Prisma.MapTrackUpdateInput): Promise<void> {
        await this.prisma.mapTrack.update({
            where: where,
            data: input
        });
    }

    async updateMapTrackStats(
        where: Prisma.MapTrackStatsWhereUniqueInput,
        input: Prisma.MapTrackStatsUpdateInput
    ): Promise<void> {
        await this.prisma.mapTrackStats.update({
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

    async updateMapZoneStats(
        where: Prisma.MapZoneStatsWhereUniqueInput,
        input: Prisma.MapZoneStatsUpdateInput
    ): Promise<void> {
        await this.prisma.mapZoneStats.update({
            where: where,
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
