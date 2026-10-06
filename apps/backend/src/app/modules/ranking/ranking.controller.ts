import {
  Controller,
  Get,
  Param,
  Query,
  UnauthorizedException
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiGoneResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse
} from '@nestjs/swagger';
import { Gamemode } from '@momentum/constants';
import {
  ApiOkPagedResponse,
  PagedResponseDto,
  RankEntryDto,
  RanksGetQueryDto
} from '../../dto';
import { BypassJwtAuth, LoggedInUser } from '../../decorators';
import { ParseEnumPipe } from '../../pipes';
import { RankingService } from './ranking.service';

@Controller('ranks')
@ApiTags('Ranks')
@ApiBearerAuth()
export class RankingController {
  constructor(private readonly rankingService: RankingService) {}

  @Get('/:gamemode')
  @BypassJwtAuth()
  @ApiOperation({
    summary: 'Returns a page of the rank points ladder for a gamemode and style'
  })
  @ApiParam({
    name: 'gamemode',
    type: Number,
    description: 'Gamemode of the ladder',
    required: true
  })
  @ApiOkPagedResponse(RankEntryDto, {
    description: 'Paginated list of ladder entries, highest points first'
  })
  @ApiUnauthorizedResponse({
    description: "'around' filter used without being logged in"
  })
  @ApiGoneResponse({
    description: "'around' filter used but the user has no rank on the ladder"
  })
  getLadder(
    @Param('gamemode', new ParseEnumPipe(Gamemode)) gamemode: Gamemode,
    @Query() query: RanksGetQueryDto,
    @LoggedInUser('id') loggedInUserID?: number
  ): Promise<PagedResponseDto<RankEntryDto>> {
    const around = query.filter?.includes('around');
    if (around && !loggedInUserID) throw new UnauthorizedException();

    return this.rankingService.getLadder(
      gamemode,
      query.style,
      query.skip,
      query.take,
      around ? { userID: loggedInUserID } : undefined
    );
  }
}
