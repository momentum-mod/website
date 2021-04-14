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
            CreateMap<XpSystemDto, XpSystemViewModel>();
            CreateMap<XpSystemViewModel, XpSystemDto>();
        }
    }
}
