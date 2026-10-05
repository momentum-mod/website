import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { TwitchService } from './twitch.service';
import {
  ApiOkPagedResponse,
  PagedResponseDto,
  TwitchStreamDto
} from '../../dto';
import { BypassJwtAuth } from '../../decorators';

@Controller('twitch')
@ApiTags('Twitch')
export class TwitchController {
  constructor(private readonly twitchService: TwitchService) {}

  @Get('streams')
  @BypassJwtAuth()
  @ApiOperation({ summary: 'Get active Twitch streams for Momentum Mod' })
  @ApiOkPagedResponse(TwitchStreamDto, {
    description: 'List of active Twitch streams'
  })
  async getStreams(): Promise<PagedResponseDto<TwitchStreamDto>> {
    return this.twitchService.getStreams();
  }
}
