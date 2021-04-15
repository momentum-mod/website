using System;
using System.Collections.Generic;
using System.Linq;
using AutoMapper;
using MediatR;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Momentum.XpSystems.Api.ViewModels;
using Momentum.XpSystems.Application.Queries;
using Momentum.XpSystems.Application.Commands;

namespace Momentum.XpSystems.Api.Controllers
{
    [Route("api/admin/xpsys")]
    [ApiController]
    public class XpSystemController : Controller
    {
        private readonly IMediator _mediator;
        private readonly IMapper _mapper;

        public XpSystemController(IMediator mediator, IMapper mapper)
        {
            _mediator = mediator;
            _mapper = mapper;
        }

        [HttpGet]
        public async Task<IActionResult> GetXpSystemAsync()
        {
            var xpSystem = await _mediator.Send(new GetXpSystemQuery { });

            var xpSystemViewModel = _mapper.Map<XpSystemViewModel>(xpSystem);

            return Ok(xpSystemViewModel);
        }

        [HttpPut]
        public async Task<IActionResult> CreateOrUpdateXpSystemAsync([FromBody] XpSystemViewModel model)
        {
            await _mediator.Send(new CreateOrUpdateXpSystemCommand
            {
                RankXp = model.RankXp,
                CosmeticXp = model.CosmeticXp
            });

            return NoContent();
        }

    }
}
