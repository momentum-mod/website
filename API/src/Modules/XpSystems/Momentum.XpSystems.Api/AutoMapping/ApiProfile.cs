using AutoMapper;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Momentum.XpSystems.Api.ViewModels;
using Momentum.XpSystems.Application.DTOs;
using Newtonsoft.Json.Linq;

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
