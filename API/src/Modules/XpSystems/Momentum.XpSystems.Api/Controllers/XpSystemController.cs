using AutoMapper;
using MediatR;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Momentum.XpSystems.Api.ViewModels;
using Momentum.XpSystems.Application.Queries;
using Momentum.XpSystems.Application.Commands;
using Newtonsoft.Json.Linq;
using Microsoft.AspNetCore.Authorization;
using Momentum.Users.Core.Models;
using Momentum.XpSystems.Core.Models;
using Momentum.XpSystems.Application.DTOs;

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
            var xpSystemDto = new XpSystemDto();

            try
            {
                xpSystemDto = await _mediator.Send(new GetXpSystemQuery { });
            }
            catch
            {
                return NotFound("XpSystem not initialized");
            }

            // This should be done in automapper
            XpSystemViewModel xpSystemViewModel = new XpSystemViewModel
            {
                CosXP = xpSystemDto.CosmeticXP.ToObject<CosXP>(),
                RankXP = xpSystemDto.RankXP.ToObject<RankXP>()
            };

            //var xpSystemViewModel = _mapper.Map<XpSystemViewModel>(xpSystem);

            return Ok(xpSystemViewModel);
        }

        //[Authorize(Roles = "Admin")]
        [HttpPut]
        public async Task<IActionResult> UpdateXpSystemAsync([FromBody] XpSystemViewModel model)
        {
            //User.IsInRole(Roles.Admin.ToString())

            await _mediator.Send(new UpdateXpSystemCommand
            {
                RankXP = JObject.FromObject(model.RankXP),
                CosmeticXp =JObject.FromObject(model.CosXP)
            }) ;

            return NoContent();
        }

    }
}
