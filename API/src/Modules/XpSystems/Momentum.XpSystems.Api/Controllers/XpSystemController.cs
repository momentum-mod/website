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

            // add a null check?
            return Ok(xpSystemViewModel);
        }

        [HttpPut]
        public async Task<IActionResult> CreateOrUpdateXpSystemAsync([FromBody] XpSystemViewModel model)
        {

            // We have a viewmodel coming in, want to convert to core model

            // ViewModel needs represent all the json fields for validation
            // Query and Command level call the repo to get a core model, then map it to a DTO and return
            // Then we need to cnvert it to a 

            // We have a ViewModel with 2 dynamic properties, rankXP and cosXP
            // 

            await _mediator.Send(new CreateOrUpdateXpSystemCommand
            {
                RankXp = model.RankXp,
                CosmeticXp = model.CosmeticXp
            });

            return NoContent();
        }

    }
}
