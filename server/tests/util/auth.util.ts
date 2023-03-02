import { User } from '@prisma/client';
import { AuthService } from '@modules/auth/auth.service';

const authService = global.auth as AuthService;

export function login(user: User): Promise<string> {
    return authService.loginWeb(user).then((jwt) => jwt.accessToken);
}

export function logins(users: User[]): Promise<string[]> {
    return Promise.all(users.map((user) => login(user)));
}

export function gameLogin(user: User): Promise<string> {
    return authService.loginGame(user).then((jwt) => jwt.token);
}

export function gameLogins(users: User[]): Promise<string[]> {
    return Promise.all(users.map((user) => gameLogin(user)));
}
