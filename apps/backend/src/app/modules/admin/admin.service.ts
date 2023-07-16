import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  AdminUpdateUserDto,
  checkNotEmpty,
  DtoFactory,
  expandToPrismaIncludes,
  PagedResponseDto,
  ReportDto,
  UpdateReportDto,
  UserDto
} from '@momentum/backend/dto';
import { Bitflags } from '@momentum/bitflags';
import { Role } from '@momentum/constants';
import { DbService } from '../database/db.service';

@Injectable()
export class AdminService {
  constructor(private readonly db: DbService) {}

  async createPlaceholderUser(alias: string): Promise<UserDto> {
    return DtoFactory(
      UserDto,
      await this.db.user.create({
        data: {
          alias: alias,
          roles: Role.PLACEHOLDER
        }
      })
    );
  }

  async mergeUsers(placeholderID: number, userID: number): Promise<UserDto> {
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

    // Update credits to point to new ID
    await this.db.mapCredit.updateMany({
      where: { userID: placeholderID },
      data: { userID }
    });

    // Now follows, hardest part.
    // First edge case: delete the follow entry if the realUser is following
    // the placeholder (can't follow yourself)
    await this.db.follow.deleteMany({
      where: { followedID: userID, followeeID: placeholderID }
    });

    // Update all the follows targeting the placeholder user
    for (const follow of placeholder.followers) {
      // We deleted the real user -> placeholder follow already but it can
      // still be in this array
      if (follow.followeeID === userID) continue;

      // Second edge case: user(s) is (are) following both placeholder and real user
      const overlappingFollow = await this.db.follow.findUnique({
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

        await this.db.follow.update({
          where: {
            followeeID_followedID: {
              followeeID: follow.followeeID,
              followedID: userID
            }
          },
          data: { notifyOn: mergedNotifies, createdAt: earliestCreationDate }
        });

        await this.db.follow.delete({
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
        await this.db.follow.update({
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
    await this.db.activity.updateMany({
      where: { userID: placeholderID },
      data: { userID }
    });

    // Delete the placeholder
    await this.db.user.delete({ where: { id: placeholderID } });

    // Fetch the merged user now everything's done
    const mergedUserDbResponse = await this.db.user.findUnique({
      where: { id: userID }
    });

    return DtoFactory(UserDto, mergedUserDbResponse);
  }

  async updateUser(
    adminID: number,
    userID: number,
    update: AdminUpdateUserDto
  ) {
    const user: any = await this.db.user.findUnique({
      where: { id: userID },
      include: { profile: true }
    });

    if (!user) throw new NotFoundException('User not found');

    checkNotEmpty(update);

    const updateInput: Prisma.UserUpdateInput = {};

    if (update.bans) updateInput.bans = update.bans;

    let newRoles: number;

    if (update.roles !== undefined) {
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

      // If all we make it through all these checks, finally we can update the flags
      updateInput.roles = update.roles;

      newRoles = update.roles;
    } else {
      newRoles = user.roles;
    }

    if (update.alias && update.alias !== user.alias) {
      if (Bitflags.has(newRoles, Role.VERIFIED)) {
        const sameNameMatches = await this.db.user.findMany({
          where: { alias: update.alias },
          select: { roles: true }
        });
        if (
          sameNameMatches.some((user) =>
            Bitflags.has(user.roles, Role.VERIFIED)
          )
        )
          throw new ConflictException(
            'Alias is in use by another verified user'
          );
      }

      updateInput.alias = update.alias;
    }

    if (update.bio) {
      updateInput.profile = { update: { bio: update.bio } };
    }

    await this.db.user.update({ where: { id: userID }, data: updateInput });
  }

  async getReports(
    skip?: number,
    take?: number,
    expand?: string[],
    resolved?: boolean
  ) {
    const dbResponse = await this.db.report.findManyAndCount({
      where: { resolved },
      include: expandToPrismaIncludes(expand),
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

    const data: Prisma.ReportUpdateInput = {
      resolved: reportDto.resolved,
      resolutionMessage: reportDto.resolutionMessage
    };
    if (reportDto.resolved) data.resolver = { connect: { id: userID } };

    await this.db.report.update({
      where: {
        id: reportID
      },
      data
    });
  }
}
