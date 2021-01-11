using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using AspNet.Security.OAuth.Discord;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Momentum.Auth.Application.Commands;
using Momentum.Auth.Core.Models;

namespace Momentum.Auth.Api.Controllers
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
            return Ok("<script>window.close();</script>");
        }
    }
}