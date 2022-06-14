import { Injectable } from '@nestjs/common';
import { RunsRepo } from './runs.repo';

@Injectable()
export class RunsService {
    constructor(private readonly runRepo: RunsRepo) {}
}
