using Momentum.Reports.Application.DTOs;
using Momentum.Reports.Core.Models;

namespace Momentum.Reports.Application.AutoMapping
{
    public class ApplicationProfile : AutoMapper.Profile
    {
        public ApplicationProfile()
        {
            CreateMap<Report, ReportDto>();
            CreateMap<ReportDto, Report>();
        }
    }
}
