import { Injectable } from '@nestjs/common';
import { UsersRepoService } from '../repo/users-repo.service';

@Injectable()
export class ReportsService {
    constructor(private readonly userRepo: UsersRepoService) {}
}
