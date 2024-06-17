import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  VERSION_NEUTRAL
} from '@nestjs/common';
import { ApiNoContentResponse, ApiTags } from '@nestjs/swagger';
import { BypassJwtAuth } from '../../decorators';

@Controller({ path: '/health', version: VERSION_NEUTRAL })
@ApiTags('Healthchecks')
export class HealthcheckController {
  constructor() {}

  @Get()
  @HttpCode(HttpStatus.NO_CONTENT)
  @BypassJwtAuth()
  @ApiNoContentResponse({ description: 'When backend is accepting requests' })
  getHealth(): void {
    // Deliberately empty
  }
}
