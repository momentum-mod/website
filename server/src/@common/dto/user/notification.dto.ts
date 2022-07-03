import { Notification } from '@prisma/client';
import { ApiProperty, PickType } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsDefined, IsInt, ValidateNested } from 'class-validator';
import { Exclude, Transform } from 'class-transformer';
import { ActivityDto } from './activity.dto';
import { UserDto } from './user.dto';
import { DtoFactory } from '../../utils/dto.utility';

export class NotificationDto implements Notification {
    @ApiProperty({
        type: Number,
        description: 'The ID of the notification'
    })
    @IsDefined()
    @IsInt()
    id: number;

    @ApiProperty({
        type: Boolean,
        description: 'Whether the notification has been read by the user'
    })
    @IsDefined()
    @IsBoolean()
    read: boolean;

    @Exclude()
    userID: number;

    @ApiProperty()
    @Transform(({ value }) => DtoFactory(UserDto, value))
    @ValidateNested()
    user: UserDto;

    @Exclude()
    activityID: number;

    @ApiProperty({ description: 'The activity that the notification is about' })
    @Transform(({ value }) => DtoFactory(ActivityDto, value))
    @ValidateNested()
    activity: ActivityDto;

    @ApiProperty()
    @IsDateString()
    createdAt: Date;

    @ApiProperty()
    @IsDateString()
    updatedAt: Date;
}

export class UpdateNotificationDto extends PickType(NotificationDto, ['read'] as const) {}
