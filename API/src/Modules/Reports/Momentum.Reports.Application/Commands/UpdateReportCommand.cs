using AutoMapper;
using MediatR;
using Momentum.Reports.Core.Repositories;
using System;
using System.Threading;
using System.Threading.Tasks;

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

        public HandleUpdateReportCommand(IReportRepository reportRepository, IMapper mapper)
        {
            _reportRepository = reportRepository;
            _mapper = mapper;
        }

        public async Task<Unit> Handle(UpdateReportCommand request, CancellationToken cancellationToken)
        {
            var report = await _reportRepository.GetById(request.ReportId);

            report.Resolved = request.Resolved;
            report.ResolutionMessage = request.ResolutionMessage;

            await _reportRepository.Update(report);

            return Unit.Value;
        }
    }
}
