import { Activity } from '@prisma/client';
import { EActivityTypes } from '../../enums/activity.enum';
import { UserProfileDto } from './profile.dto';

export class ActivityDto {
    id: number;
    type: EActivityTypes;
    data: bigint;
    createdAt: Date;
    updatedAt: Date;
    user: UserProfileDto;

    constructor(_activity: Activity, _userProfile: UserProfileDto) {
        this.id = _activity.id;
        this.type = _activity.type;
        this.createdAt = _activity.createdAt;
        this.updatedAt = _activity.updatedAt;
        this.data = _activity.data;
        this.user = _userProfile;
    }
}
