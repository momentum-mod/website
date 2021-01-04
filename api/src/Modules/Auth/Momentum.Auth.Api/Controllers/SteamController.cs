using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Momentum.Auth.Api.Controllers
{
    [Route("auth/steam")]
    [ApiController]
    public class SteamController : Controller
    {
        [Authorize(AuthenticationSchemes = "Cookies", Policy = "Steam")]
        [HttpGet]
        public IActionResult SignIn()
        {
            if (User.Identity != null && User.Identity.IsAuthenticated)
            {
                return Ok("lol");
            }

            return Challenge("Steam");
        }
        
        [Authorize(AuthenticationSchemes = "Cookies", Policy = "Steam")]
        [HttpGet("return")]
        public IActionResult SignInReturn()
        {
            if (User.Identity != null && User.Identity.IsAuthenticated)
            {
                return Ok("test");
            }

            return Challenge("Steam");
        }
    }
}