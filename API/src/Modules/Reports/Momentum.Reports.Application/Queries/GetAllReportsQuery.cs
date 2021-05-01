using AutoMapper;
using MediatR;
using Momentum.Reports.Application.DTOs;
using Momentum.Reports.Core.Repositories;
using Momentum.Users.Application.DTOs;
using Momentum.Users.Core.Models;
using Momentum.Users.Core.Repositories;
using Momentum.Users.Core.Services;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace Momentum.Reports.Application.Queries
{
    public class GetAllReportsQuery : IRequest<(List<ReportDto> reports, int reportCount)>
    {
        public string Expand { get; set; }
        public int? Limit { get; set; }
        public uint Offset { get; set; }
        public bool Resolved { get; set; }
    }

    public class GetAllReportsQueryHandler : IRequestHandler<GetAllReportsQuery, (List<ReportDto> reports, int reportCount)>
    {
        private readonly IReportRepository _reportRepository;
        private readonly IUserRepository _userRepository;
        private readonly IMapper _mapper;
        private readonly ICurrentUserService _currentUserService;

        public GetAllReportsQueryHandler(IReportRepository reportRepository, IUserRepository userRepository, IMapper mapper, ICurrentUserService currentUserService)
        {
            _reportRepository = reportRepository;
            _userRepository = userRepository;
            _mapper = mapper;
            _currentUserService = currentUserService;
        }

        public async Task<(List<ReportDto> reports, int reportCount)> Handle(GetAllReportsQuery request, CancellationToken cancellationToken)
        {
            if (!_currentUserService.HasRole(Roles.Admin))
            {
                throw new Exception("Unauthorized");
            }

            var reports = await _reportRepository.GetAllReports(request.Limit, request.Offset, request.Resolved);

            var reportCount = await _reportRepository.CountAllReports(request.Resolved);

            var reportDtos = reports.Select(x => _mapper.Map<ReportDto>(x)).ToList();

            if (!string.IsNullOrWhiteSpace(request.Expand))
            {
                var expandList = request.Expand.Split(",");

                foreach (var report in reportDtos)
                {
                    if (expandList.Contains("submitter"))
                    {
                        report.Submitter = _mapper.Map<UserDto>(await _userRepository.GetById(report.SubmitterId));
                    }

                    if (expandList.Contains("resolver"))
                    {
                        report.Resolver = _mapper.Map<UserDto>(await _userRepository.GetById(report.ResolverId));
                    }
                }
            }

            return (reportDtos, reportCount);
        }
    }
}
