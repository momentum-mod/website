using AutoMapper;
using Momentum.Users.Api.ViewModels;
using Momentum.Users.Application.DTOs;

namespace Momentum.Users.Api.AutoMapping
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