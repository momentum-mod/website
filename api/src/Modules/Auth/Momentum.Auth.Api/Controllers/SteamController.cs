using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;

namespace Momentum.Auth.Api.Controllers
{
    [Route("auth/steam")]
    [ApiController]
    public class SteamController : Controller
    {
        [HttpGet]
        public IActionResult SignIn()
        {
            if (User.Identity != null && User.Identity.IsAuthenticated)
            {
                return Ok("lol");
            }

            return Challenge("Steam");
        }
        
        [HttpGet("return")]
        public IActionResult SignInReturn()
        {
            if (User.Identity != null && User.Identity.IsAuthenticated)
            {
                return Ok("lol");
            }

            return Challenge("Steam");
        }
    }
}