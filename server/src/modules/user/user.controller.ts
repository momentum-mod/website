import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt/jwt-auth.guard';
import { UpdateUserDto, UserDto } from '../../@common/dto/user/user.dto';
import { UsersService } from '../users/users.service';
import { LoggedInUser } from '../../@common/decorators/logged-in-user.decorator';

@ApiBearerAuth()
@Controller('api/v1/user')
@ApiTags('User')
@UseGuards(JwtAuthGuard)
export class UserController {
    constructor(private readonly usersService: UsersService) {}

    @Get()
    @ApiOperation({ summary: 'Get current logged in user, based on JWT' })
    public async GetUser(@LoggedInUser('id') userID: number): Promise<UserDto> {
        return this.usersService.Get(userID);
    }

    @Patch()
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: "Update the current logged in user's data" })
    @ApiBody({
        type: UpdateUserDto,
        description: 'Update user data transfer object',
        required: true
    })
    public async Update(@LoggedInUser('id') userID: number, @Body() userUpdateDto: UpdateUserDto) {
        await this.usersService.Update(userID, userUpdateDto);
    }

    @Delete()
    @ApiOperation({ summary: 'Delete the current logged in user and log out' })
    public async Delete(@LoggedInUser('id') userID: number) {
        await this.usersService.Delete(userID);
    }
}
