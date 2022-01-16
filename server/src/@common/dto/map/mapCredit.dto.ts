import { MapCredit, User, Map } from "@prisma/client";
import { UserDto } from "../user/user.dto";
import { MapDto } from "./map.dto";

export class MapCreditDto implements MapCredit {
    id: bigint;
    type: number;
    createdAt: Date;
    updatedAt: Date;
    mapID: number;
    userID: number;

    constructor(_mapCredit: MapCredit) {
        if (_mapCredit == null) { return; }

        this.id = _mapCredit.id;
        this.type = _mapCredit.type;
        this.createdAt = _mapCredit.createdAt;
        this.updatedAt = _mapCredit.updatedAt;
        this.mapID = _mapCredit.mapID;
        this.userID = _mapCredit.userID;
    }

}

export class UserMapCreditDto extends MapCreditDto {
    user: UserDto;
    map: MapDto;

    constructor(_mapCredit: MapCredit, _user: User, _map: Map) {
        if(_mapCredit == null) { return; }

        super(_mapCredit);

        this.user = new UserDto(_user);
        this.map = new MapDto(_map);
    }
}
