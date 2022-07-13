import {
    Body,
    Controller,
    Get,
    Param,
    ParseIntPipe,
    Post,
    Query,
    Res,
    UploadedFile,
    UseInterceptors,
    HttpCode,
    HttpStatus,
    BadRequestException,
    StreamableFile
} from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiBody,
    ApiOperation,
    ApiTags,
    ApiParam,
    ApiConsumes,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiConflictResponse,
    ApiBadRequestResponse,
    ApiForbiddenResponse,
    ApiNoContentResponse
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

    //#region Map

    @Get()
    @ApiOperation({ summary: 'Returns all maps' })
    @ApiOkPaginatedResponse(MapDto, { description: 'Paginated list of maps' })
    getAllMaps(
        @LoggedInUser('id') userID: number,
        @Query() query?: MapsGetAllQuery
    ): Promise<PaginatedResponseDto<MapDto>> {
        return this.mapsService.getAll(
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
    @HttpCode(HttpStatus.NO_CONTENT)
    @Roles(RolesEnum.MAPPER)
    @ApiOperation({ summary: 'Creates a single map' })
    @ApiOkResponse({ type: MapDto, description: 'The newly created map' })
    @ApiForbiddenResponse({ description: 'User does not have the Mapper role' })
    @ApiBadRequestResponse({ description: 'Map object is invalid' })
    @ApiConflictResponse({ description: 'Map already exists' })
    @ApiConflictResponse({ description: 'Submitter has reached pending map limit' })
    @ApiBody({
        type: CreateMapDto,
        description: 'The create map data transfer object',
        required: true
    })
    async createMap(
        @Res({ passthrough: true }) res,
        @Body() body: CreateMapDto,
        @LoggedInUser('id') userID: number
    ): Promise<void> {
        const id = await this.mapsService.create(body, userID);

        MapsController.setMapUploadLocationHeader(res, id);
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
    getMap(
        @LoggedInUser('id') userID: number,
        @Param('mapID', ParseIntPipe) mapID: number,
        @Query() query?: MapsGetQuery
    ): Promise<MapDto> {
        return this.mapsService.get(mapID, userID, query.expand);
    }

    @Get('/:mapID/upload')
    @Roles(RolesEnum.MAPPER)
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Get the map upload endpoint in response header' })
    @ApiNoContentResponse({ description: 'The Location in header was set to the upload endpoint' })
    @ApiNotFoundResponse({ description: 'Map was not found' })
    @ApiForbiddenResponse({ description: 'User does not have the Mapper role' })
    @ApiForbiddenResponse({ description: 'User is not the submitter of the map' })
    @ApiForbiddenResponse({ description: 'Map is not in ACCEPTS_REVISION state' })
    @ApiParam({
        name: 'mapID',
        type: Number,
        description: 'Target Map ID',
        required: true
    })
    async getUploadLocation(
        @Res({ passthrough: true }) res,
        @LoggedInUser('id') userID: number,
        @Param('mapID', ParseIntPipe) mapID: number
    ): Promise<void> {
        await this.mapsService.canUploadMap(mapID, userID);

        MapsController.setMapUploadLocationHeader(res, mapID);
    }

    @Post('/:mapID/upload')
    @UseInterceptors(FileInterceptor('file'))
    @ApiOperation({ summary: 'Uploads a map' })
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
    @ApiOkResponse({ description: 'The map object with updated downloadURL' })
    @ApiNotFoundResponse({ description: 'Map was not found' })
    @ApiForbiddenResponse({ description: 'User does not have the Mapper role' })
    @ApiForbiddenResponse({ description: 'User is not the submitter of the map' })
    @ApiForbiddenResponse({ description: 'Map is not in ACCEPTS_REVISION state' })
    uploadMap(
        @LoggedInUser('id') userID: number,
        @Param('mapID', ParseIntPipe) mapID: number,
        @UploadedFile() file: Express.Multer.File
    ): Promise<MapDto> {
        // We could do a great more validation here in the future using a custom pipe, probably when
        // we work on map submission. Anyone fancy writing a BSP parser in JS?
        if (!file || !file.buffer || !Buffer.isBuffer(file.buffer)) throw new BadRequestException('Map is not valid');

        return this.mapsService.upload(mapID, userID, file.buffer);
    }
    //#endregion

    //#region Private

    // Frontend reads this header property and sends upload POST to that endpoint
    private static setMapUploadLocationHeader(res, mapID): void {
        res.set('Location', `api/v1/maps/${mapID}/upload`);
    }

    //#endregion
}
