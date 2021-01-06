using System;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Baseline;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Momentum.Auth.Api.Services;
using Momentum.Auth.Api.ViewModels;
using Momentum.Auth.Application.Queries;
using Momentum.Users.Application.Commands;

namespace Momentum.Auth.Api.Controllers
{
    [Route("auth/twitter")]
    [ApiController]
    public class TwitterController : Controller
    {
        private readonly SteamService _steamService;
        private readonly IMediator _mediator;

        public TwitterController(SteamService steamService, IMediator mediator)
        {
            _steamService = steamService;
            _mediator = mediator;
        }

        [Authorize(AuthenticationSchemes = "Twitter", Policy = "RequireNothing")]
        [HttpGet]
        public async Task<IActionResult> SignInAsync()
        {
            if (User.Identity == null ||
                !User.Identity.IsAuthenticated)
                return Challenge("Twitter");

            return Ok();
        }
    }
}