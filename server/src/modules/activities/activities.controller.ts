import { Controller, UseGuards } from '@nestjs/common';
import { ActivitiesService } from './activities.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt/jwt-auth.guard';

@ApiBearerAuth()
@Controller('api/v1/activities')
@ApiTags('Activities')
@UseGuards(JwtAuthGuard)
export class ActivitiesController {
    constructor(private readonly activitiesService: ActivitiesService) {}
}
