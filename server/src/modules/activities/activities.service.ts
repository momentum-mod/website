import { Injectable } from '@nestjs/common';
import { UsersRepoService } from '../repo/users-repo.service';

@Injectable()
export class ActivitiesService {
    constructor(private readonly userRepo: UsersRepoService) {}
}
