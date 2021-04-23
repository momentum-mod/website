using AutoMapper;
using MediatR;
using Momentum.Reports.Application.DTOs;
using Momentum.Reports.Core.Models;
using Momentum.Reports.Core.Repositories;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
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

        public CreateReportCommandHandler(IReportRepository reportRepository, IMapper mapper)
        {
            _reportRepository = reportRepository;
            _mapper = mapper;
        }

        public async Task<ReportDto> Handle(CreateReportCommand request, CancellationToken cancellationToken)
        {
            if (await _reportRepository.GetTodayReportCount(request.ReportDto.SubmitterId) >= 5)
            {
                return default;
            }

            var report = await _reportRepository.Add(_mapper.Map<Report>(request.ReportDto));

            return _mapper.Map<ReportDto>(report);
        }
    }
}
