using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Momentum.Users.Application.Commands.Auth;

namespace Momentum.Users.Api.Controllers.Auth
{
    [Route("auth/discord")]
    [ApiController]
    public class DiscordController : Controller
    {
        private readonly IMediator _mediator;

        public DiscordController(IMediator mediator)
        {
            _mediator = mediator;
        }

        [Authorize(AuthenticationSchemes = "Discord", Policy = "RequireNothing")]
        [HttpGet]
        public async Task<IActionResult> SignInAsync()
        {
            if (User.Identity == null ||
                !User.Identity.IsAuthenticated)
                return Challenge("Discord");

            await _mediator.Send(new CreateOrUpdateUserDiscordCommand
            {
                DisplayName = User.Identity.Name,
                DiscordId = ulong.Parse(User.Claims.First(x => x.Type == ClaimTypes.NameIdentifier).Value)
            });

            // Discord auth is opened in a new window,
            // and the client waits till the window is closed before continuing
            // TODO: Refactor frontend
            return Content("<script>window.close();</script>", "text/html");
        }

        [HttpDelete("/api/user/profile/social/discord")]
        public async Task<IActionResult> UnlinkAsync()
        {
            await _mediator.Send(new UnlinkUserDiscordCommand());

            return Ok();
        }
    }
}