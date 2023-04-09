import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthService } from './jwt-auth.service';
import { UsersRepoService } from '@modules/repo/users-repo.service';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { JWTResponseGameDto, JWTResponseWebDto } from '@common/dto/auth/jwt-response.dto';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { UserJwtAccessPayloadVerified, UserJwtPayloadVerified } from '@modules/auth/auth.interface';
import { createMock } from '@golevelup/ts-jest';

describe('JwtAuthService', () => {
    let service: JwtAuthService, userRepo: UsersRepoService;
    let userGetSpy: jest.SpyInstance;

    const jwtSecret = 'Homer Simpson';
    const testJwtService = new JwtService({ secret: jwtSecret });

    const jwtConfig = {
        expTime: '1m',
        gameExpTime: '2m',
        refreshExpTime: '3m'
    };

    const testWebTokenDto = (user, jwt) => {
        expect(jwt).toBeValidDto(JWTResponseWebDto);

        const decodedAccessToken = testJwtService.decode(jwt.accessToken) as UserJwtAccessPayloadVerified;
        expect(decodedAccessToken).toMatchObject({
            id: user.id,
            steamID: user.steamID,
            gameAuth: false
        });

        expect(decodedAccessToken.exp - decodedAccessToken.iat).toBe(60); // 1m. JWT times are seconds, not ms.

        const decodedRefreshToken = testJwtService.decode(jwt.refreshToken) as UserJwtPayloadVerified;
        expect(decodedRefreshToken.id).toBe(user.id);

        expect(decodedRefreshToken.exp - decodedRefreshToken.iat).toBe(3 * 60); // 3m

        expect(jwt.expiresIn).toBe(jwtConfig.expTime);
    };

    beforeAll(async () => {
        const module: TestingModule = await Test.createTestingModule({
            imports: [JwtModule.register({ secret: jwtSecret })],
            providers: [JwtAuthService]
        })
            .useMocker((token) => {
                if (token === ConfigService)
                    return {
                        get: jest.fn((key) => {
                            switch (key) {
                                case 'accessToken.expTime':
                                    return jwtConfig.expTime;
                                case 'accessToken.gameExpTime':
                                    return jwtConfig.gameExpTime;
                                case 'accessToken.refreshExpTime':
                                    return jwtConfig.refreshExpTime;
                            }
                        })
                    };
                else return createMock(token);
            })
            .compile();

        service = module.get(JwtAuthService);
        userRepo = module.get(UsersRepoService);

        userGetSpy = jest.spyOn(userRepo, 'get');
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('loginWeb', () => {
        const user = {
            alias: 'Daniel Plainview',
            avatar: 'milkshake.jpg',
            country: 'US',
            id: 1,
            steamID: '1',
            createdAt: new Date(),
            updatedAt: new Date()
        };

        it('should generate a web JWT DTO', async () => {
            userGetSpy.mockResolvedValueOnce(user);
            const upsertAuthSpy = jest.spyOn(userRepo, 'upsertAuth').mockResolvedValueOnce(undefined);

            const jwt = await service.loginWeb({
                id: user.id,
                steamID: user.steamID
            });

            expect(upsertAuthSpy).toHaveBeenCalledWith(user.id, jwt.refreshToken);

            testWebTokenDto(user, jwt);
        });
    });

    describe('loginGame', () => {
        const user = {
            alias: 'Reynolds Woodcock',
            avatar: 'mushrooms.gif',
            country: 'UK',
            steamID: '1',
            id: 1,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        it('should generate a game JWT DTO', async () => {
            userGetSpy.mockResolvedValueOnce(user);

            const jwt = await service.loginGame({
                id: user.id,
                steamID: user.steamID
            });

            expect(jwt).toBeValidDto(JWTResponseGameDto);

            const decodedAccessToken = testJwtService.decode(jwt.token) as UserJwtAccessPayloadVerified;
            expect(decodedAccessToken).toMatchObject({
                id: user.id,
                steamID: user.steamID,
                gameAuth: true
            });

            expect(decodedAccessToken.exp - decodedAccessToken.iat).toBe(2 * 60); // 2m
        });
    });

    describe('revokeRefreshToken', () => {
        const user = {
            alias: 'Barry Egan',
            avatar: 'pudding.png',
            country: 'US',
            id: 1,
            steamID: '1',
            createdAt: new Date(),
            updatedAt: new Date()
        };

        it('should revoke a valid refresh token', async () => {
            const token = testJwtService.sign({ id: user.id });

            userGetSpy.mockResolvedValueOnce(user);
            const upsertSpy = jest.spyOn(userRepo, 'upsertAuth').mockResolvedValueOnce(undefined);

            await service.revokeRefreshToken(token);

            expect(upsertSpy).toHaveBeenCalledWith(user.id, '');
        });

        it('should throw an UnauthorizedException for an invalid token', async () => {
            const token = testJwtService.sign({ id: user.id }) + 'a';

            await expect(service.revokeRefreshToken(token)).rejects.toThrow(UnauthorizedException);
        });

        it('should throw an UnauthorizedException is the user does not exist in DB', async () => {
            const token = testJwtService.sign({ id: user.id });

            userGetSpy.mockRestore();
            userGetSpy.mockReturnValueOnce(undefined);
            await expect(service.revokeRefreshToken(token)).rejects.toThrow(UnauthorizedException);
        });
    });

    describe('refreshRefreshToken', () => {
        const user = {
            alias: 'Freddie Quell',
            avatar: 'paintthinner.ico',
            country: 'US',
            id: 1,
            steamID: '1',
            createdAt: new Date(),
            updatedAt: new Date()
        };

        it('should generate a web JWT DTO for a valid refresh token', async () => {
            const token = testJwtService.sign({ id: user.id });

            userGetSpy.mockResolvedValueOnce(user);
            const upsertAuthSpy = jest.spyOn(userRepo, 'upsertAuth').mockResolvedValueOnce(undefined);

            const jwt = await service.refreshRefreshToken(token);

            expect(upsertAuthSpy).toHaveBeenCalledWith(user.id, jwt.refreshToken);

            testWebTokenDto(user, jwt);
        });

        it('should throw an UnauthorizedException for an invalid token', async () => {
            const token = testJwtService.sign({ id: user.id, steamID: user.steamID }) + 'a';

            await expect(service.refreshRefreshToken(token)).rejects.toThrow(UnauthorizedException);
        });

        it('should throw an UnauthorizedException is the user does not exist in DB', async () => {
            const token = testJwtService.sign({ id: user.id, steamID: user.steamID });

            userGetSpy.mockResolvedValueOnce(undefined);
            await expect(service.refreshRefreshToken(token)).rejects.toThrow(UnauthorizedException);
        });
    });
});
