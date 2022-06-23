import { Injectable } from '@nestjs/common';
import { RunsRepoService } from '../repo/runs-repo.service';

@Injectable()
export class RunsService {
    constructor(private readonly runRepo: RunsRepoService) {}
}
