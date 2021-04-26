using AutoMapper;
using MediatR;
using Momentum.Reports.Application.DTOs;
using Momentum.Reports.Core.Repositories;
using Momentum.Users.Application.DTOs;
using Momentum.Users.Core.Repositories;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace Momentum.Reports.Application.Queries
{
    public class GetAllReportsQuery : IRequest<List<ReportDto>>
    {
        public string Expand { get; set; }
        public int? Limit { get; set; }
        public uint Offset { get; set; }
        public bool Resolved { get; set; }
    }

    public class GetAllReportsQueryHandler : IRequestHandler<GetAllReportsQuery, List<ReportDto>>
    {
        private readonly IReportRepository _reportRepository;
        private readonly IUserRepository _userRepository;
        private readonly IMapper _mapper;

        public GetAllReportsQueryHandler(IReportRepository reportRepository, IUserRepository userRepository, IMapper mapper)
        {
            _reportRepository = reportRepository;
            _userRepository = userRepository;
            _mapper = mapper;
        }

        public async Task<List<ReportDto>> Handle(GetAllReportsQuery request, CancellationToken cancellationToken)
        {
            var reports = await _reportRepository.GetAllReports(request.Expand, request.Limit, request.Offset, request.Resolved);

            var reportDtos = new List<ReportDto>();

            foreach (var report in reports)
            {
                reportDtos.Add(_mapper.Map<ReportDto>(report));
            }

            foreach (var report in reportDtos)
            {
                report.Submitter = _mapper.Map<UserDto>(await _userRepository.GetById(report.SubmitterId));
                report.Resolver = _mapper.Map<UserDto>(await _userRepository.GetById(report.ResolverId));
            }

            return reportDtos;
        }
    }
}
