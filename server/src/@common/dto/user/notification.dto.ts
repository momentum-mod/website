import { Notification } from '@prisma/client';
import { ApiProperty, PickType } from '@nestjs/swagger';
import { IsBoolean, IsDate, IsInt } from 'class-validator';
import { Exclude, Transform } from 'class-transformer';
import { ActivityDto } from './activity.dto';
import { DtoUtils } from '../../utils/dto-utils';
import { UserDto } from './user.dto';

export class NotificationDto implements Notification {
    @ApiProperty({
        type: Number,
        description: 'The ID of the notification'
    })
    @IsInt()
    id: number;

    @ApiProperty({
        type: Boolean,
        description: 'Whether the notification has been read by the user'
    })
    @IsBoolean()
    read: boolean;

    @Exclude()
    userID: number;

    @ApiProperty({
        type: UserDto,
        description: 'The user that the notification is for'
    })
    @Transform(({ value }) => DtoUtils.Factory(UserDto, value))
    user: UserDto;

    @Exclude()
    activityID: number;

    @ApiProperty({
        type: ActivityDto,
        description: 'The activity that the notification is about'
    })
    @Transform(({ value }) => DtoUtils.Factory(ActivityDto, value))
    activity: ActivityDto;

    @ApiProperty()
    @IsDate()
    createdAt: Date;

    @ApiProperty()
    @IsDate()
    updatedAt: Date;
}

export class UpdateNotificationDto extends PickType(NotificationDto, ['read'] as const) {}
