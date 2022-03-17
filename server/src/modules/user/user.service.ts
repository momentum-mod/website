import { Injectable } from '@nestjs/common';
import { UserDto } from 'src/@common/dto/user/user.dto';
import { UsersService } from '../users/users.service';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class UserService {
    constructor(private readonly usersService: UsersService, private readonly authService: AuthService) {}

    async Get(): Promise<UserDto> {
        return this.usersService.Get(this.authService.loggedInUser.id);
    }
}
