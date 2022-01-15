import { Follow } from "@prisma/client";
import { UserProfileDto } from "./profile.dto";

export class FollowerDto {
    notifyOn: number;
    createdAt: Date;
    updatedAt: Date;
    followeeID: number;
    followedID: number;
    followed: UserProfileDto;
    followee: UserProfileDto;

    constructor(
        _follow: Follow,
        _followed: UserProfileDto,
        _followee: UserProfileDto
    ){
        this.notifyOn = _follow.notifyOn;
        this.createdAt = _follow.createdAt;
        this.updatedAt = _follow.updatedAt;
        this.followedID = _follow.followedID;
        this.followeeID = _follow.followeeID;
        this.followed = _followed;
        this.followee = _followee;
    }
}
