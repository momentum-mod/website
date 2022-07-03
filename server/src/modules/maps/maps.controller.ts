import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, UploadedFile, UseInterceptors } from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiBody,
    ApiOperation,
    ApiTags,
    ApiParam,
    ApiConsumes,
    ApiNotFoundResponse,
    ApiOkResponse
} from '@nestjs/swagger';
import { ApiOkPaginatedResponse, PaginatedResponseDto } from '../../@common/dto/paginated-response.dto';
import { MapsService } from './maps.service';
import { CreateMapDto, MapDto } from '../../@common/dto/map/map.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { MapsGetAllQuery, MapsGetQuery } from '../../@common/dto/query/map-queries.dto';
import { Roles } from '../../@common/decorators/roles.decorator';
import { Roles as RolesEnum } from '../../@common/enums/user.enum';
import { LoggedInUser } from '../../@common/decorators/logged-in-user.decorator';

@ApiBearerAuth()
@Controller('api/v1/maps')
@ApiTags('Maps')
export class MapsController {
    constructor(private readonly mapsService: MapsService) {}

    @Get()
    @ApiOperation({ summary: 'Returns all maps' })
    @ApiOkPaginatedResponse(MapDto, { description: 'Paginated list of maps' })
    public GetAllMaps(
        @LoggedInUser('id') userID: number,
        @Query() query?: MapsGetAllQuery
    ): Promise<PaginatedResponseDto<MapDto>> {
        return this.mapsService.GetAll(
            userID,
            query.skip,
            query.take,
            query.expand,
            query.search,
            query.submitterID,
            query.type,
            query.difficultyLow,
            query.difficultyHigh,
            query.isLinear
        );
    }

    @Post()
    @Roles(RolesEnum.MAPPER)
    @ApiOperation({ summary: 'Creates a single map' })
    @ApiBody({
        type: CreateMapDto,
        description: 'Create map data transfer object',
        required: true
    })
    public CreateMap(@Body() body: CreateMapDto): Promise<MapDto> {
        return this.mapsService.Insert(body);
    }

    @Get('/:mapID')
    @ApiOperation({ summary: 'Returns a single map' })
    @ApiParam({
        name: 'mapID',
        type: Number,
        description: 'Target Map ID',
        required: true
    })
    @ApiOkResponse({ description: 'The found map' })
    @ApiNotFoundResponse({ description: 'Map was not found' })
    public GetMap(
        @LoggedInUser('id') userID: number,
        @Param('mapID', ParseIntPipe) mapID: number,
        @Query() query?: MapsGetQuery
    ): Promise<MapDto> {
        return this.mapsService.Get(mapID, userID, query.expand);
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
