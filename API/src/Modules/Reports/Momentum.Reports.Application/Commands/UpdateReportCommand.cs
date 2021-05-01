using AutoMapper;
using MediatR;
using Momentum.Reports.Core.Repositories;
using Momentum.Users.Core.Services;
using System;
using System.Threading;
using System.Threading.Tasks;
using Momentum.Users.Core.Models;

namespace Momentum.Reports.Application.Commands
{
    public class UpdateReportCommand : IRequest
    {
        public Guid ReportId { get; set; }
        public bool Resolved { get; set; }
        public string ResolutionMessage { get; set; }
    }

    public class HandleUpdateReportCommand : IRequestHandler<UpdateReportCommand>
    {
        private readonly IReportRepository _reportRepository;
        private readonly IMapper _mapper;
        private readonly ICurrentUserService _currentUserService;

        public HandleUpdateReportCommand(IReportRepository reportRepository, IMapper mapper, ICurrentUserService currentUserService)
        {
            _reportRepository = reportRepository;
            _mapper = mapper;
            _currentUserService = currentUserService;
        }

        public async Task<Unit> Handle(UpdateReportCommand request, CancellationToken cancellationToken)
        {
            if (!_currentUserService.HasRole(Roles.Admin))
            {
                throw new Exception("Unauthorized");
            }

            var report = await _reportRepository.GetById(request.ReportId);

            var resolverId = _currentUserService.GetUserId();

            report.Resolved = request.Resolved;
            report.ResolutionMessage = request.ResolutionMessage;
            report.ResolverId = resolverId;

            await _reportRepository.Update(report);

            return Unit.Value;
        }
    }
}
