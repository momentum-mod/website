import { Profile, User } from '@prisma/client';
import { UserDto } from './user.dto';

export class ProfileDto {
    id: number;
    bio: string;
    createdAt: Date;
    updatedAt: Date;
    userID: number;
    featuredBadgeID: number;

    constructor(_profile: Profile) {
        this.id = _profile.id;
        this.bio = _profile.bio;
        this.createdAt = _profile.createdAt;
        this.updatedAt = _profile.updatedAt;
        this.userID = _profile.userID;
        this.featuredBadgeID = _profile.featuredBadgeID;
    }
}

export class UserProfileDto extends UserDto {
    profile: ProfileDto;

    constructor(_user: User, _profile: Profile) {
        super(_user);
        this.profile = new ProfileDto(_profile);
    }
}
