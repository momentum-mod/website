using System.Security.Claims;
using System.Threading.Tasks;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Momentum.Auth.Application.Commands;
using Momentum.Framework.Application.Services;

namespace Momentum.Auth.Api.Controllers
{
    [Route("auth/twitter")]
    [ApiController]
    public class TwitterController : Controller
    {
        private readonly IMediator _mediator;
        private readonly ICurrentUserService _currentUserService;
        public TwitterController(IMediator mediator, ICurrentUserService currentUserService)
        {
            _mediator = mediator;
            _currentUserService = currentUserService;
        }

        [Authorize(AuthenticationSchemes = "Twitter", Policy = "RequireNothing")]
        [HttpGet]
        public async Task<IActionResult> SignInAsync()
        {
            if (User.Identity == null ||
                !User.Identity.IsAuthenticated)
                return Challenge("Twitter");

            await _mediator.Send(new CreateOrUpdateUserTwitterCommand
            {
                DisplayName = _currentUserService.GetClaim(ClaimTypes.NameIdentifier).Value
            });

            // Twitter auth is opened in a new window,
            // and the client waits till the window is closed before continuing
            return Ok("<script>window.close();</script>");
        }
    }
}