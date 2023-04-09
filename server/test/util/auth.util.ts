import { User } from '@prisma/client';
import { JwtAuthService } from '@modules/auth/jwt/jwt-auth.service';

export class AuthUtil {
    constructor(authService: JwtAuthService) {
        this.authService = authService;
    }

    private authService: JwtAuthService;

    login(user: User): Promise<string> {
        return this.authService.loginWeb(user).then((jwt) => jwt.accessToken);
    }

    logins(users: User[]): Promise<string[]> {
        return Promise.all(users.map((user) => this.login(user)));
    }

    gameLogin(user: User): Promise<string> {
        return this.authService.loginGame(user).then((jwt) => jwt.token);
    }

    gameLogins(users: User[]): Promise<string[]> {
        return Promise.all(users.map((user) => this.gameLogin(user)));
    }
}
