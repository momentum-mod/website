import { Injectable } from '@nestjs/common';
import { ActivitiesRepo } from './activities.repo';

@Injectable()
export class ActivitiesService {
    constructor(private readonly activityRepo: ActivitiesRepo) {}
}
