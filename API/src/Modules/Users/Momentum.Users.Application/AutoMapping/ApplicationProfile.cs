using Momentum.Users.Application.Commands.Auth;
using Momentum.Users.Application.DTOs;
using Momentum.Users.Application.DTOs.Auth;
using Momentum.Users.Core.Models;
using Momentum.Users.Core.Models.Auth;
using Profile = Momentum.Users.Core.Models.Profile;

namespace Momentum.Users.Application.AutoMapping
{
    public class ApplicationProfile : AutoMapper.Profile
    {
        public ApplicationProfile()
        {
            CreateMap<UserDiscord, UserDiscordDto>();
            CreateMap<UserDiscordDto, UserDiscord>();

            CreateMap<UserTwitch, UserTwitchDto>();
            CreateMap<UserTwitchDto, UserTwitch>();

            CreateMap<UserTwitter, UserTwitterDto>();
            CreateMap<UserTwitterDto, UserTwitter>();

            CreateMap<CreateOrUpdateUserDiscordCommand, UserDiscord>();
            CreateMap<CreateOrUpdateUserTwitchCommand, UserTwitch>();
            CreateMap<CreateOrUpdateUserTwitterCommand, UserTwitter>();

            CreateMap<User, UserDto>();
            CreateMap<UserDto, User>();

            CreateMap<Roles, RolesDto>();
            CreateMap<RolesDto, Roles>();

            CreateMap<Bans, BansDto>();
            CreateMap<BansDto, Bans>();

            CreateMap<Profile, ProfileDto>();
            CreateMap<ProfileDto, Profile>();

            CreateMap<Stats, StatsDto>();
            CreateMap<StatsDto, Stats>();
        }
    }
}