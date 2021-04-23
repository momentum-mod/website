using AutoMapper;
using MediatR;
using Momentum.Reports.Application.DTOs;
using Momentum.Reports.Core.Repositories;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace Momentum.Reports.Application.Queries
{
    public class GetAllReportsQuery : IRequest<ReportDto>
    {

    }

    public class GetAllReportsQueryHandler : IRequestHandler<GetAllReportsQuery, ReportDto>
    {
        private readonly IReportRepository _reportRepository;
        private readonly IMapper _mapper;

        public GetAllReportsQueryHandler(IReportRepository reportRepository, IMapper mapper)
        {
            _reportRepository = reportRepository;
            _mapper = mapper;
        }

        public async Task<ReportDto> Handle(GetAllReportsQuery request, CancellationToken cancellationToken)
        {
            var reports = await _reportRepository.GetAllReports();

            foreach (var report in reports)
            {

            }

            throw new NotImplementedException();
        }
    }
}
