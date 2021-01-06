using AutoMapper;
using Momentum.Auth.Application.Commands;
using Momentum.Auth.Application.DTOs;
using Momentum.Auth.Core.Models;

namespace Momentum.Auth.Application.AutoMapping
{
    public class ApplicationProfile : Profile
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
        }
    }
}