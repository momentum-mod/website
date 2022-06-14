import { Injectable } from '@nestjs/common';
import { AdminRepo } from './admin.repo';

@Injectable()
export class AdminService {
    constructor(private readonly adminRepo: AdminRepo) {}
}
