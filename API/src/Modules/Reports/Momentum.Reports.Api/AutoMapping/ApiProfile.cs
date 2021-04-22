using AutoMapper;
using Momentum.Reports.Api.ViewModels;
using Momentum.Reports.Application.DTOs;

namespace Momentum.Reports.Api.AutoMapping
{
    public class ApiProfile : Profile
    {
        public ApiProfile()
        {
            CreateMap<ReportDto, ReportViewModel>();
            CreateMap<ReportViewModel, ReportDto>();
        }
    }
}
