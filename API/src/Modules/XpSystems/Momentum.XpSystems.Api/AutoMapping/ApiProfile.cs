using AutoMapper;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Momentum.XpSystems.Api.ViewModels;
using Momentum.XpSystems.Application.DTOs;

namespace Momentum.XpSystems.Api.AutoMapping
{
    public class ApiProfile : Profile
    {
        public ApiProfile()
        {
            // AutoMapper automatically applies .toString() if result is string
            CreateMap<XpSystemDto, XpSystemViewModel>().ForMember(
                x => x.CosXP, x => x.MapFrom(x => x.CosmeticXP)
            );

            // AutoMapper checks type result at runtime
            // This will break because cannot implicitly convert from string to JObject
            //CreateMap<XpSystemViewModel, XpSystemDto>();
        }
    }
}
