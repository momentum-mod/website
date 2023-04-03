import { User } from '@prisma/client';
import { AuthService } from '@modules/auth/auth.service';

export class AuthUtil {
    constructor(authService: AuthService) {
        this.authService = authService;
    }

    private authService: AuthService;

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
