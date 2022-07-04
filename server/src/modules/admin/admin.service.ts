import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException
} from '@nestjs/common';
import { UsersRepoService } from '../repo/users-repo.service';
import { Follow, Prisma } from '@prisma/client';
import { Roles } from '../../@common/enums/user.enum';
import { AdminUpdateUserDto, UserDto } from '../../@common/dto/user/user.dto';
import { DtoFactory } from '../../@common/utils/dto.utility';
import { MapsRepoService } from '../repo/maps-repo.service';
import { Bitflags } from '../../@common/utils/bitflag.utility';

@Injectable()
export class AdminService {
    constructor(private readonly userRepo: UsersRepoService, private readonly mapRepo: MapsRepoService) {}

    async createPlaceholderUser(alias: string): Promise<UserDto> {
        const input: Prisma.UserCreateInput = {
            alias: alias,
            roles: Roles.PLACEHOLDER
        };

        const dbResponse = await this.userRepo.create(input);

        return DtoFactory(UserDto, dbResponse);
    }

    async mergeUsers(placeholderID: number, userID: number): Promise<UserDto> {
        const includeFollows: Prisma.UserInclude = {
            follows: true,
            followers: true
        };

        const placeholder = (await this.userRepo.get(placeholderID, includeFollows)) as any;

        if (placeholderID == userID) {
            throw new BadRequestException('Will not merge the same account');
        } else if (!placeholder) {
            throw new BadRequestException('Placeholder user not found');
        } else if ((placeholder.roles & Roles.PLACEHOLDER) == 0) {
            throw new BadRequestException('Placeholder input is not a placeholder user');
        }

        const user = (await this.userRepo.get(userID, includeFollows)) as any;

        if (!user) throw new BadRequestException('Merging user not found');

        // Update credits to point to new ID
        await this.mapRepo.updateCredit(
            {
                userID: placeholderID
            },
            {
                user: { connect: { id: userID } }
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
        const user = await this.userRepo.get(userID, { profile: true });

        if (!user) throw new NotFoundException('User not found');

        // TODO: Can we validate that update/create DTOs are not empty/undefined on all properties??
        if (Object.values(update).every((v) => v === undefined))
            throw new BadRequestException('Request contains no update data');

        const updateInput: Prisma.UserUpdateInput = {};

        if (update.bans) updateInput.bans = update.bans;

        let newRoles: Roles;

        if (update.roles) {
            const admin = await this.userRepo.get(adminID);

            const targetIsMod: boolean = Bitflags.has(user.roles, Roles.MODERATOR);
            const targetIsAdmin: boolean = Bitflags.has(user.roles, Roles.ADMIN);

            if (Bitflags.has(admin.roles, Roles.MODERATOR)) {
                if (targetIsMod || targetIsAdmin) {
                    if (adminID !== userID) {
                        throw new ForbiddenException('Cannot update user with >= power to you');
                    } else {
                        if (Bitflags.has(update.roles, Roles.ADMIN))
                            throw new ForbiddenException('Cannot add yourself as admin');
                        if (!Bitflags.has(update.roles, Roles.MODERATOR))
                            throw new ForbiddenException('Cannot remove yourself as moderator');
                    }
                }
                if (Bitflags.has(update.roles, Roles.ADMIN))
                    throw new ForbiddenException('Moderators may not add other users as admin');
                if (Bitflags.has(update.roles, Roles.MODERATOR) && adminID !== userID)
                    throw new ForbiddenException('Moderators may not add other users as moderators');
            } else if (targetIsAdmin && adminID !== userID) {
                throw new ForbiddenException('Cannot update other admins');
            }

            // If all we make it through all these checks, finally we can update the flags
            updateInput.roles = update.roles;
            newRoles = update.roles;
        } else {
            newRoles = user.roles;
        }

        if (update.alias && update.alias !== user.alias) {
            if (Bitflags.has(newRoles, Roles.VERIFIED)) {
                const verifiedMatches = await this.userRepo.count({
                    alias: update.alias,
                    roles: Roles.VERIFIED
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
        const user = await this.userRepo.get(userID);

        if (!user) throw new NotFoundException('User not found');

        if (Bitflags.has(user.roles, Roles.ADMIN | Roles.MODERATOR))
            throw new ForbiddenException('Will delete admins or moderators, remove their roles first');

        await this.userRepo.delete(userID);
    }
}
