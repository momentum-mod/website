import { BadRequestException, Injectable } from '@nestjs/common';
import { UsersRepoService } from '../repo/users-repo.service';
import { Follow, Prisma } from '@prisma/client';
import { Roles } from '../../@common/enums/user.enum';
import { UserDto } from '../../@common/dto/user/user.dto';
import { DtoUtils } from '../../@common/utils/dto-utils';
import { MapsRepoService } from '../repo/maps-repo.service';

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
                const mergedNotifies = overlappingFollow.notifyOn | follow.notifyOn;

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
}
