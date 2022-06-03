import { Profile } from '@prisma/client';
import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsDate, IsInt, IsString } from 'class-validator';
import { DtoUtils } from '../../utils/dto-utils';

export class ProfileDto {
    @ApiProperty()
    @IsInt()
    id: number;

    @ApiProperty()
    @IsString()
    bio: string;

    @ApiProperty()
    @IsInt()
    userID: number;

    @ApiProperty()
    @IsInt()
    featuredBadgeID: number;

    @ApiProperty()
    @IsDate()
    createdAt: Date;

    @ApiProperty()
    @IsDate()
    updatedAt: Date;

    constructor(_profile: Partial<Profile>) {
        DtoUtils.ShapeSafeObjectAssign(this, _profile);
    }
}

export class ProfileUpdateDto extends PartialType(ProfileDto) {}
