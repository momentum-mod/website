import { Notification } from '@prisma/client';
import { ApiProperty, PickType } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsInt } from 'class-validator';
import { Exclude } from 'class-transformer';
import { ActivityDto } from './activity.dto';
import { UserDto } from './user.dto';
import { NestedDto } from '@lib/dto.lib';

export class NotificationDto implements Notification {
    @IdProperty()
    id: number;

    @ApiProperty({
        type: Boolean,
        description: 'Whether the notification has been read by the user'
    })
    @IsBoolean()
    read: boolean;

    @IdProperty()
    userID: number;

    @NestedDto(UserDto)
    user: UserDto;

    @IdProperty()
    activityID: number;

    @NestedDto(ActivityDto, { description: 'The activity that the notification is about' })
    activity: ActivityDto;

    @ApiProperty()
    @IsDateString()
    createdAt: Date;

    @ApiProperty()
    @IsDateString()
    updatedAt: Date;
}

export class UpdateNotificationDto extends PickType(NotificationDto, ['read'] as const) {}
