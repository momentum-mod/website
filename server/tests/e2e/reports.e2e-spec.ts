// noinspection DuplicatedCode

import { PrismaService } from '@modules/repo/prisma.service';
import { post } from '../util/request-handlers.util';
import { AuthService } from '@modules/auth/auth.service';
import { ReportType, ReportCategory } from '@common/enums/report.enum';
import { ReportDto } from '@common/dto/report/report.dto';

describe('Reports', () => {
    let adminUser, adminUser2, modUser, modUser2, nonAdminUser, nonAdminAccessToken, user1, user2;

    beforeEach(async () => {
        const prisma: PrismaService = global.prisma;

        adminUser = await prisma.user.create({
            data: {
                steamID: '534522252345',
                alias: 'Admin User',
                avatar: '',
                roles: { create: { admin: true } },
                country: 'GB',
                profile: {
                    create: {
                        bio: 'Gollum, originally named Sméagol (or Trahald), was at first a Stoor, one of the three early Hobbit-types. The name Gollum was derived from the sound of his gurgling, choking cough.'
                    }
                }
            }
        });

        adminUser2 = await prisma.user.create({
            data: {
                steamID: '5335244555',
                alias: 'Admin User 2',
                avatar: '',
                roles: { create: { admin: true } },
                country: 'GB'
            }
        });

        modUser = await prisma.user.create({
            data: {
                steamID: '101852782',
                alias: 'Mod User',
                avatar: '',
                roles: { create: { moderator: true } },
                country: 'GB'
            }
        });

        modUser2 = await prisma.user.create({
            data: {
                steamID: '544311334',
                alias: 'Mod User 2',
                avatar: '',
                roles: { create: { moderator: true } },
                country: 'GB'
            }
        });

        nonAdminUser = await prisma.user.create({
            data: {
                steamID: '9863243554',
                alias: 'Non Admin User',
                profile: {
                    create: {
                        bio: 'Gandalf the Grey, later known as Gandalf the White, and originally named Olórin (Quenya; IPA: [oˈloːrin]), was an Istar (Wizard), dispatched to Middle-earth in the Third Age to combat the threat of Sauron. He joined Thorin II Oakenshield and his company to reclaim the Lonely Mountain from Smaug, helped form the Fellowship of the Ring to destroy the One Ring, and led the Free Peoples in the final campaign of the War of the Ring.'
                    }
                }
            }
        });

        user1 = await prisma.user.create({
            data: {
                steamID: '44234523452345',
                alias: 'U1',
                roles: { create: { verified: true } },
                bans: { create: { bio: true } },
                profile: {
                    create: {
                        bio: "Saruman, also known as Saruman the White, was first of the Istari (Wizards), emissaries of the Valar who were sent to Middle-earth in the Third Age to help in countering the returned Sauron. He was the order's chief and the head of the White Council that opposed the Enemy. However, in time, the Wizard came to wish to share in the Dark Lord's power as the quasi-equal lieutenant by his side, or by claiming the One Ring first. He betrayed the White Council and his people and began serving Sauron. As Sauron's two-faced vassal, Saruman pledged Isengard's nominal fealty to Mordor and assailed the Kingdom of Rohan in the War of the Ring, in which he was defeated."
                    }
                }
            }
        });

        user2 = await prisma.user.create({
            data: {
                steamID: '22342231215521',
                alias: 'U2',
                roles: { create: { verified: true } }
            }
        });

        report1 = await prisma.report.create({
            data: {
                data: 'report',
                type: ReportType.MAP_REPORT,
                category: ReportCategory.INAPPROPRIATE_CONTENT,
                message: 'report message',
                resolved: false,
                resolutionMessage: '',
                submitterID: user1.id
            }
        });

        report2 = await prisma.report.create({
            data: {
                data: 'report2',
                type: ReportType.USER_PROFILE_REPORT,
                category: ReportCategory.PLAGIARISM,
                message: 'report2 message',
                resolved: false,
                resolutionMessage: '2',
                submitterID: user2.id
            }
        });

        const authService = global.auth as AuthService;
        nonAdminAccessToken = (await authService.loginWeb(nonAdminUser)).accessToken;
    });

    afterEach(async () => {
        const prisma: PrismaService = global.prisma;

        await prisma.user.deleteMany({
            where: {
                id: {
                    in: [adminUser.id, adminUser2.id, modUser.id, modUser2.id, nonAdminUser.id, user1.id, user2.id]
                }
            }
        });
        await prisma.report.deleteMany();
    });

    describe('POST /api/reports', () => {
        it('should create a new report', async () => {
            const data = 'report3';
            const type = ReportType.MAP_COMMENT_REPORT;
            const category = ReportCategory.SPAM;
            const message = 'report3 message';
            const resp = await post({
                url: 'reports',
                status: 201,
                token: nonAdminAccessToken,
                body: {
                    data: data,
                    type: type,
                    category: category,
                    message: message
                }
            });
            expect(resp.body).toBeValidDto(ReportDto);
            expect(resp.body.data).toBe(data);
            const report = await (global.prisma as PrismaService).report.findFirst({
                where: {
                    data: data
                }
            });
            expect(report.data).toBe(data);
        });
        it('should respond with 401 without an access token', () =>
            post({
                url: 'reports',
                status: 401
            }));
    });
});
