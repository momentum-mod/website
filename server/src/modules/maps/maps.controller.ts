import { Body, Controller, Get, Param, Post, Query, UploadedFile, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiQuery, ApiTags, ApiParam, ApiConsumes } from '@nestjs/swagger';
import { PaginatedResponseDto } from '../../@common/dto/paginated-response.dto';
import { MapsService } from './maps.service';
import { MapDto } from '../../@common/dto/map/map.dto';
import { CreateMapDto } from '../../@common/dto/map/createMap.dto';
import { FileInterceptor } from '@nestjs/platform-express';

@ApiBearerAuth()
@Controller('api/v1/maps')
@ApiTags('Maps')
export class MapsController {
    constructor(private readonly mapsService: MapsService) {}

    @Get()
    @ApiOperation({ summary: 'Returns all maps' })
    @ApiQuery({
        name: 'skip',
        type: Number,
        description: 'Offset this many records',
        required: false
    })
    @ApiQuery({
        name: 'take',
        type: Number,
        description: 'Take this many records',
        required: false
    })
    public GetAllMaps(
        @Query('skip') skip?: number,
        @Query('take') take?: number
    ): Promise<PaginatedResponseDto<MapDto>> {
        return this.mapsService.GetAll(skip, take);
    }

    @Get('/:mapID')
    @ApiOperation({ summary: 'Returns a single map' })
    @ApiParam({
        name: 'mapID',
        type: Number,
        description: 'Target Map ID',
        required: true
    })
    public GetMap(@Param('mapID') mapID: number): Promise<MapDto> {
        return this.mapsService.Get(mapID);
    }

    @Post()
    @ApiOperation({ summary: 'Creates a single map' })
    @ApiBody({
        type: CreateMapDto,
        description: 'Create map data transfer object',
        required: true
    })
    public CreateMap(@Body() mapCreateObj: CreateMapDto): Promise<MapDto> {
        return this.mapsService.Insert(mapCreateObj);
    }

    @Post('/:mapID/upload')
    @ApiOperation({ summary: 'Uploads a single map' })
    @ApiParam({
        name: 'mapID',
        type: Number,
        description: 'Target Map ID',
        required: true
    })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                file: {
                    type: 'string',
                    format: 'binary'
                }
            }
        }
    })
    @UseInterceptors(FileInterceptor('file'))
    public UploadMap(@Param('mapID') mapID: number, @UploadedFile() mapFile: Express.Multer.File): Promise<MapDto> {
        // see https://stackoverflow.com/questions/66605192/file-uploading-along-with-other-data-in-swagger-nestjs
        // for swagger shit
        return this.mapsService.Upload(+mapID, mapFile.buffer);
    }
}
