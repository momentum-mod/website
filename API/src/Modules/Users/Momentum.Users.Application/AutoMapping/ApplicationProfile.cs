using AutoMapper;
using Momentum.Users.Application.DTOs;
using Momentum.Users.Core.Models;
using Profile = Momentum.Users.Core.Models.Profile;

namespace Momentum.Users.Application.AutoMapping
{
    public class ApplicationProfile : AutoMapper.Profile
    {
        public ApplicationProfile()
        {
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