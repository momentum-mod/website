using System.Threading.Tasks;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Momentum.Auth.Application.Commands;
using Momentum.Auth.Application.Queries;

namespace Momentum.Auth.Api.Controllers
{
    [Route("auth")]
    [ApiController]
    public class JwtController : Controller
    {
        private readonly IMediator _mediator;
        
        public JwtController(IMediator mediator)
        {
            _mediator = mediator;
        }

        [Authorize]
        [HttpPost("revoke")]
        public async Task<IActionResult> RevokeRefreshTokenAsync()
        {
            await _mediator.Send(new RevokeRefreshTokenCommand());

            return NoContent();
        }
        
        [Authorize("AllowRefreshToken")]
        [HttpPost("refresh")]
        public async Task<IActionResult> RefreshAccessTokenAsync()
        {
            var accessToken = await _mediator.Send(new RefreshAccessTokenQuery());

            return Ok(accessToken);
        }
    }
}