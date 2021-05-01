using AutoMapper;
using MediatR;
using Momentum.Reports.Application.DTOs;
using Momentum.Reports.Core.Models;
using Momentum.Reports.Core.Repositories;
using Momentum.Users.Core.Services;
using System.Threading;
using System.Threading.Tasks;

namespace Momentum.Reports.Application.Commands
{
    public class CreateReportCommand : IRequest<ReportDto>
    {
        public ReportDto ReportDto { get; set; }
    }

    public class CreateReportCommandHandler : IRequestHandler<CreateReportCommand, ReportDto>
    {
        private readonly IReportRepository _reportRepository;
        private readonly IMapper _mapper;
        private readonly ICurrentUserService _currentUserService;

        public CreateReportCommandHandler(IReportRepository reportRepository, IMapper mapper, ICurrentUserService currentUserService)
        {
            _reportRepository = reportRepository;
            _mapper = mapper;
            _currentUserService = currentUserService;
        }

        public async Task<ReportDto> Handle(CreateReportCommand request, CancellationToken cancellationToken)
        {
            request.ReportDto.SubmitterId = _currentUserService.GetUserId();

            var todayReportCount = await _reportRepository.GetTodayReportCount(request.ReportDto.SubmitterId);

            if (todayReportCount >= 5)
            {
                return null;
            }

            var report = _mapper.Map<Report>(request.ReportDto);

            report = await _reportRepository.Add(report);

            return _mapper.Map<ReportDto>(report);
        }
    }
}
