import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { UsersRepoService } from '../repo/users-repo.service';
import { Follow, Prisma } from '@prisma/client';
import { MapsRepoService } from '../repo/maps-repo.service';
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

@Injectable()
export class AdminService {
  constructor(
    private readonly userRepo: UsersRepoService,
    private readonly mapRepo: MapsRepoService
  ) {}

  async createPlaceholderUser(alias: string): Promise<UserDto> {
    const input: Prisma.UserCreateInput = {
      alias: alias,
      roles: Role.PLACEHOLDER
    };

    const dbResponse = await this.userRepo.create(input);

    return DtoFactory(UserDto, dbResponse);
  }

  async mergeUsers(placeholderID: number, userID: number): Promise<UserDto> {
    const includeFollows: Prisma.UserInclude = {
      follows: true,
      followers: true
    };

    const placeholder = (await this.userRepo.get(
      placeholderID,
      includeFollows
    )) as any;

    if (placeholderID == userID) {
      throw new BadRequestException('Will not merge the same account');
    } else if (!placeholder) {
      throw new BadRequestException('Placeholder user not found');
    } else if (!Bitflags.has(placeholder.roles, Role.PLACEHOLDER)) {
      throw new BadRequestException(
        'Placeholder input is not a placeholder user'
      );
    }

    const user = (await this.userRepo.get(userID, includeFollows)) as any;

    if (!user) throw new BadRequestException('Merging user not found');

    // Update credits to point to new ID
    await this.mapRepo.updateCredits(
      { userID: placeholderID },
      { userID: userID }
    );

    // Now follows, hardest part.
    // First edge case: delete the follow entry if the realUser is following the placeholder (can't follow yourself)
    await this.userRepo.deleteFollow(userID, placeholderID).catch(() => {});

    const placeHolderFollowers = placeholder.followers as Follow[];

    // Update all the follows targeting the placeholder user
    for (const follow of placeHolderFollowers) {
      // We deleted the real user -> placeholder follow already but it can still be in this array
      if (follow.followeeID === userID) continue;

      // Second edge case: user(s) is (are) following both placeholder and real user
      const overlappingFollow = await this.userRepo.getFollower(
        follow.followeeID,
        userID
      );
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

        await this.userRepo.updateFollow(follow.followeeID, userID, {
          notifyOn: mergedNotifies,
          createdAt: earliestCreationDate
        });

        await this.userRepo.deleteFollow(follow.followeeID, placeholderID);
      }
      // If they don't overlap, just move the followedID
      else {
        await this.userRepo.updateFollow(follow.followeeID, placeholderID, {
          followed: { connect: { id: userID } }
        });
      }
    }

    // Finally, activities.
    await this.userRepo.updateActivities(
      { userID: placeholderID },
      { userID: userID }
    );

    // Delete the placeholder
    await this.userRepo.delete(placeholderID);

    // Fetch the merged user now everything's done
    const mergedUserDbResponse = await this.userRepo.get(userID);

    return DtoFactory(UserDto, mergedUserDbResponse);
  }

  async updateUser(
    adminID: number,
    userID: number,
    update: AdminUpdateUserDto
  ) {
    const user: any = await this.userRepo.get(userID, { profile: true });

    if (!user) throw new NotFoundException('User not found');

    checkNotEmpty(update);

    const updateInput: Prisma.UserUpdateInput = {};

    if (update.bans) updateInput.bans = update.bans;

    let newRoles: number;

    if (update.roles !== undefined) {
      const admin = await this.userRepo.get(adminID);

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
        const [sameNameMatches] = await this.userRepo.getAll({
          alias: update.alias
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

    await this.userRepo.update(userID, updateInput);
  }

  async deleteUser(userID: number) {
    const user: any = await this.userRepo.get(userID);

    if (!user) throw new NotFoundException('User not found');

    if (
      Bitflags.has(user.roles, Role.ADMIN) ||
      Bitflags.has(user.roles, Role.MODERATOR)
    )
      throw new ForbiddenException(
        'Will delete admins or moderators, remove their roles first'
      );

    await this.userRepo.delete(userID);
  }

  async getReports(
    skip?: number,
    take?: number,
    expand?: string[],
    resolved?: boolean
  ) {
    const dbResponse = await this.userRepo.getAllReports(
      { resolved },
      expandToPrismaIncludes(expand),
      skip,
      take
    );
    return new PagedResponseDto(ReportDto, dbResponse);
  }

  async updateReport(
    userID: number,
    reportID: number,
    reportDto: UpdateReportDto
  ) {
    const report = await this.userRepo.getReport({ id: reportID });

    if (!report) throw new NotFoundException('Report not found');

    const where: Prisma.ReportWhereUniqueInput = {
      id: reportID
    };
    const data: Prisma.ReportUpdateInput = {
      resolved: reportDto.resolved,
      resolutionMessage: reportDto.resolutionMessage
    };
    if (reportDto.resolved) data.resolver = { connect: { id: userID } };

    await this.userRepo.updateReports(where, data);
  }
}
