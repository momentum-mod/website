using AutoMapper;
using Momentum.Auth.Application.DTOs;
using Momentum.Users.Api.ViewModels;

namespace Momentum.Auth.Api.AutoMapping
{
    public class ApiProfile : Profile
    {
        public ApiProfile()
        {
            CreateMap<UserTwitterDto, UserTwitterAuthViewModel>();
            CreateMap<UserTwitchDto, UserTwitchAuthViewModel>();
            CreateMap<UserDiscordDto, UserDiscordAuthViewModel>();
        }
    }
}