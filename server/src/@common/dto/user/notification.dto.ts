import { Notification } from '@prisma/client';
import { ApiProperty, PickType } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsDefined, IsInt, ValidateNested } from 'class-validator';
import { Exclude } from 'class-transformer';
import { ActivityDto } from './activity.dto';
import { UserDto } from './user.dto';
import { DtoTransform } from '../../utils/dto-utils';

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

    @ApiProperty({
        type: UserDto,
        description: 'The user that the notification is for'
    })
    @DtoTransform(UserDto)
    @ValidateNested()
    user: UserDto;

    @Exclude()
    activityID: number;

    @ApiProperty({
        type: ActivityDto,
        description: 'The activity that the notification is about'
    })
    @DtoTransform(ActivityDto)
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
