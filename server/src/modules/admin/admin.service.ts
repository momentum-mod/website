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
import { DtoUtils } from '../../@common/utils/dto-utils';
import { MapsRepoService } from '../repo/maps-repo.service';
import { Bitflags } from '../../@common/utils/bitflag-utils';

@Injectable()
export class AdminService {
    constructor(private readonly userRepo: UsersRepoService, private readonly mapRepo: MapsRepoService) {}

    async CreatePlaceholderUser(alias: string): Promise<UserDto> {
        const input: Prisma.UserCreateInput = {
            alias: alias,
            roles: Roles.PLACEHOLDER
        };

        const dbResponse = await this.userRepo.Create(input);

        return DtoUtils.Factory(UserDto, dbResponse);
    }

    async MergeUsers(placeholderID: number, userID: number): Promise<UserDto> {
        const includeFollows: Prisma.UserInclude = {
            follows: true,
            followers: true
        };

        const placeholder = (await this.userRepo.Get(placeholderID, includeFollows)) as any;

        if (placeholderID == userID) {
            throw new BadRequestException('Will not merge the same account');
        } else if (!placeholder) {
            throw new BadRequestException('Placeholder user not found');
        } else if ((placeholder.roles & Roles.PLACEHOLDER) == 0) {
            throw new BadRequestException('Placeholder input is not a placeholder user');
        }

        const user = (await this.userRepo.Get(userID, includeFollows)) as any;

        if (!user) throw new BadRequestException('Merging user not found');

        // Update credits to point to new ID
        await this.mapRepo.UpdateCredit(
            {
                userID: placeholderID
            },
            {
                user: { connect: { id: userID } }
            }
        );

        // Now follows, hardest part.
        // First edge case: delete the follow entry if the realUser is following the placeholder (can't follow yourself)
        await this.userRepo.DeleteFollow(userID, placeholderID).catch(() => void 0);

        const placeHolderFollowers = placeholder.followers as Follow[];

        // Update all the follows targeting the placeholder user
        for (const follow of placeHolderFollowers) {
            // We deleted the real user -> placeholder follow already but it can still be in this array
            if (follow.followeeID === userID) continue;

            // Second edge case: user(s) is (are) following both placeholder and real user
            const overlappingFollow = await this.userRepo.GetFollower(follow.followeeID, userID);
            if (overlappingFollow) {
                const mergedNotifies = Bitflags.add(overlappingFollow.notifyOn, follow.notifyOn);

                const earliestCreationDate = new Date(
                    Math.min(overlappingFollow.createdAt.getTime(), follow.createdAt.getTime())
                );

                await this.userRepo.UpdateFollow(follow.followeeID, userID, {
                    notifyOn: mergedNotifies,
                    createdAt: earliestCreationDate
                });

                await this.userRepo.DeleteFollow(follow.followeeID, placeholderID);
            }
            // If they don't overlap, just move the followedID
            else {
                await this.userRepo.UpdateFollow(follow.followeeID, placeholderID, {
                    followed: { connect: { id: userID } }
                });
            }
        }

        // Finally, activities.
        await this.userRepo.UpdateActivities({ userID: placeholderID }, { userID: userID });

        // Delete the placeholder
        await this.userRepo.Delete(placeholderID);

        // Fetch the merged user now everything's done
        const mergedUserDbResponse = await this.userRepo.Get(userID);

        return DtoUtils.Factory(UserDto, mergedUserDbResponse);
    }

    async UpdateUser(adminID: number, userID: number, update: AdminUpdateUserDto) {
        const user = await this.userRepo.Get(userID, { profile: true });

        if (!user) throw new NotFoundException('User not found');

        // TODO: Can we validate that update/create DTOs are not empty/undefined on all properties??
        if (Object.values(update).every((v) => v === undefined))
            throw new BadRequestException('Request contains no update data');

        const updateInput: Prisma.UserUpdateInput = {};

        if (update.bans) updateInput.bans = update.bans;

        let newRoles: Roles;

        if (update.roles) {
            const admin = await this.userRepo.Get(adminID);

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
                const verifiedMatches = await this.userRepo.Count({
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

        await this.userRepo.Update(userID, updateInput);
    }
}
