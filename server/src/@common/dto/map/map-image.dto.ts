import { MapImage } from '@prisma/client';

export class MapImageDto implements MapImage {
    id: number;
    small: string;
    medium: string;
    large: string;
    createdAt: Date;
    updatedAt: Date;
    mapID: number;
}
