using System.Threading.Tasks;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Momentum.Users.Application.Commands.Auth;
using Momentum.Users.Application.Queries.Auth;

namespace Momentum.Users.Api.Controllers.Auth
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