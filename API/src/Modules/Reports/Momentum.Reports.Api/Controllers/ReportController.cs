using MediatR;
using Microsoft.AspNetCore.Mvc;
using AutoMapper;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
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

            return Ok(report);
        }

/*        [Route("api/admin/reports")]
        [HttpGet]

        [Route("api/admin/reports/{id}")]
        [HttpPatch]*/
    }
}
