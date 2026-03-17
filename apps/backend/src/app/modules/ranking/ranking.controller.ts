import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  ApiOkPagedResponse,
  PagedResponseDto,
  RankEntryDto,
  RankingGetQueryDto
} from '../../dto';
import { RankingService } from './ranking.service';
import { ParseEnumPipe } from '../../pipes';
import { Gamemode } from '@momentum/constants';
import { BypassJwtAuth, LoggedInUser } from '../../decorators';

@Controller('ranks')
@ApiTags('Ranks')
@ApiBearerAuth()
export class RankingController {
  constructor(private readonly rankingService: RankingService) {}

  @Get('/:gamemode')
  @BypassJwtAuth()
  @ApiOperation({ summary: 'Returns a paged list of rankings for a gamemode' })
  @ApiOkPagedResponse(RankEntryDto, {
    description: 'Paginated list of rank entries'
  })
  async getRanks(
    @Param('gamemode', new ParseEnumPipe(Gamemode)) gamemode: Gamemode,
    @Query() query: RankingGetQueryDto,
    @LoggedInUser('id') loggedInUserID?: number
  ): Promise<PagedResponseDto<RankEntryDto>> {
    return await this.rankingService.getGamemodeRanks(
      gamemode,
      query.skip ?? 0,
      query.take ?? 20,
      query.filter?.[0],
      loggedInUserID
    );
  }
}
