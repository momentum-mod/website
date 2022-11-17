import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException
} from '@nestjs/common';
import { UsersRepoService } from '../repo/users-repo.service';
import { Follow, Prisma } from '@prisma/client';
import { AdminUpdateUserDto, UserDto } from '@common/dto/user/user.dto';
import { DtoFactory } from '@lib/dto.lib';
import { MapsRepoService } from '../repo/maps-repo.service';
import { Bitflags } from '@lib/bitflag.lib';
import { UpdateRolesDto } from '@common/dto/user/roles.dto';

@Injectable()
export class AdminService {
    constructor(private readonly userRepo: UsersRepoService, private readonly mapRepo: MapsRepoService) {}

    async createPlaceholderUser(alias: string): Promise<UserDto> {
        const input: Prisma.UserCreateInput = {
            alias: alias,
            roles: { create: { placeholder: true } }
        };

        const dbResponse = await this.userRepo.create(input);

        return DtoFactory(UserDto, dbResponse);
    }

    async mergeUsers(placeholderID: number, userID: number): Promise<UserDto> {
        const includeFollows: Prisma.UserInclude = {
            follows: true,
            followers: true,
            roles: true
        };

        const placeholder = (await this.userRepo.get(placeholderID, includeFollows)) as any;

        if (placeholderID == userID) {
            throw new BadRequestException('Will not merge the same account');
        } else if (!placeholder) {
            throw new BadRequestException('Placeholder user not found');
        } else if (!placeholder.roles.placeholder) {
            throw new BadRequestException('Placeholder input is not a placeholder user');
        }

        const user = (await this.userRepo.get(userID, includeFollows)) as any;

        if (!user) throw new BadRequestException('Merging user not found');

        // Update credits to point to new ID
        await this.mapRepo.updateCredits(
            {
                userID: placeholderID
            },
            {
                userID: userID
            }
        );

        // Now follows, hardest part.
        // First edge case: delete the follow entry if the realUser is following the placeholder (can't follow yourself)
        await this.userRepo.deleteFollow(userID, placeholderID).catch(() => void 0);

        const placeHolderFollowers = placeholder.followers as Follow[];

        // Update all the follows targeting the placeholder user
        for (const follow of placeHolderFollowers) {
            // We deleted the real user -> placeholder follow already but it can still be in this array
            if (follow.followeeID === userID) continue;

            // Second edge case: user(s) is (are) following both placeholder and real user
            const overlappingFollow = await this.userRepo.getFollower(follow.followeeID, userID);
            if (overlappingFollow) {
                const mergedNotifies = Bitflags.add(overlappingFollow.notifyOn, follow.notifyOn);

                const earliestCreationDate = new Date(
                    Math.min(overlappingFollow.createdAt.getTime(), follow.createdAt.getTime())
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
        await this.userRepo.updateActivities({ userID: placeholderID }, { userID: userID });

        // Delete the placeholder
        await this.userRepo.delete(placeholderID);

        // Fetch the merged user now everything's done
        const mergedUserDbResponse = await this.userRepo.get(userID);

        return DtoFactory(UserDto, mergedUserDbResponse);
    }

    async updateUser(adminID: number, userID: number, update: AdminUpdateUserDto) {
        const user: any = await this.userRepo.get(userID, { profile: true, bans: true, roles: true });

        if (!user) throw new NotFoundException('User not found');

        // TODO: Can we validate that update/create DTOs are not empty/undefined on all properties??
        if (Object.values(update).every((v) => v === undefined))
            throw new BadRequestException('Request contains no update data');

        const updateInput: Prisma.UserUpdateInput = {};

        if (update.bans)
            updateInput.bans = {
                upsert: {
                    create: update.bans,
                    update: update.bans
                }
            };

        let newRoles: UpdateRolesDto;

        if (update.roles) {
            const admin: any = await this.userRepo.get(adminID, { roles: true });

            if (admin.roles?.moderator) {
                if (user.roles?.moderator || user.roles?.admin) {
                    if (adminID !== userID) {
                        throw new ForbiddenException('Cannot update user with >= power to you');
                    } else {
                        if (update.roles.admin) throw new ForbiddenException('Cannot add yourself as admin');
                        if (update.roles.moderator) throw new ForbiddenException('Cannot remove yourself as moderator');
                    }
                }
                if (update.roles.admin) throw new ForbiddenException('Moderators may not add other users as admin');
                if (update.roles.moderator && adminID !== userID)
                    throw new ForbiddenException('Moderators may not add other users as moderators');
            } else if (user.roles?.admin && adminID !== userID)
                throw new ForbiddenException('Cannot update other admins');

            // If all we make it through all these checks, finally we can update the flags
            updateInput.roles = {
                create: update.roles,
                update: update.roles
            };
            newRoles = update.roles;
        } else {
            newRoles = user.roles;
        }

        if (update.alias && update.alias !== user.alias) {
            if (newRoles.verified) {
                const verifiedMatches = await this.userRepo.count({
                    alias: update.alias,
                    roles: { is: { verified: true } }
                });

                if (verifiedMatches > 0) throw new ConflictException('Alias is in use by another verified user');
            }

            updateInput.alias = update.alias;
        }

        if (update.bio) {
            updateInput.profile = { update: { bio: update.bio } };
        }

        await this.userRepo.update(userID, updateInput);
    }

    async deleteUser(userID: number) {
        const user: any = await this.userRepo.get(userID, { roles: true });

        if (!user) throw new NotFoundException('User not found');

        if (user.roles.admin || user.roles.moderator)
            throw new ForbiddenException('Will delete admins or moderators, remove their roles first');

        await this.userRepo.delete(userID);
    }
}
