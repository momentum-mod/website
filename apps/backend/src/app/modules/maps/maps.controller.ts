import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  Patch,
  Post,
  Put,
  Query,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiConsumes,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags
} from '@nestjs/swagger';
import { MapsService } from './maps.service';
import { FastifyReply } from 'fastify';
import { FileInterceptor } from '@nest-lab/fastify-multer';
import { RanksService } from '../ranks/ranks.service';
import { RolesGuard } from '../auth/roles.guard';
import { RunsService } from '../runs/runs.service';
import {
  ApiOkPagedResponse,
  CreateMapCreditDto,
  CreateMapDto,
  MapCreditDto,
  MapCreditsGetQueryDto,
  MapDto,
  MapImageDto,
  MapInfoDto,
  MapRankGetNumberQueryDto,
  MapRanksGetQueryDto,
  MapsCtlGetAllQueryDto,
  MapsCtlRunsGetAllQueryDto,
  MapsGetQueryDto,
  MapTrackDto,
  PagedResponseDto,
  RankDto,
  RunDto,
  UpdateMapCreditDto,
  UpdateMapDto,
  UpdateMapInfoDto
} from '@momentum/backend/dto';
import { LoggedInUser, Roles } from '@momentum/backend/decorators';
import { Role } from '@momentum/constants';
import { ParseIntSafePipe } from '@momentum/backend/pipes';
import { Config } from '@momentum/backend/config';

@Controller('maps')
@UseGuards(RolesGuard)
@ApiTags('Maps')
@ApiBearerAuth()
export class MapsController {
  constructor(
    private readonly mapsService: MapsService,
    private readonly runsService: RunsService,
    private readonly ranksService: RanksService
  ) {}

  //#region Main Map Endpoints

  @Get()
  @ApiOperation({ summary: 'Returns all maps' })
  @ApiOkPagedResponse(MapDto, { description: 'Paginated list of maps' })
  getAllMaps(
    @LoggedInUser('id') userID: number,
    @Query() query?: MapsCtlGetAllQueryDto
  ): Promise<PagedResponseDto<MapDto>> {
    return this.mapsService.getAll(userID, query);
  }

  @Post()
  @Roles(Role.MAPPER, Role.MODERATOR, Role.ADMIN)
  @ApiOperation({ summary: 'Creates a single map' })
  @ApiOkResponse({ type: MapDto, description: 'The newly created map' })
  @ApiForbiddenResponse({ description: 'User does not have the Mapper role' })
  @ApiBadRequestResponse({ description: 'Map object is invalid' })
  @ApiConflictResponse({ description: 'Map already exists' })
  @ApiConflictResponse({
    description: 'Submitter has reached pending map limit'
  })
  @ApiBody({
    type: CreateMapDto,
    description: 'The create map data transfer object',
    required: true
  })
  async createMap(
    @Res({ passthrough: true }) res: FastifyReply,
    @Body() body: CreateMapDto,
    @LoggedInUser('id') userID: number
  ): Promise<MapDto> {
    const map = await this.mapsService.create(body, userID);

    // TODO: This is pointless, frontend knows this URL from the map ID.
    // However we are going to want this and the getUploadLocation endpoints
    // in the future when (if?) we move to direct upload to s3 using presigned
    // URLs.
    this.setMapUploadLocationHeader(res, map.id);

    return map;
  }

  @Get('/:mapID')
  @ApiOperation({ summary: 'Returns a single map' })
  @ApiParam({
    name: 'mapID',
    type: Number,
    description: 'Target Map ID',
    required: true
  })
  @ApiOkResponse({ type: MapDto, description: 'The found map' })
  @ApiNotFoundResponse({ description: 'Map was not found' })
  getMap(
    @LoggedInUser('id') userID: number,
    @Param('mapID', ParseIntSafePipe) mapID: number,
    @Query() query?: MapsGetQueryDto
  ): Promise<MapDto> {
    return this.mapsService.get(mapID, userID, query.expand);
  }

  @Patch('/:mapID')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(Role.MAPPER, Role.MODERATOR, Role.ADMIN)
  @ApiOperation({ summary: "Updates a single map's status flag" })
  @ApiParam({
    name: 'mapID',
    type: Number,
    description: 'Target Map ID',
    required: true
  })
  @ApiNoContentResponse({ description: 'Map status updated successfully' })
  @ApiNotFoundResponse({ description: 'Map was not found' })
  @ApiForbiddenResponse({ description: 'User is not the submitter of the map' })
  @ApiBadRequestResponse({
    description: "Map's status does not allow updating"
  })
  updateMap(
    @LoggedInUser('id') userID: number,
    @Param('mapID', ParseIntSafePipe) mapID: number,
    @Body() body: UpdateMapDto
  ): Promise<void> {
    return this.mapsService.update(mapID, userID, body);
  }

  //#endregion

  //#region Upload/Download

  @Get('/:mapID/upload')
  @Roles(Role.MAPPER, Role.MODERATOR, Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Get the map upload endpoint in response header' })
  @ApiNoContentResponse({
    description: 'The Location in header was set to the upload endpoint'
  })
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
    @Param('mapID', ParseIntSafePipe) mapID: number
  ): Promise<void> {
    await this.mapsService.canUploadMap(mapID, userID);

    this.setMapUploadLocationHeader(res, mapID);
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
  @ApiOkResponse({
    type: MapDto,
    description: 'The map object with updated downloadURL'
  })
  @ApiNotFoundResponse({ description: 'Map was not found' })
  @ApiForbiddenResponse({ description: 'User does not have the Mapper role' })
  @ApiForbiddenResponse({ description: 'User is not the submitter of the map' })
  @ApiForbiddenResponse({ description: 'Map is not in ACCEPTS_REVISION state' })
  uploadMap(
    @LoggedInUser('id') userID: number,
    @Param('mapID', ParseIntSafePipe) mapID: number,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: Config.limits.mapSize })
        ]
      })
    )
    file
  ): Promise<MapDto> {
    // We could do a great more validation here in the future using a custom
    // pipe, probably when we work on map submission. Anyone fancy writing a BSP
    // parser in JS?
    if (!file || !file.buffer || !Buffer.isBuffer(file.buffer))
      throw new BadRequestException('Map is not valid');

    return this.mapsService.upload(mapID, userID, file.buffer);
  }

  @Get('/:mapID/download')
  @ApiOperation({ summary: "Download the map's BSP file" })
  @Header('Content-Type', 'application/octet-stream')
  @ApiOkResponse({ description: "The map's BSP file" })
  @ApiNotFoundResponse({ description: 'Map was not found' })
  @ApiNotFoundResponse({ description: "Map's BSP file could not be found" })
  @ApiParam({
    name: 'mapID',
    type: Number,
    description: 'Target Map ID',
    required: true
  })
  downloadMap(
    @Param('mapID', ParseIntSafePipe) mapID: number
  ): Promise<StreamableFile> {
    return this.mapsService.download(mapID);
  }

  //#endregion

  //#region Credits

  @Get('/:mapID/credits')
  @ApiOperation({ summary: "Gets a single map's credits" })
  @ApiParam({
    name: 'mapID',
    type: Number,
    description: 'Target Map ID',
    required: true
  })
  @ApiOkPagedResponse(MapCreditDto, {
    description: "The found map's credits"
  })
  @ApiNotFoundResponse({ description: 'Map not found' })
  getCredits(
    @Param('mapID', ParseIntSafePipe) mapID: number,
    @Query() query?: MapCreditsGetQueryDto
  ): Promise<MapCreditDto[]> {
    return this.mapsService.getCredits(mapID, query.expand);
  }

  @Post('/:mapID/credits')
  @Roles(Role.MAPPER, Role.MODERATOR, Role.ADMIN)
  @ApiOperation({ summary: 'Adds a map credit to the map' })
  @ApiParam({
    name: 'mapID',
    type: Number,
    description: 'Target Map ID',
    required: true
  })
  @ApiCreatedResponse({ description: 'The newly added credit' })
  @ApiNotFoundResponse({ description: 'Map was not found' })
  @ApiForbiddenResponse({ description: 'User does not have the Mapper role' })
  @ApiForbiddenResponse({ description: 'User is not the submitter of the map' })
  @ApiForbiddenResponse({ description: 'Map is not in NEEDS_REVISION state' })
  @ApiBadRequestResponse({ description: 'Map credit object is invalid' })
  @ApiBadRequestResponse({ description: 'Credited user does not exist' })
  @ApiConflictResponse({ description: 'Map credit already exists' })
  @ApiBody({
    type: CreateMapCreditDto,
    description: 'The create map credit data transfer object',
    required: true
  })
  createCredit(
    @Param('mapID', ParseIntSafePipe) mapID: number,
    @Body() body: CreateMapCreditDto,
    @LoggedInUser('id') userID: number
  ): Promise<MapCreditDto> {
    return this.mapsService.createCredit(mapID, body, userID);
  }

  @Get('/credits/:mapCreditID')
  @ApiOperation({ summary: 'Gets a single map credit' })
  @ApiParam({
    name: 'mapCreditID',
    type: Number,
    description: 'Target credit ID',
    required: true
  })
  @ApiOkResponse({ type: MapCreditDto, description: 'The found map credit' })
  @ApiNotFoundResponse({ description: 'Map credit not found' })
  getCredit(
    @Param('mapCreditID', ParseIntSafePipe) mapCreditID: number,
    @Query() query?: MapCreditsGetQueryDto
  ): Promise<MapCreditDto> {
    return this.mapsService.getCredit(mapCreditID, query.expand);
  }

  @Patch('/credits/:mapCreditID')
  @Roles(Role.MAPPER, Role.MODERATOR, Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Updates the specified map credit' })
  @ApiParam({
    name: 'mapCreditID',
    type: Number,
    description: 'Target credit ID',
    required: true
  })
  @ApiBody({
    type: UpdateMapCreditDto,
    description: 'The create map credit data transfer object',
    required: true
  })
  @ApiNoContentResponse({ description: 'Map credit updated successfully' })
  @ApiBadRequestResponse({ description: 'Map credit object is invalid' })
  @ApiBadRequestResponse({ description: 'Credited user does not exist' })
  @ApiBadRequestResponse({ description: 'No update data provided' })
  @ApiForbiddenResponse({ description: 'Map is not in NEEDS_REVISION state' })
  @ApiForbiddenResponse({ description: 'User does not have the mapper role' })
  @ApiForbiddenResponse({
    description: 'User is not the submitter of this map'
  })
  @ApiConflictResponse({ description: 'Cannot have duplicate map credits' })
  @ApiNotFoundResponse({ description: 'Map credit not found' })
  updateCredit(
    @Param('mapCreditID', ParseIntSafePipe) mapCreditID: number,
    @Body() body: UpdateMapCreditDto,
    @LoggedInUser('id') userID: number
  ): Promise<void> {
    return this.mapsService.updateCredit(mapCreditID, body, userID);
  }

  @Delete('/credits/:mapCreditID')
  @Roles(Role.MAPPER, Role.MODERATOR, Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deletes the specified map credit' })
  @ApiParam({
    name: 'mapCreditID',
    type: Number,
    description: 'Target credit ID',
    required: true
  })
  @ApiOkResponse({ description: 'Map credit deleted successfully' })
  @ApiForbiddenResponse({ description: 'Map is not in NEEDS_REVISION state' })
  @ApiForbiddenResponse({ description: 'User does not have the mapper role' })
  @ApiForbiddenResponse({
    description: 'User is not the submitter of this map'
  })
  @ApiNotFoundResponse({ description: 'Map credit not found' })
  deleteCredit(
    @Param('mapCreditID', ParseIntSafePipe) mapCreditID: number,
    @LoggedInUser('id') userID: number
  ): Promise<void> {
    return this.mapsService.deleteCredit(mapCreditID, userID);
  }

  //#endregion

  //#region Info

  @Get('/:mapID/info')
  @ApiOperation({ summary: "Gets a single map's info" })
  @ApiParam({
    name: 'mapID',
    type: Number,
    description: 'Target Map ID',
    required: true
  })
  @ApiOkResponse({ type: MapInfoDto, description: "The found map's info" })
  @ApiNotFoundResponse({ description: 'Map not found' })
  getInfo(
    @Param('mapID', ParseIntSafePipe) mapID: number
  ): Promise<MapInfoDto> {
    return this.mapsService.getInfo(mapID);
  }

  @Patch('/:mapID/info')
  @Roles(Role.MAPPER, Role.MODERATOR, Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Update the map info' })
  @ApiBody({
    type: UpdateMapInfoDto,
    description: 'Update map info data transfer object',
    required: true
  })
  @ApiNoContentResponse({
    description: 'The map info was successfully updated'
  })
  @ApiBadRequestResponse({ description: 'Invalid update data' })
  @ApiForbiddenResponse({ description: 'Map is not in NEEDS_REVISION state' })
  @ApiForbiddenResponse({ description: 'User does not have the mapper role' })
  @ApiForbiddenResponse({
    description: 'User is not the submitter of this map'
  })
  @ApiNotFoundResponse({ description: 'Map not found' })
  updateInfo(
    @LoggedInUser('id') userID: number,
    @Body() updateDto: UpdateMapInfoDto,
    @Param('mapID', ParseIntSafePipe) mapID: number
  ): Promise<void> {
    return this.mapsService.updateInfo(mapID, updateDto, userID);
  }

  //#endregion

  //#region Zones

  @Get('/:mapID/zones')
  @ApiOperation({
    summary: "Gets a single map's TRACKS (yes, tracks), containing their zones"
  })
  @ApiParam({
    name: 'mapID',
    type: Number,
    description: 'Target Map ID',
    required: true
  })
  @ApiOkResponse({
    type: MapTrackDto,
    isArray: true,
    description: "The found map's tracks"
  })
  @ApiNotFoundResponse({ description: 'Map not found' })
  getZones(
    @Param('mapID', ParseIntSafePipe) mapID: number
  ): Promise<MapTrackDto[]> {
    return this.mapsService.getZones(mapID);
  }
  //#endregion

  //#region Runs

  @Get('/:mapID/runs')
  @ApiOperation({
    summary: 'Returns a paginated list of runs for a specific map'
  })
  @ApiParam({
    name: 'mapID',
    type: Number,
    description: 'Target Map ID',
    required: true
  })
  @ApiOkResponse({
    type: PagedResponseDto,
    description: "The found map's zones"
  })
  @ApiNotFoundResponse({ description: 'Map not found' })
  getRuns(
    @Param('mapID', ParseIntSafePipe) mapID: number,
    @Query() query?: MapsCtlRunsGetAllQueryDto
  ): Promise<PagedResponseDto<RunDto>> {
    return this.runsService.getAll(query);
  }

  //#endregion

  //#region Images
  @Get('/:mapID/images')
  @ApiOperation({ summary: "Gets a map's images" })
  @ApiOkResponse({ description: "The found map's images" })
  @ApiNotFoundResponse({ description: 'Map not found' })
  @ApiParam({
    name: 'mapID',
    type: Number,
    description: 'Target Map ID',
    required: true
  })
  getImages(
    @Param('mapID', ParseIntSafePipe) mapID: number
  ): Promise<MapImageDto[]> {
    return this.mapsService.getImages(mapID);
  }

  @Get('/images/:imgID')
  @ApiOperation({ summary: 'Gets a single map image' })
  @ApiOkResponse({ description: 'The found map image' })
  @ApiNotFoundResponse({ description: 'Map image not found' })
  @ApiParam({
    name: 'imgID',
    type: Number,
    description: 'Target map image'
  })
  getImage(
    @Param('imgID', ParseIntSafePipe) imgID: number
  ): Promise<MapImageDto> {
    return this.mapsService.getImage(imgID);
  }

  @Post('/:mapID/images')
  @Roles(Role.MAPPER, Role.MODERATOR, Role.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Uploads an image for the map' })
  @ApiCreatedResponse({
    description: 'The newly created map image',
    type: MapImageDto
  })
  @ApiNotFoundResponse({ description: 'Map not found' })
  @ApiForbiddenResponse({ description: 'Map is not in NEEDS_REVISION state' })
  @ApiForbiddenResponse({ description: 'User does not have the mapper role' })
  @ApiForbiddenResponse({ description: 'User is not the submitter of the map' })
  @ApiBadRequestResponse({ description: 'Invalid image data' })
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
  createImage(
    @LoggedInUser('id') userID: number,
    @Param('mapID', ParseIntSafePipe) mapID: number,
    @UploadedFile() file
  ): Promise<MapImageDto> {
    if (!file || !file.buffer || !Buffer.isBuffer(file.buffer))
      throw new BadRequestException('Invalid image data');

    return this.mapsService.createImage(userID, mapID, file.buffer);
  }

  @Put('/images/:imgID')
  @Roles(Role.MAPPER, Role.MODERATOR, Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Updates a map image' })
  @ApiNoContentResponse({ description: 'Image updated successfully' })
  @ApiNotFoundResponse({ description: 'Image not found' })
  @ApiForbiddenResponse({ description: 'Map is not in NEEDS_REVISION state' })
  @ApiForbiddenResponse({ description: 'User does not have the mapper role' })
  @ApiForbiddenResponse({ description: 'User is not the submitter of the map' })
  @ApiBadRequestResponse({ description: 'Invalid image data' })
  @ApiParam({
    name: 'imgID',
    type: Number,
    description: 'Target Image ID',
    required: true
  })
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
  updateImage(
    @LoggedInUser('id') userID: number,
    @Param('imgID', ParseIntSafePipe) imgID: number,
    @UploadedFile() file
  ): Promise<void> {
    if (!file || !file.buffer || !Buffer.isBuffer(file.buffer))
      throw new BadRequestException('Invalid image data');

    return this.mapsService.updateImage(userID, imgID, file.buffer);
  }

  @Delete('/images/:imgID')
  @Roles(Role.MAPPER, Role.MODERATOR, Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deletes a map image' })
  @ApiNoContentResponse({ description: 'Image deleted successfully' })
  @ApiNotFoundResponse({ description: 'Image not found' })
  @ApiForbiddenResponse({ description: 'Map is not in NEEDS_REVISION state' })
  @ApiForbiddenResponse({ description: 'User does not have the mapper role' })
  @ApiForbiddenResponse({ description: 'User is not the submitter of the map' })
  @ApiParam({
    name: 'imgID',
    type: Number,
    description: 'Target Image ID',
    required: true
  })
  deleteImage(
    @LoggedInUser('id') userID: number,
    @Param('imgID', ParseIntSafePipe) imgID: number
  ): Promise<void> {
    return this.mapsService.deleteImage(userID, imgID);
  }

  //#endregion

  //#region Thumbnail

  @Put('/:mapID/thumbnail')
  @Roles(Role.MAPPER, Role.MODERATOR, Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: "Updates a map's thumbnail" })
  @ApiNoContentResponse({ description: 'Thumbnail updated successfully' })
  @ApiNotFoundResponse({ description: 'Map not found' })
  @ApiForbiddenResponse({ description: 'Map is not in NEEDS_REVISION state' })
  @ApiForbiddenResponse({ description: 'User does not have the mapper role' })
  @ApiForbiddenResponse({ description: 'User is not the submitter of the map' })
  @ApiBadRequestResponse({ description: 'Invalid image data' })
  @ApiParam({
    name: 'mapID',
    type: Number,
    description: 'Target Map ID',
    required: true
  })
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
  updateThumbnail(
    @LoggedInUser('id') userID: number,
    @Param('mapID', ParseIntSafePipe) mapID: number,
    @UploadedFile() file
  ): Promise<void> {
    if (!file || !file.buffer || !Buffer.isBuffer(file.buffer))
      throw new BadRequestException('Invalid image data');

    return this.mapsService.updateThumbnail(userID, mapID, file.buffer);
  }

  //#endregion

  //#region Ranks

  @Get('/:mapID/ranks')
  @ApiOperation({ summary: "Returns a paginated list of a map's ranks" })
  @ApiParam({
    name: 'mapID',
    type: Number,
    description: 'Target Map ID',
    required: true
  })
  @ApiOkResponse({ description: "The found map's ranks" })
  getRanks(
    @Param('mapID', ParseIntSafePipe) mapID: number,
    @Query() query?: MapRanksGetQueryDto
  ): Promise<PagedResponseDto<RankDto>> {
    return this.ranksService.getRanks(mapID, query);
  }

  @Get('/:mapID/ranks/around')
  @ApiOperation({ summary: 'Returns the 9 ranks around the user' })
  @ApiParam({
    name: 'mapID',
    type: Number,
    description: 'Target Map ID',
    required: true
  })
  @ApiOkResponse({ description: 'The 9 ranks around your rank for a map' })
  getRanksAround(
    @LoggedInUser('id') userID: number,
    @Param('mapID') mapID: number,
    @Query() query?: MapRankGetNumberQueryDto
  ): Promise<PagedResponseDto<RankDto>> {
    return this.ranksService.getRankAround(userID, mapID, query);
  }

  @Get('/:mapID/ranks/friends')
  @ApiOperation({ summary: 'Returns the ranks for the users steam friends' })
  @ApiParam({
    name: 'mapID',
    type: Number,
    description: 'Target Map ID',
    required: true
  })
  @ApiOkResponse({ description: "The ranks of the user's steam friends" })
  @ApiResponse({ status: 418, description: 'The user has no friends' })
  getRanksFriends(
    @LoggedInUser('steamID') steamID: bigint,
    @Param('mapID') mapID: number,
    @Query() query?: MapRankGetNumberQueryDto
  ): Promise<PagedResponseDto<RankDto>> {
    return this.ranksService.getRankFriends(steamID, mapID, query);
  }

  @Get('/:mapID/ranks/:rankNumber')
  @ApiOperation({ summary: 'Returns the data for a specific rank' })
  @ApiParam({
    name: 'mapID',
    type: Number,
    description: 'Target Map ID',
    required: true
  })
  @ApiParam({
    name: 'rankNumber',
    type: Number,
    description: 'Target Rank',
    required: true
  })
  @ApiOkResponse({ description: 'The found rank data' })
  @ApiNotFoundResponse({ description: 'Either map or rank not found' })
  getRankNumber(
    @Param('mapID', ParseIntSafePipe) mapID: number,
    @Param('rankNumber', ParseIntSafePipe) rankNumber: number,
    @Query() query?: MapRankGetNumberQueryDto
  ): Promise<RankDto> {
    return this.ranksService.getRankNumber(mapID, rankNumber, query);
  }

  //#endregion

  //#region Private

  // Frontend reads this header property and sends upload POST to that endpoint
  private setMapUploadLocationHeader(res: FastifyReply, mapID: number): void {
    res.header('Location', `api/v1/maps/${mapID}/upload`);
  }

  //#endregion
}
