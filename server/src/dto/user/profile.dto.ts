import { Profile } from "@prisma/client";

export class ProfileDto {
	id: number;
	bio: string;	
    createdAt: Date;
    updatedAt: Date;
	userID: number;
	featuredBadgeID: number;
	
	constructor(
		_profile: Profile
	) {
		this.bio = _profile.bio;
		this.userID = _profile.userID;
		this.featuredBadgeID = _profile.featuredBadgeID;
	}
}

