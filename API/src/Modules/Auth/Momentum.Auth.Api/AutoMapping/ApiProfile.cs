using AutoMapper;
using Momentum.Auth.Api.ViewModels;
using Momentum.Users.Application.DTOs;

namespace Momentum.Auth.Api.AutoMapping
{
    public class ApiProfile : Profile
    {
        public ApiProfile()
        {
            CreateMap<UserDto, UserViewModel>();
            CreateMap<UserProfileDto, UserProfileViewModel>();
        }
    }
}