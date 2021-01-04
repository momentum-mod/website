using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Momentum.Auth.Api.Services;

namespace Momentum.Auth.Api.Controllers
{
    [Route("auth/steam")]
    [ApiController]
    public class SteamController : Controller
    {
        private readonly SteamService _steamService;

        public SteamController(SteamService steamService)
        {
            _steamService = steamService;
        }

        [Authorize(AuthenticationSchemes = "Cookies", Policy = "Steam")]
        [HttpGet]
        public async Task<IActionResult> SignIn()
        {
            if (User.Identity != null && User.Identity.IsAuthenticated)
            {
                await _steamService.EnsurePremiumAccountWithProfile();
                
                // They are fine
            }

            return Challenge("Steam");
        }
    }
}