import { Activity } from "@prisma/client";
import { EActivityTypes } from "../../enums/activity.enum";
import { UserDto } from "./user.dto";

export class UserActivityDto extends UserDto implements Activity {
    type: EActivityTypes;
    data: bigint;
    userID: number;
	
	convertActivityToUserActivityDto(
		_activity: Activity
	) {
        this.type = _activity.type;
        this.data = _activity.data;
        this.userID = _activity.userID;
	}
}
