import { Profile } from "@prisma/client";
import { UserDto } from "./user.dto";

export class UserProfileDto extends UserDto implements Profile {
	bio: string;
	userID: number;
	featuredBadgeID: number;
	
	convertProfileToUserProfileDto(
		_profile: Profile
	) {
		this.bio = _profile.bio;
		this.userID = _profile.userID;
		this.featuredBadgeID = _profile.featuredBadgeID;
	}
}
