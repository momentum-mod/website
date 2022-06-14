import { Injectable } from '@nestjs/common';
import { ReportsRepo } from './reports.repo';

@Injectable()
export class ReportsService {
    constructor(private readonly reportRepo: ReportsRepo) {}
}
