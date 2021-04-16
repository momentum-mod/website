using Momentum.XpSystems.Application.DTOs;
using Momentum.XpSystems.Core.Models;


namespace Momentum.XpSystems.Application.AutoMapping
{
    public class ApplicationProfile : AutoMapper.Profile
    {
        public ApplicationProfile()
        {
            CreateMap<XpSystem, XpSystemDto>();
            CreateMap<XpSystemDto, XpSystem>();
        }
    }
}
