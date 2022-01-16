import { MapImage } from "@prisma/client";

export class MapImageDto implements MapImage {
    id: number;
    small: string;
    medium: string;
    large: string;
    createdAt: Date;
    updatedAt: Date;
    mapID: number;

    constructor(_mapImage: MapImage) {
        if (_mapImage === null) { return; }

        this.id = _mapImage.id;
        this.small = _mapImage.small;
        this.medium = _mapImage.medium;
        this.large = _mapImage.large;
        this.createdAt = _mapImage.createdAt;
        this.updatedAt = _mapImage.updatedAt;
        this.mapID = _mapImage.mapID;        
    }
}
