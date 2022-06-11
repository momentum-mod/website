import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsDate, IsInt, IsString } from 'class-validator';
import { Exclude } from 'class-transformer';

export class ProfileDto {
    @Exclude()
    id: number;

    @ApiProperty({
        type: Number,
        description: 'The ID of the user'
    })
    userID: number;

    @ApiProperty({
        type: String,
        description: 'The text-based bio of the user'
    })
    @IsString()
    bio: string;

    @ApiProperty({
        type: Number,
        description: 'The ID of the badge of the user'
    })
    @IsInt()
    featuredBadgeID: number;

    @ApiProperty()
    @IsDate()
    createdAt: Date;

    @ApiProperty()
    @IsDate()
    updatedAt: Date;
}
