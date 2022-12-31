import { ApiProperty, PickType } from '@nestjs/swagger';
import { IsInt } from 'class-validator';
import { MapDto } from '../map/map.dto';

export class MapSummaryDto extends PickType(MapDto, ['statusFlag'] as const) {
    @ApiProperty()
    @IsInt()
    statusCount: number;
}
