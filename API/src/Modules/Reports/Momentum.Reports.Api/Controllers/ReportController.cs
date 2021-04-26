using MediatR;
using Microsoft.AspNetCore.Mvc;
using AutoMapper;
using System;
using System.Threading.Tasks;
using Momentum.Reports.Api.ViewModels;
using Momentum.Users.Core.Services;
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
        private readonly ICurrentUserService _currentUserService;
        private readonly IMapper _mapper;

        public ReportController(IMediator mediator, ICurrentUserService currentUserService, IMapper mapper)
        {
            _mediator = mediator;
            _currentUserService = currentUserService;
            _mapper = mapper;
        }

        [Route("api/reports")]
        [HttpPost]
        public async Task<IActionResult> CreateReportAsync([FromBody] CreateReportViewModel model)
        {
            var userId = _currentUserService.GetUserId();

            var reportDto = _mapper.Map<ReportDto>(model);

            reportDto.SubmitterId = userId;

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
            /*            if (!_currentUserService.HasRole(Roles.Admin))
                        {
                            return Unauthorized();
                        }*/

            var (reports, reportCount) = await _mediator.Send(new GetAllReportsQuery
            {
                Expand = query.Expand,
                Limit = query.Limit,
                Offset = query.Offset,
                Resolved = query.Resolved
            });

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
            /*            if (!_currentUserService.HasRole(Roles.Admin))
                        {
                            return Unauthorized();
                        }*/
            var userId = _currentUserService.GetUserId();

            await _mediator.Send(new UpdateReportCommand
            {
                ReportId = reportId,
                Resolved = model.Resolved,
                ResolutionMessage = model.ResolutionMessage,
                ResolverId = userId
            });

            return NoContent();
        }
    }
}
