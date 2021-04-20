using AutoMapper;
using MediatR;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Momentum.XpSystems.Api.ViewModels;
using Momentum.XpSystems.Application.Queries;
using Momentum.XpSystems.Application.Commands;
using Momentum.XpSystems.Application.DTOs.Rank;
using Momentum.XpSystems.Application.DTOs.Cosmetic;
using Momentum.Users.Core.Services;
using Momentum.Users.Core.Models;

namespace Momentum.XpSystems.Api.Controllers
{
    [Route("api/admin/xpsys")]
    [ApiController]
    public class XpSystemController : Controller
    {
        private readonly IMediator _mediator;
        private readonly IMapper _mapper;
        private readonly ICurrentUserService _currentUserService;

        public XpSystemController(IMediator mediator, IMapper mapper, ICurrentUserService currentUserService)
        {
            _mediator = mediator;
            _mapper = mapper;
            _currentUserService = currentUserService;
        }

        [HttpGet]
        public async Task<IActionResult> GetXpSystemAsync()
        {
            var xpSystems = await _mediator.Send(new GetXpSystemQuery());

            if (xpSystems == null)
            {
                return NotFound();
            }

            var xpSystemViewModel = _mapper.Map<XpSystemViewModel>(xpSystems);

            return Ok(xpSystemViewModel);
        }

        [HttpPut]
        public async Task<IActionResult> UpdateXpSystemAsync([FromBody] XpSystemViewModel model)
        {
            if (!_currentUserService.HasRole(Roles.Admin))
            {
                return Unauthorized();
            }

            await _mediator.Send(new CreateOrUpdateXpSystemCommand
            {
                RankXp = _mapper.Map<RankXpDto>(model.RankXp),
                CosmeticXp = _mapper.Map<CosmeticXpDto>(model.CosmeticXp)
            });

            return NoContent();
        }
    }
}
