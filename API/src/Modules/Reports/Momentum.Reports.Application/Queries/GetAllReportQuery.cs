using AutoMapper;
using MediatR;
using Momentum.Reports.Application.DTOs;
using Momentum.Reports.Core.Repositories;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace Momentum.Reports.Application.Queries
{
    public class GetAllReportQuery : IRequest<ReportDto>
    {

    }

    public class GetAllReportQueryHandler : IRequestHandler<GetAllReportQuery, ReportDto>
    {
        private readonly IReportRepository _reportRepository;
        private readonly IMapper _mapper;

        public GetAllReportQueryHandler(IReportRepository reportRepository, IMapper mapper)
        {
            _reportRepository = reportRepository;
            _mapper = mapper;
        }

        public async Task<ReportDto> Handle(GetAllReportQuery request, CancellationToken cancellationToken)
        {
            var reports = await _reportRepository.GetAllReport();

            foreach (var report in reports)
            {

            }

            throw new NotImplementedException();
        }
    }
}
