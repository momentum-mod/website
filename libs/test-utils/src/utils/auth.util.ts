import { User } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import { JWT_GAME_EXPIRY_TIME, JWT_WEB_EXPIRY_TIME } from '@momentum/constants';

export class AuthUtil {
  constructor() {
    this.jwtService = new JwtService({
      secret: process.env['JWT_SECRET'] ?? ''
    });
  }

  private readonly jwtService: JwtService;

  login(user: User): string {
    return this.generateToken(user, false);
  }

  logins(users: User[]): string[] {
    return users.map((user) => this.login(user));
  }

  gameLogin(user: User): string {
    return this.generateToken(user, true);
  }

  gameLogins(users: User[]): string[] {
    return users.map((user) => this.gameLogin(user));
  }

  private generateToken(user: User, isGame: boolean): string {
    return this.jwtService.sign(
      {
        id: user.id,
        steamID: user.steamID,
        gameAuth: isGame
      },
      { expiresIn: isGame ? JWT_GAME_EXPIRY_TIME : JWT_WEB_EXPIRY_TIME }
    );
  }
}
