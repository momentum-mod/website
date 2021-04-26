using MediatR;
using Microsoft.AspNetCore.Mvc;
using AutoMapper;
using System;
using System.Linq;
using System.Threading.Tasks;
using Momentum.Reports.Api.ViewModels;
using Momentum.Users.Core.Services;
using Momentum.Reports.Application.DTOs;
using Momentum.Reports.Application.Commands;

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
        public async Task<IActionResult> GetAllReportsAsync([FromQuery] string query) // use a viewmodel here like MapsController
        {
            /*            if (!_currentUserService.HasRole(Roles.Admin))
                        {
                            return Unauthorized();
                        }*/

            var queryParams = query.Split(",");

            if (queryParams.Contains("limit"))
            {

            }
            if (queryParams.Contains("offset"))
            {

            }
            if (queryParams.Contains("resolved"))
            {

            }


            if (queryParams.Contains("expand"))
            {
                // expand is a property with a list possibly containing submitter/resolver
                if (queryParams.Contains("submitter"))
                {

                }
                if (queryParams.Contains("resolver"))
                {

                }
            }

            return Ok();
        }

        [Route("api/admin/reports/{reportId}")]
        [HttpPatch]
        public async Task<IActionResult> UpdateReportAsync(Guid reportId, [FromBody] UpdateReportViewModel model)
        {
            /*            if (!_currentUserService.HasRole(Roles.Admin))
                        {
                            return Unauthorized();
                        }*/

            await _mediator.Send(new UpdateReportCommand
            {
                ReportId = reportId,
                Resolved = model.Resolved,
                ResolutionMessage = model.ResolutionMessage
            });

            return NoContent();
        }
    }
}
