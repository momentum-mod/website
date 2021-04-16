using AutoMapper;
using MediatR;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Momentum.XpSystems.Api.ViewModels;
using Momentum.XpSystems.Application.Queries;
using Momentum.XpSystems.Application.Commands;
using Newtonsoft.Json.Linq;

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

            // This should be done in automapper
            XpSystemViewModel xpSystemViewModel = new XpSystemViewModel
            {
                CosXP = xpSystem.CosmeticXP.ToObject<CosXP>(),
                RankXP = xpSystem.RankXP.ToObject<RankXP>()
            };

            //var xpSystemViewModel = _mapper.Map<XpSystemViewModel>(xpSystem);

            return Ok(xpSystemViewModel);
        }

        [HttpPut]
        public async Task<IActionResult> UpdateXpSystemAsync([FromBody] XpSystemViewModel model)
        {
            await _mediator.Send(new UpdateXpSystemCommand
            {
                RankXP = JObject.FromObject(model.RankXP),
                CosmeticXp =JObject.FromObject(model.CosXP)
            }) ;

            return NoContent();
        }

    }
}
