import NodeEnvironment from 'jest-environment-node';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { PrismaRepo } from '../src/modules/prisma/prisma.repo';
import { User } from '@prisma/client';
import { AuthService } from '../src/modules/auth/auth.service';
import { ERole } from '../src/@common/enums/user.enum';
import { Reflector } from '@nestjs/core';

export default class E2ETestEnvironment extends NodeEnvironment {
    constructor(config, context) {
        super(config, context);
    }

    async setup() {
        await super.setup();

        const moduleRef = await Test.createTestingModule({
            imports: [AppModule]
        }).compile();

        BigInt.prototype['toJSON'] = function () {
            return this.toString();
        };

        const app = moduleRef.createNestApplication();

        app.useGlobalPipes(new ValidationPipe({ transform: true }));
        app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

        await app.init();

        this.global.server = app.getHttpServer();
        const prisma = app.get<PrismaRepo>(PrismaRepo);
        this.global.prisma = prisma;

        this.global.testUser = (await prisma.user.create({
            data: {
                // Ron's gonna be in each test so SteamIDs need to be unique
                steamID: Math.random().toPrecision(16).slice(2),
                country: 'GB',
                alias: 'Ron Weasley',
                avatar: '',
                roles: ERole.ADMIN,
                bans: 0,
                profile: {
                    create: {
                        bio: 'Ronald Bilius "Ron" Weasley (b. 1 March, 1980) was an English pure-blood wizard, the sixth and youngest son of Arthur and Molly Weasley (née Prewett). He was also the younger brother of Bill, Charlie, Percy, Fred, George, and the elder brother of Ginny. Ron and his siblings lived at the The Burrow, on the outskirts of Ottery St Catchpole, Devon.\''
                    }
                }
            },
            include: {
                profile: true
            }
        })) as User;

        const auth = app.get<AuthService>(AuthService);
        this.global.authService = auth;
        const jwt = await auth.login(this.global.testUser as User);
        this.global.accessToken = jwt.access_token;
    }

    async teardown() {
        const prisma: PrismaRepo = this.global.prisma as PrismaRepo;

        await prisma.user.delete({
            where: {
                id: (this.global.testUser as User).id
            }
        });

        await super.teardown();
    }
}
