using System;
using System.Collections.Generic;
using System.Linq;
using MediatR;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;

namespace Momentum.XpSystems.Api.Controllers
{
    [Route("api/admin/xpsys")]
    [ApiController]
    public class XpSystemController : Controller
    {
        private readonly IMediator _mediator;

        public XpSystemController(IMediator mediator)
        {
            _mediator = mediator;
        }

        [HttpGet]
        public async Task<IActionResult> GetXPSystems()
        {


        }

    }
}
