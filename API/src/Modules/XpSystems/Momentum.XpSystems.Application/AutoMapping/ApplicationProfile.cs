using Momentum.XpSystems.Application.DTOs;

namespace Momentum.XpSystems.Application.AutoMapping
{
    public class ApplicationProfile : AutoMapper.Profile
    {
        public ApplicationProfile()
        {
            CreateMap<XpSystemDto, XpSystemDto>();
            CreateMap<XpSystemDto, XpSystemDto>();
        }
    }
}
