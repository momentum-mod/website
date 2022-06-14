import { Controller, UseGuards } from '@nestjs/common';
import { RunsService } from './runs.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt/jwt-auth.guard';

@ApiBearerAuth()
@Controller('api/v1/runs')
@ApiTags('Runs')
@UseGuards(JwtAuthGuard)
export class RunsController {
    constructor(private readonly runsService: RunsService) {}
}
