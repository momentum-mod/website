using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Momentum.Auth.Api.Controllers
{
    [Route("auth/twitch")]
    [ApiController]
    public class TwitchController : Controller
    {
        [Authorize(AuthenticationSchemes = "Twitch", Policy = "RequireNothing")]
        [HttpGet]
        public IActionResult SignIn()
        {
            if (User.Identity == null ||
                !User.Identity.IsAuthenticated)
                return Challenge("Twitch");

            // Twitch auth is opened in a new window,
            // and the client waits till the window is closed before continuing
            return Ok("<script>window.close();</script>");
        }
    }
}