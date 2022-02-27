import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt/jwt-auth.guard';
import { UserService } from './user.service';
import { UserDto } from '../../@common/dto/user/user.dto';

@ApiBearerAuth()
@Controller('api/v1/user')
@ApiTags('User')
@UseGuards(JwtAuthGuard)
export class UserController {

    constructor(private readonly userService: UserService) {}

    @Get()
    @ApiOperation({ summary: 'Get current logged in user, based on JWT' })
    public async GetUser(): Promise<UserDto> {
        return this.userService.Get();
    }
}

