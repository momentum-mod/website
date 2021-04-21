using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Momentum.Maps.Api.ViewModels;

namespace Momentum.Maps.Api.Controllers
{
    [Route("api/maps")]
    [ApiController]
    public class MapsController : Controller
    {
        [HttpGet]
        public async Task GetAllMapsAsync([FromQuery] GetAllMapsParameters query)
        {

        }
    }
}