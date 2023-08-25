import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseArrayPipe,
  Patch,
  Post,
  Put,
  Query,
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
  MapReviewDto,
  MapReviewGetIdDto,
  MapReviewsGetQueryDto,
  MapsCtlGetAllQueryDto,
  MapsGetQueryDto,
  MapTrackDto,
  PagedResponseDto,
  RankDto,
  UpdateMapDto,
  UpdateMapInfoDto,
  VALIDATION_PIPE_CONFIG
} from '@momentum/backend/dto';
import { LoggedInUser, Roles } from '@momentum/backend/decorators';
import { Role, User } from '@momentum/constants';
import { ParseIntSafePipe } from '@momentum/backend/pipes';
import { Config } from '@momentum/backend/config';
import { MapCreditsService } from './map-credits.service';
import { MapReviewService } from './map-review.service';
import { MapImageService } from './map-image.service';

@Controller('maps')
@UseGuards(RolesGuard)
@ApiTags('Maps')
@ApiBearerAuth()
export class MapsController {
  constructor(
    private readonly mapsService: MapsService,
    private readonly mapCreditsService: MapCreditsService,
    private readonly mapReviewService: MapReviewService,
    private readonly mapImageService: MapImageService,
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
    @LoggedInUser('id') userID: number,
    @Query() query?: MapCreditsGetQueryDto
  ): Promise<MapCreditDto[]> {
    return this.mapCreditsService.getCredits(mapID, userID, query.expand);
  }

  @Get('/:mapID/credits/:userID')
  @ApiOperation({
    summary: 'Gets a MapCredit for on a map for a specific user'
  })
  @ApiParam({
    name: 'mapID',
    type: Number,
    description: 'Target Map ID',
    required: true
  })
  @ApiParam({
    name: 'userID',
    type: Number,
    description: 'Target User ID',
    required: true
  })
  @ApiOkResponse({ type: MapCreditDto, description: 'The found map credit' })
  @ApiNotFoundResponse({ description: 'Map credit not found' })
  getCredit(
    @Param('mapID', ParseIntSafePipe) mapID: number,
    @Param('userID', ParseIntSafePipe) userID: number,
    @LoggedInUser('id') loggedInUserID: number,
    @Query() query?: MapCreditsGetQueryDto
  ): Promise<MapCreditDto> {
    return this.mapCreditsService.getCredit(
      mapID,
      userID,
      loggedInUserID,
      query.expand
    );
  }

  @Put('/:mapID/credits')
  @Roles(Role.MAPPER, Role.MODERATOR, Role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Updates the MapCredits on a map'
  })
  @ApiParam({
    name: 'mapID',
    type: Number,
    description: 'Target Map ID',
    required: true
  })
  @ApiBody({
    type: Array<CreateMapCreditDto>,
    description: 'Array of map credit creation objects',
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
  updateCredits(
    @Param('mapID', ParseIntSafePipe) mapID: number,
    @Body(
      new ParseArrayPipe({
        items: CreateMapCreditDto,
        ...VALIDATION_PIPE_CONFIG
      })
    )
    body: CreateMapCreditDto[],
    @LoggedInUser('id') loggedInUserID: number
  ): Promise<MapCreditDto[]> {
    return this.mapCreditsService.updateCredits(mapID, body, loggedInUserID);
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
    @Param('mapID', ParseIntSafePipe) mapID: number,
    @LoggedInUser('id') userID: number
  ): Promise<MapInfoDto> {
    return this.mapsService.getInfo(mapID, userID);
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
    @Param('mapID', ParseIntSafePipe) mapID: number,
    @LoggedInUser('id') userID: number
  ): Promise<MapImageDto[]> {
    return this.mapImageService.getImages(mapID, userID);
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
    @Param('imgID', ParseIntSafePipe) imgID: number,
    @LoggedInUser('id') userID: number
  ): Promise<MapImageDto> {
    return this.mapImageService.getImage(imgID, userID);
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

    return this.mapImageService.createImage(userID, mapID, file.buffer);
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

    return this.mapImageService.updateImage(userID, imgID, file.buffer);
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
    return this.mapImageService.deleteImage(userID, imgID);
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

    return this.mapImageService.updateThumbnail(userID, mapID, file.buffer);
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
    @LoggedInUser('id') userID: number,
    @Query() query?: MapRanksGetQueryDto
  ): Promise<PagedResponseDto<RankDto>> {
    return this.ranksService.getRanks(mapID, userID, query);
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
    @LoggedInUser() { id, steamID }: User,
    @Param('mapID') mapID: number,
    @Query() query?: MapRankGetNumberQueryDto
  ): Promise<PagedResponseDto<RankDto>> {
    return this.ranksService.getRankFriends(id, steamID, mapID, query);
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
    @LoggedInUser('id') userID: number,
    @Query() query?: MapRankGetNumberQueryDto
  ): Promise<RankDto> {
    return this.ranksService.getRankNumber(mapID, userID, rankNumber, query);
  }

  //#endregion

  //#region Reviews

  @Get('/:mapID/reviews')
  @ApiOperation({ summary: 'Returns the reviews for a specific map' })
  @ApiParam({
    name: 'mapID',
    type: Number,
    description: 'Target Map ID',
    required: true
  })
  @ApiOkResponse({ description: 'The reviews of the requested map' })
  @ApiNotFoundResponse({ description: 'Map was not found' })
  getReviews(
    @Param('mapID', ParseIntSafePipe) mapID: number,
    @LoggedInUser('id') userID: number,
    @Query() query?: MapReviewsGetQueryDto
  ): Promise<PagedResponseDto<MapReviewDto>> {
    return this.mapReviewService.getAllReviews(mapID, userID, query);
  }

  @Get('/:mapID/reviews/:reviewID')
  @ApiOperation({ summary: 'Returns the requested review' })
  @ApiParam({
    name: 'mapID',
    type: Number,
    description: 'Target Map ID',
    required: true
  })
  @ApiParam({
    name: 'reviewID',
    type: Number,
    description: 'Target Review ID',
    required: true
  })
  @ApiOkResponse({ description: 'The requested review of the map' })
  @ApiNotFoundResponse({
    description: 'Either the map or review was not found'
  })
  getReview(
    @Param('mapID', ParseIntSafePipe) mapID: number,
    @Param('reviewID', ParseIntSafePipe) reviewID: number,
    @LoggedInUser('id') userID: number,
    @Query() query?: MapReviewGetIdDto
  ): Promise<MapReviewDto> {
    return this.mapReviewService.getReview(mapID, reviewID, userID, query);
  }

  @Delete('/:mapID/reviews/:reviewID')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deletes a map review' })
  @ApiNoContentResponse({ description: 'Review deleted successfully' })
  @ApiNotFoundResponse({ description: 'Review not found' })
  @ApiForbiddenResponse({
    description: 'User is not the submitter of the map review'
  })
  @ApiParam({
    name: 'reviewID',
    type: Number,
    description: 'Target Review ID',
    required: true
  })
  deleteReview(
    @Param('mapID', ParseIntSafePipe) mapID: number,
    @Param('reviewID', ParseIntSafePipe) reviewID: number,
    @LoggedInUser('id') userID: number
  ): Promise<void> {
    return this.mapReviewService.deleteReview(mapID, reviewID, userID);
  }
  //endregion
}
