using AutoMapper;
using MediatR;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Momentum.XpSystems.Api.ViewModels;
using Momentum.XpSystems.Application.Queries;
using Momentum.XpSystems.Application.Commands;
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
                xpSystemDto = await _mediator.Send(new GetXpSystemQuery());
            }
            catch
            {
                return NotFound("XpSystem not initialized");
            }

            var xpSystemViewModel = _mapper.Map<XpSystemViewModel>(xpSystemDto);

            return Ok(xpSystemViewModel);
        }

        //[Authorize(Roles = "Admin")]
        [HttpPut]
        public async Task<IActionResult> UpdateXpSystemAsync([FromBody] XpSystemViewModel model)
        {
            //User.IsInRole(Roles.Admin.ToString())

            await _mediator.Send(new CreateOrUpdateXpSystemCommand
            {
                RankXp = model.RankXP,
                CosmeticXp = model.CosXP
            }) ;

            return NoContent();
        }

    }
}
