import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsInt, IsOptional, IsString } from 'class-validator';
import { Exclude } from 'class-transformer';

export class ProfileDto {
    @Exclude()
    id: number;

    @ApiProperty({
        type: Number,
        description: 'The ID of the user'
    })
    @IsInt()
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
    @IsOptional()
    @IsInt()
    featuredBadgeID: number;

    @CreatedAtProperty()
    createdAt: Date;

    @UpdatedAtProperty()
    updatedAt: Date;
}
