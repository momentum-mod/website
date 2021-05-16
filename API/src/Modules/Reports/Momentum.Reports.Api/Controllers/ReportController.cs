using MediatR;
using Microsoft.AspNetCore.Mvc;
using AutoMapper;
using System;
using System.Threading.Tasks;
using Momentum.Reports.Api.ViewModels;
using Momentum.Reports.Application.DTOs;
using Momentum.Reports.Application.Commands;
using Momentum.Reports.Application.Queries;
using System.Collections.Generic;

namespace Momentum.Reports.Api.Controllers
{
    [ApiController]
    public class ReportController : Controller
    {
        private readonly IMediator _mediator;
        
        private readonly IMapper _mapper;

        public ReportController(IMediator mediator, IMapper mapper)
        {
            _mediator = mediator;
            _mapper = mapper;
        }

        [Route("api/reports")]
        [HttpPost]
        public async Task<IActionResult> CreateReportAsync([FromBody] CreateReportViewModel model)
        {
            var reportDto = _mapper.Map<ReportDto>(model);

            var report = await _mediator.Send(new CreateReportCommand
            {
                ReportDto = reportDto
            });

            if (report == null)
            {
                return Conflict("Daily report limit reached");
            }

            return Ok(_mapper.Map<ReportViewModel>(report));
        }

        [Route("api/admin/reports")]
        [HttpGet]
        public async Task<IActionResult> GetAllReportsAsync([FromQuery] GetAllReportsParameters query)
        {
            List<ReportDto> reports;
            int reportCount;

            try
            {
                (reports, reportCount) = await _mediator.Send(new GetAllReportsQuery
                {
                    Expand = query.Expand,
                    Limit = query.Limit,
                    Offset = query.Offset,
                    Resolved = query.Resolved
                });
            }
            catch (Exception e) when (e.Message == "Unauthorized")
            {
                return Unauthorized();
            }

            var reportsViewModel = new List<ReportViewModel>();

            foreach (var report in reports)
            {
                reportsViewModel.Add(_mapper.Map<ReportViewModel>(report));
            }

            var getAllReportsViewModel = new GetAllReportsViewModel
            {
                Count = reportCount,
                Reports = reportsViewModel
            };

            return Ok(getAllReportsViewModel);
        }

        [Route("api/admin/reports/{reportId}")]
        [HttpPatch]
        public async Task<IActionResult> UpdateReportAsync(Guid reportId, [FromBody] UpdateReportViewModel model)
        {
            try
            {
                await _mediator.Send(new UpdateReportCommand
                {
                    ReportId = reportId,
                    Resolved = model.Resolved,
                    ResolutionMessage = model.ResolutionMessage
                });
            }
            catch (Exception e) when (e.Message == "Unauthorized")
            {
                return Unauthorized();
            }

            return NoContent();
        }
    }
}
