using System.Text.Json;
using System.Threading.Tasks;
using AngleSharp.Io;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Components;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Momentum.Auth.Api.Services;
using Momentum.Auth.Application.Queries;
using Momentum.Users.Application.Commands;
using Momentum.Users.Application.Requests;

namespace Momentum.Auth.Api.Controllers
{
    [Microsoft.AspNetCore.Mvc.Route("auth/steam")]
    [ApiController]
    public class SteamController : Controller
    {
        private readonly SteamService _steamService;
        private readonly IMediator _mediator;

        public SteamController(SteamService steamService, IMediator mediator)
        {
            _steamService = steamService;
            _mediator = mediator;
        }

        [Authorize(AuthenticationSchemes = "Cookies", Policy = "Steam")]
        [HttpGet]
        public async Task<IActionResult> SignIn()
        {
            if (User.Identity != null && User.Identity.IsAuthenticated)
            {
                await _steamService.EnsurePremiumAccountWithProfile();
                
                // Manually pass values, since at this point the user is not JWT authenticated
                var user = await _mediator.Send(new GetOrCreateNewUserCommand
                {
                    SteamId = _steamService.GetSteamId(),
                    BuildUserDto = async () => await _steamService.BuildUserFromProfile()
                });
                
                var refreshToken = await _mediator.Send(new GetOrCreateRefreshTokenQuery
                {
                    UserId = user.Id
                });
                
                var accessToken = await _mediator.Send(new RefreshAccessTokenQuery
                {
                    RefreshToken = refreshToken
                });

                Response.Cookies.Append("accessToken", accessToken);
                Response.Cookies.Append("refreshToken", refreshToken);
                Response.Cookies.Append("user", JsonSerializer.Serialize(user));

                var refererUrl = Request.GetTypedHeaders().Referer;
                if (refererUrl != null)
                {
                    Request.Headers.Remove("Referer");
                    
                    return LocalRedirect(refererUrl.ToString());
                }

                return LocalRedirect("/dashboard");
            }

            return Challenge("Steam");
        }
    }
}