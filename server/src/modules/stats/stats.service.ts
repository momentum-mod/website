import { Injectable } from '@nestjs/common';
import { UsersRepoService } from '../repo/users-repo.service';

@Injectable()
export class StatsService {
  constructor(private readonly _userRepo: UsersRepoService) {}
}
