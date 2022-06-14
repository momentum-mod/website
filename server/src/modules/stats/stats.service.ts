import { Injectable } from '@nestjs/common';
import { StatsRepo } from './stats.repo';

@Injectable()
export class StatsService {
    constructor(private readonly statsRepo: StatsRepo) {}
}
