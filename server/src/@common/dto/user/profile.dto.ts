import { Profile } from '@prisma/client';
import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsDate, IsInt, IsString } from 'class-validator';

export class ProfileDto {
    @ApiProperty()
    @IsInt()
    id: number;

    @ApiProperty()
    @IsString()
    bio: string;

    @ApiProperty()
    @IsDate()
    createdAt: Date;

    @ApiProperty()
    @IsDate()
    updatedAt: Date;

    @ApiProperty()
    @IsInt()
    userID: number;

    @ApiProperty()
    @IsInt()
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

export class ProfileUpdateDto extends PartialType(ProfileDto) {}
