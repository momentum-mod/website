using AutoMapper;
using Momentum.XpSystems.Api.ViewModels;
using Momentum.XpSystems.Application.DTOs;

namespace Momentum.XpSystems.Api.AutoMapping
{
    public class ApiProfile : Profile
    {
        public ApiProfile()
        {
            CreateMap<XpSystemDto, XpSystemViewModel>().ForMember(
                x => x.CosXP, x => x.MapFrom(x => x.CosmeticXP)
            );
        }
    }
}
