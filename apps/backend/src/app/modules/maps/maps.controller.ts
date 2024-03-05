import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  MaxFileSizeValidator,
  Param,
  ParseArrayPipe,
  ParseFilePipe,
  Patch,
  Post,
  Put,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiConsumes,
  ApiForbiddenResponse,
  ApiGoneResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiServiceUnavailableResponse,
  ApiTags
} from '@nestjs/swagger';
import { File, FileFieldsInterceptor } from '@nest-lab/fastify-multer';
import {
  MAP_IMAGE_HEIGHT,
  MAP_IMAGE_WIDTH,
  MAX_MAP_IMAGE_SIZE,
  MAX_MAP_IMAGES,
  MAX_REVIEW_IMAGES,
  Role
} from '@momentum/constants';
import { ConfigService } from '@nestjs/config';
import { LeaderboardRunsService } from '../runs/leaderboard-runs.service';
import { RolesGuard } from '../auth/roles.guard';
import {
  ApiOkPagedResponse,
  CreateMapCreditDto,
  CreateMapDto,
  CreateMapReviewDto,
  CreateMapReviewWithFilesDto,
  CreateMapSubmissionVersionDto,
  CreateMapTestInviteDto,
  CreateMapWithFilesDto,
  LeaderboardRunDto,
  MapCreditDto,
  MapCreditsGetQueryDto,
  MapDto,
  MapsGetAllSubmissionQueryDto,
  MapImageDto,
  MapInfoDto,
  MapLeaderboardGetQueryDto,
  MapLeaderboardGetRunQueryDto,
  MapReviewDto,
  MapReviewsGetQueryDto,
  MapsGetAllQueryDto,
  MapsGetQueryDto,
  MapZonesDto,
  MinimalLeaderboardRunDto,
  PagedResponseDto,
  UpdateMapDto,
  UpdateMapTestInviteDto,
  VALIDATION_PIPE_CONFIG,
  UpdateMapImagesDto
} from '../../dto';
import { LoggedInUser, Roles } from '../../decorators';
import { ParseIntSafePipe } from '../../pipes';
import { FormDataJsonInterceptor } from '../../interceptors/form-data-json.interceptor';
import { UserJwtAccessPayload } from '../auth/auth.interface';
import { MapCreditsService } from './map-credits.service';
import { MapImageService } from './map-image.service';
import { MapTestInviteService } from './map-test-invite.service';
import { MapsService } from './maps.service';
import { ParseFilesPipe } from '../../pipes/parse-files.pipe';
import { ImageFileValidator } from '../../validators/image-file.validator';
import { MapReviewService } from '../map-review/map-review.service';
import { ImageType } from '@momentum/constants';
import { LeaderboardStatsDto } from '../../dto/run/leaderboard-stats.dto';
import { LeaderboardService } from '../runs/leaderboard.service';

@Controller('maps')
@UseGuards(RolesGuard)
@ApiTags('Maps')
@ApiBearerAuth()
export class MapsController {
  constructor(
    private readonly config: ConfigService,
    private readonly mapsService: MapsService,
    private readonly mapCreditsService: MapCreditsService,
    private readonly mapReviewService: MapReviewService,
    private readonly mapImageService: MapImageService,
    private readonly mapTestInviteService: MapTestInviteService,
    private readonly runsService: LeaderboardRunsService,
    private readonly leaderboardService: LeaderboardService
  ) {}

  //#region Maps

  @Get()
  @ApiOperation({ summary: 'Retrieve a paginated list of approved maps' })
  @ApiOkPagedResponse(MapDto, { description: 'Paginated list of maps' })
  getAllMaps(
    @LoggedInUser('id') userID: number,
    @Query() query?: MapsGetAllQueryDto
  ): Promise<PagedResponseDto<MapDto>> {
    return this.mapsService.getAll(userID, query);
  }

  @Get('/:mapID')
  @ApiOperation({ summary: 'Find a single map, by either ID or name' })
  @ApiParam({
    name: 'mapID',
    type: 'number/string',
    description: 'Target Map ID or name',
    required: true
  })
  @ApiOkResponse({ type: MapDto, description: 'The found map' })
  @ApiNotFoundResponse({ description: 'Map was not found' })
  getMap(
    @LoggedInUser('id') userID: number,
    @Param('mapID') mapParam: number | string,
    @Query() query?: MapsGetQueryDto
  ): Promise<MapDto> {
    // Use a string ID and we'll search by map name.
    const id = Number.isNaN(+mapParam) ? mapParam.toString() : +mapParam;
    return this.mapsService.get(id, userID, query.expand);
  }

  @Patch('/:mapID')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Updates a submitted map' })
  @ApiParam({
    name: 'mapID',
    type: Number,
    description: 'Target Map ID',
    required: true
  })
  @ApiNoContentResponse({ description: 'Map updated successfully' })
  @ApiNotFoundResponse({ description: 'Map was not found' })
  @ApiForbiddenResponse({ description: 'User is not the submitter of the map' })
  @ApiForbiddenResponse({ description: 'The map is not accepting revisions' })
  updateMap(
    @LoggedInUser('id') userID: number,
    @Param('mapID', ParseIntSafePipe) mapID: number,
    @Body() body: UpdateMapDto
  ): Promise<void> {
    return this.mapsService.updateAsSubmitter(mapID, userID, body);
  }

  //#endregion

  //#region Map Submission

  @Get('/submissions')
  @ApiOperation({ summary: 'Retrieve a paginated list of maps in submission' })
  getSubmissions(
    @Query() query: MapsGetAllSubmissionQueryDto,
    @LoggedInUser('id') userID: number
  ) {
    return this.mapsService.getAll(userID, query);
  }

  @Post()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Submits a map' })
  @ApiOkResponse({ type: MapDto, description: 'The newly created map' })
  @ApiBody({
    type: CreateMapWithFilesDto,
    description: 'The create map data transfer object',
    required: true
  })
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'bsp', maxCount: 1 },
      { name: 'vmfs', maxCount: 40 }
    ]),
    FormDataJsonInterceptor('data')
  )
  async submitMap(
    @Body('data') data: CreateMapDto,
    @UploadedFiles() files: { bsp: File[]; vmfs: File[] },
    @LoggedInUser('id') userID: number
  ): Promise<MapDto> {
    const bspFile = files.bsp?.[0];

    this.mapSubmissionFileValidation(bspFile, files.vmfs);

    return this.mapsService.submitMap(data, userID, bspFile, files.vmfs);
  }

  // TODO FRONTEND: Frontend will likely multiple requests to  /:mapID PATCH,
  // then this. Make sure that former completes before the latter. Yes this is an
  // upload so bound to take longer, but don't rely on that.
  @Post('/:mapID')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary:
      'Submits an updated map version.' +
      " This may generate new leaderboards, which uses the submission's suggestions, " +
      'if those are being changed by the user, be sure to send the /:id PATCH first!'
  })
  @ApiBody({
    type: CreateMapSubmissionVersionDto,
    required: true
  })
  @ApiOkResponse({ type: MapDto, description: 'Map with new version attached' })
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'bsp', maxCount: 1 },
      { name: 'vmfs', maxCount: 40 }
    ]),
    FormDataJsonInterceptor('data')
  )
  submitMapVersion(
    @Param('mapID', ParseIntSafePipe) mapID: number,
    @Body('data') data: CreateMapSubmissionVersionDto,
    @UploadedFiles() files: { bsp: File[]; vmfs: File[] },
    @LoggedInUser('id') userID: number
  ): Promise<MapDto> {
    const bspFile = files.bsp?.[0];

    this.mapSubmissionFileValidation(bspFile, files.vmfs);

    return this.mapsService.submitMapSubmissionVersion(
      mapID,
      data,
      userID,
      bspFile,
      files.vmfs
    );
  }

  private mapSubmissionFileValidation(bspFile: File, vmfFiles: File[]) {
    if (!bspFile || !Buffer.isBuffer(bspFile.buffer)) {
      throw new BadRequestException('Missing BSP file');
    }

    // Don't see a way to apply FileSizeValidationPipe to files individually,
    // just doing it manually. We could grab the validations from
    // https://github.com/dmitriy-nz/nestjs-form-data/tree/master/src/decorators/validation
    // if we wanted, but given the likelihood of us moving off class-validator,
    // it doesn't seem worth the effort.
    //   spooky note from the future : We could figure out a way to do the above
    //   this using new ParseFilesPipe.

    const maxBspSize = this.config.getOrThrow('limits.bspSize');
    if (bspFile.size > maxBspSize) {
      throw new BadRequestException(`BSP file too large (> ${maxBspSize})`);
    }

    const maxVmfSize = this.config.getOrThrow('limits.vmfSize');
    for (const vmfFile of vmfFiles ?? []) {
      if (vmfFile.size > maxVmfSize) {
        throw new BadRequestException(`VMF file too large (> ${maxVmfSize})`);
      }
    }
  }

  @Put('/:mapID/testInvite')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Update the private testing invites for the map' })
  @ApiParam({
    name: 'mapID',
    type: Number,
    description: 'Target Map ID',
    required: true
  })
  async updateTestInvites(
    @Param('mapID', ParseIntSafePipe) mapID: number,
    @Body() body: CreateMapTestInviteDto,
    @LoggedInUser('id') userID: number
  ) {
    await this.mapTestInviteService.updateTestInvites(
      mapID,
      body.userIDs,
      userID
    );
  }

  @Patch('/:mapID/testInviteResponse')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Accept or decline a MapTestInvite' })
  @ApiParam({
    name: 'mapID',
    type: Number,
    description: 'Target Map ID',
    required: true
  })
  async testInviteResponse(
    @Param('mapID', ParseIntSafePipe) mapID: number,
    @Body() body: UpdateMapTestInviteDto,
    @LoggedInUser('id') userID: number
  ) {
    await this.mapTestInviteService.testInviteResponse(
      mapID,
      userID,
      body.accept
    );
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
  @ApiForbiddenResponse({
    description: 'User is not the submitter of this map'
  })
  @ApiForbiddenResponse({
    description: 'Map is not accepting updates (APPROVED/DISABLED)'
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

  //#endregion

  //#region Zones

  @Get('/:mapID/zones')
  @ApiOperation({ summary: "Gets a single map's zones" })
  @ApiParam({
    name: 'mapID',
    type: Number,
    description: 'Target Map ID',
    required: true
  })
  @ApiOkResponse({
    type: MapZonesDto,
    description: "The map's zones"
  })
  @ApiNotFoundResponse({ description: 'Map not found' })
  getZones(
    @Param('mapID', ParseIntSafePipe) mapID: number
  ): Promise<MapZonesDto> {
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

  @Put('/:mapID/images')
  @UseInterceptors(
    FileFieldsInterceptor([{ name: 'images', maxCount: MAX_MAP_IMAGES }]),
    FormDataJsonInterceptor('data')
  )
  @ApiOperation({
    summary: `
      Sets the images for a map, given an 'imageIDs' array.
      
      For new images, give an stringified integer between one-five for each place, 
      which will be used to index into the array of files on the multipart form.
      
      For existing images, give its ID (uuid). Any IDs *not* included will be deleted.
      Say a map has two existing images (shortened here), abcdefgh-1234, stuvwxyz-6789.
      
      For example, calling this endpoint two image files and imageIDs = [1, abcdefgh-1234, 0],
      and we would order the second file first, then abcdefgh-1234, then the first file,
      deleting stuvwxyz-6789. The two new images would be issued new uuids, and stored 
      relative to that ID.
      `
  })
  @ApiOkResponse({
    description: 'The newly created map image',
    type: Array<MapImageDto>
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
  updateImages(
    @LoggedInUser('id') userID: number,
    @Param('mapID', ParseIntSafePipe) mapID: number,
    @Body('data') data: UpdateMapImagesDto,
    @UploadedFiles(
      new ParseFilesPipe(
        new ParseFilePipe({
          validators: [
            new ImageFileValidator({
              format: ImageType.PNG,
              minWidth: MAP_IMAGE_WIDTH,
              maxWidth: MAP_IMAGE_WIDTH,
              minHeight: MAP_IMAGE_HEIGHT,
              maxHeight: MAP_IMAGE_HEIGHT
            }),
            new MaxFileSizeValidator({ maxSize: MAX_MAP_IMAGE_SIZE })
          ]
        })
      )
    )
    files: { images?: File[] }
  ): Promise<MapImageDto[]> {
    return this.mapImageService.updateImages(
      userID,
      mapID,
      data.imageIDs,
      files.images
    );
  }

  //#endregion

  //#endregion

  //#region Runs

  @Get('/:mapID/leaderboard')
  @ApiOperation({
    summary:
      "Returns a paginated list of a leaderboard's runs. Some data the client " +
      'should already know is omitted for performance.' +
      "Warning: if the leaderboard itself doesn't exist, this endpoint will" +
      'return a 0 length PaginatedResponseDto.'
  })
  @ApiParam({
    name: 'mapID',
    type: Number,
    description: 'Target Map ID',
    required: true
  })
  @ApiOkResponse({ description: "The found leaderboard's runs" })
  @ApiNotFoundResponse({ description: "When the map doesn't exist" })
  @ApiGoneResponse({
    description:
      "When the filtering by 'around', and the user doesn't have a PB"
  })
  @ApiGoneResponse({
    description:
      "When the filtering by 'friends', and the user doesn't have any Steam friends"
  })
  @ApiServiceUnavailableResponse({
    description: "Steam fails to return the user's friends list (Tuesdays lol)"
  })
  getLeaderboards(
    @Param('mapID', ParseIntSafePipe) mapID: number,
    @LoggedInUser() { id, steamID }: UserJwtAccessPayload,
    @Query() query?: MapLeaderboardGetQueryDto
  ): Promise<PagedResponseDto<MinimalLeaderboardRunDto>> {
    return this.runsService.getRuns(mapID, query, id, steamID);
  }

  @Get('/:mapID/leaderboard/run')
  @ApiOperation({ summary: 'Returns the data for a specific leaderboard run' })
  @ApiParam({
    name: 'mapID',
    type: Number,
    description: 'Target Map ID',
    required: true
  })
  @ApiOkResponse({ type: LeaderboardRunDto })
  @ApiNotFoundResponse({ description: 'Map not found' })
  @ApiNotFoundResponse({ description: 'Run not found' })
  getLeaderboardRun(
    @Param('mapID', ParseIntSafePipe) mapID: number,
    @LoggedInUser('id') userID: number,
    @Query() query?: MapLeaderboardGetRunQueryDto
  ): Promise<LeaderboardRunDto> {
    return this.runsService.getRun(mapID, query, userID);
  }

  @Get('/:mapID/leaderboardStats')
  @ApiOperation({
    description: 'Get stats of for all the leaderboards on a map'
  })
  @ApiOkResponse({ type: LeaderboardStatsDto, isArray: true })
  getLeaderboardStats(
    @Param('mapID', ParseIntSafePipe) mapID: number,
    @LoggedInUser('id') userID: number
  ) {
    return this.leaderboardService.getLeaderboardStats(mapID, userID);
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

  @Post('/:mapID/reviews')
  @UseInterceptors(
    FileFieldsInterceptor([{ name: 'images', maxCount: MAX_REVIEW_IMAGES }]),
    FormDataJsonInterceptor('data')
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Creates a review for a map' })
  @ApiOkResponse({ type: MapReviewDto, description: 'The created review' })
  @ApiForbiddenResponse({
    description: 'User does not have the required role to review'
  })
  @ApiBadRequestResponse({ description: 'Invalid map' })
  @ApiBody({
    type: CreateMapReviewWithFilesDto,
    description: 'The create map review data transfer object',
    required: true
  })
  createReview(
    @Body('data') data: CreateMapReviewDto,
    @Param('mapID', ParseIntSafePipe) mapID: number,
    @UploadedFiles(
      new ParseFilesPipe(
        new ParseFilePipe({
          validators: [
            new ImageFileValidator({
              minHeight: 100,
              minWidth: 100,
              maxWidth: 4000,
              maxHeight: 4000
            }),
            new MaxFileSizeValidator({ maxSize: MAX_MAP_IMAGE_SIZE })
          ]
        })
      )
    )
    files: { images?: File[] },
    @LoggedInUser('id') userID: number
  ): Promise<MapReviewDto> {
    return this.mapReviewService.createReview(
      userID,
      mapID,
      data,
      files?.images
    );
  }

  //endregion
}
