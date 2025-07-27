import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { Prisma } from '@momentum/db';
import * as Bitflags from '@momentum/bitflags';
import { AdminActivityType, Role } from '@momentum/constants';
import { expandToIncludes, isEmpty } from '@momentum/util-fn';
import {
  AdminUpdateUserDto,
  DtoFactory,
  PagedResponseDto,
  ReportDto,
  UpdateReportDto,
  UserDto
} from '../../dto';
import { EXTENDED_PRISMA_SERVICE } from '../database/db.constants';
import { ExtendedPrismaService } from '../database/prisma.extension';
import { AdminActivityService } from './admin-activity.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class AdminService {
  constructor(
    @Inject(EXTENDED_PRISMA_SERVICE) private readonly db: ExtendedPrismaService,
    private readonly adminActivityService: AdminActivityService,
    private readonly usersService: UsersService
  ) {}

  async createPlaceholderUser(
    adminID: number,
    alias: string
  ): Promise<UserDto> {
    const placeholder = await this.db.user.create({
      data: {
        alias: alias,
        roles: Role.PLACEHOLDER
      }
    });
    await this.adminActivityService.create(
      adminID,
      AdminActivityType.USER_CREATE_PLACEHOLDER,
      placeholder.id,
      placeholder
    );

    return DtoFactory(UserDto, placeholder);
  }

  async mergeUsers(
    adminID: number,
    placeholderID: number,
    userID: number
  ): Promise<UserDto> {
    const placeholder = await this.db.user.findUnique({
      where: { id: placeholderID },
      include: { follows: true, followers: true }
    });

    if (placeholderID === userID) {
      throw new BadRequestException('Will not merge the same account');
    } else if (!placeholder) {
      throw new BadRequestException('Placeholder user not found');
    } else if (!Bitflags.has(placeholder.roles, Role.PLACEHOLDER)) {
      throw new BadRequestException(
        'Placeholder input is not a placeholder user'
      );
    }

    const user = await this.db.user.findUnique({
      where: { id: userID },
      include: { follows: true, followers: true }
    });

    if (!user) throw new BadRequestException('Merging user not found');

    return await this.db.$transaction(async (tx) => {
      // Update credits to point to new ID
      await tx.mapCredit.updateMany({
        where: { userID: placeholderID },
        data: { userID }
      });

      // Now follows, hardest part.
      // First edge case: delete the follow entry if the realUser is following
      // the placeholder (can't follow yourself)
      await tx.follow.deleteMany({
        where: { followedID: userID, followeeID: placeholderID }
      });

      // Update all the follows targeting the placeholder user
      for (const follow of placeholder.followers) {
        // We deleted the real user -> placeholder follow already but it can
        // still be in this array
        if (follow.followeeID === userID) continue;

        // Second edge case: user(s) is (are) following both placeholder and real user
        const overlappingFollow = await tx.follow.findUnique({
          where: {
            followeeID_followedID: {
              followeeID: follow.followeeID,
              followedID: userID
            }
          },
          include: { followed: true, followee: true }
        });

        if (overlappingFollow) {
          const mergedNotifies = Bitflags.add(
            overlappingFollow.notifyOn,
            follow.notifyOn
          );

          const earliestCreationDate = new Date(
            Math.min(
              overlappingFollow.createdAt.getTime(),
              follow.createdAt.getTime()
            )
          );

          await tx.follow.update({
            where: {
              followeeID_followedID: {
                followeeID: follow.followeeID,
                followedID: userID
              }
            },
            data: { notifyOn: mergedNotifies, createdAt: earliestCreationDate }
          });

          await tx.follow.delete({
            where: {
              followeeID_followedID: {
                followeeID: follow.followeeID,
                followedID: placeholderID
              }
            }
          });
        }
        // If they don't overlap, just move the followedID
        else {
          await tx.follow.update({
            where: {
              followeeID_followedID: {
                followeeID: follow.followeeID,
                followedID: placeholderID
              }
            },
            data: { followed: { connect: { id: userID } } }
          });
        }
      }

      // Finally, activities.
      await tx.activity.updateMany({
        where: { userID: placeholderID },
        data: { userID }
      });

      // Delete the placeholder
      await tx.user.delete({ where: { id: placeholderID } });

      // Fetch the merged user now everything's done
      const mergedUserDbResponse = await tx.user.findUnique({
        where: { id: userID }
      });

      await this.adminActivityService.create(
        adminID,
        AdminActivityType.USER_MERGE,
        userID,
        { user: mergedUserDbResponse, placeholder: null },
        { user, placeholder }
      );

      return DtoFactory(UserDto, mergedUserDbResponse);
    });
  }

  async updateUser(
    adminID: number,
    userID: number,
    update: AdminUpdateUserDto
  ) {
    if (isEmpty(update)) {
      throw new BadRequestException('Empty body');
    }

    const user = await this.db.user.findUnique({
      where: { id: userID },
      include: { profile: true }
    });

    if (!user) throw new NotFoundException('User not found');

    const updateInput: Prisma.UserUpdateInput = {};

    if (update.bans !== undefined && user.bans !== update.bans) {
      updateInput.bans = update.bans;
    }

    if (update.roles !== undefined && user.roles !== update.roles) {
      const admin = await this.db.user.findUnique({
        where: { id: adminID },
        select: { roles: true }
      });

      if (Bitflags.has(admin.roles, Role.MODERATOR)) {
        if (
          Bitflags.has(user.roles, Role.MODERATOR) ||
          Bitflags.has(user.roles, Role.ADMIN)
        ) {
          if (adminID !== userID) {
            throw new ForbiddenException(
              'Cannot update user with >= power to you'
            );
          } else {
            if (Bitflags.has(update.roles, Role.ADMIN))
              throw new ForbiddenException('Cannot add yourself as admin');
            if (!Bitflags.has(update.roles, Role.MODERATOR))
              throw new ForbiddenException(
                'Cannot remove yourself as moderator'
              );
          }
        }
        if (Bitflags.has(update.roles, Role.ADMIN))
          throw new ForbiddenException(
            'Moderators may not add other users as admin'
          );
        if (Bitflags.has(update.roles, Role.MODERATOR) && adminID !== userID)
          throw new ForbiddenException(
            'Moderators may not add other users as moderators'
          );
      } else if (Bitflags.has(user.roles, Role.ADMIN) && adminID !== userID)
        throw new ForbiddenException('Cannot update other admins');

      // Keep verified user-unique-name invariant.
      if (Bitflags.has(update.roles, Role.VERIFIED)) {
        const sameNameMatches = await this.db.user.findMany({
          where: { alias: update.alias, NOT: { id: userID } },
          select: { roles: true }
        });
        if (
          sameNameMatches.some((user) =>
            Bitflags.has(user.roles, Role.VERIFIED)
          )
        ) {
          throw new ConflictException(
            'Cannot give user verified role since alias is already in use by another verified user'
          );
        }
      }

      // If all we make it through all these checks, finally we can update the flags
      updateInput.roles = update.roles;
    }

    if (updateInput.bans !== undefined || updateInput.roles !== undefined) {
      await this.db.user.update({
        where: { id: userID },
        data: updateInput
      });
    }

    // Check rest of fields not needed to be admin to update, separately.
    const updatedUser = await this.usersService.update(userID, update, true);

    await this.adminActivityService.create(
      adminID,
      AdminActivityType.USER_UPDATE,
      userID,
      updatedUser,
      user
    );
  }

  async getReports(
    skip?: number,
    take?: number,
    expand?: string[],
    resolved?: boolean
  ) {
    const dbResponse = await this.db.report.findManyAndCount({
      where: { resolved },
      include: expandToIncludes(expand),
      skip,
      take
    });
    return new PagedResponseDto(ReportDto, dbResponse);
  }

  async updateReport(
    userID: number,
    reportID: number,
    reportDto: UpdateReportDto
  ) {
    const report = await this.db.report.findUnique({
      where: { id: reportID }
    });

    if (!report) throw new NotFoundException('Report not found');

    let activity = AdminActivityType.REPORT_UPDATE;

    const data: Prisma.ReportUpdateInput = {
      resolved: reportDto.resolved,
      resolutionMessage: reportDto.resolutionMessage
    };
    if (reportDto.resolved) {
      activity = AdminActivityType.REPORT_RESOLVE;
      data.resolver = { connect: { id: userID } };
    }

    const updatedReport = await this.db.report.update({
      where: {
        id: reportID
      },
      data
    });

    await this.adminActivityService.create(
      userID,
      activity,
      reportID,
      updatedReport,
      report
    );
  }
}
