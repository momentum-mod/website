﻿using System;
using System.IO;
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
using Momentum.Auth.Application.Queries;
using Momentum.Users.Application.Commands;

namespace Momentum.Auth.Api.Controllers
{
    [Route("auth/steam")]
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

        private async Task SetSignInResponseCookies()
        {
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
        }

        [Authorize(AuthenticationSchemes = "Cookies", Policy = "Steam")]
        [HttpGet]
        public async Task<IActionResult> SignInAsync()
        {
            if (User.Identity == null ||
                !User.Identity.IsAuthenticated)
                return Challenge("Steam");
            
            await _steamService.EnsurePremiumAccountWithProfile();

            await SetSignInResponseCookies();

            var refererUrl = Request.GetTypedHeaders().Referer;
            if (refererUrl != null)
            {
                Request.Headers.Remove("Referer");
                    
                return LocalRedirect(refererUrl.ToString());
            }

            return LocalRedirect("/dashboard");

        }

        [HttpPost("user")]
        [RequestSizeLimit(2 * 1024)]
        public async Task<IActionResult> VerifyUserTicket()
        {
            var ticketStringBuilder = new StringBuilder();

            var ticketBytes = await Request.Body.ReadAllBytesAsync();
            foreach (var ticketByte in ticketBytes)
            {
                ticketStringBuilder.AppendFormat("{0:x2}", ticketByte);
            }

            var userTicketValid = await _mediator.Send(new SteamUserTicketValidQuery
            {
                Ticket = ticketStringBuilder.ToString(),
                UserId = Request.Headers.First(x => string.Equals("id", x.Key, StringComparison.OrdinalIgnoreCase)).Value.ToString()
            });

            if (userTicketValid)
            {
                await SetSignInResponseCookies();
            }

            return Unauthorized();
        }
    }
}