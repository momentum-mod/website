using System;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using AutoMapper;
using Baseline;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Momentum.Users.Api.Services;
using Momentum.Users.Api.ViewModels;
using Momentum.Users.Application.Commands;
using Momentum.Users.Application.Queries;
using Momentum.Users.Application.Queries.Auth;

namespace Momentum.Users.Api.Controllers.Auth
{
    [Route("auth/steam")]
    [ApiController]
    public class SteamController : Controller
    {
        private readonly SteamService _steamService;
        private readonly IMediator _mediator;
        private readonly IMapper _mapper;

        public SteamController(SteamService steamService, IMediator mediator, IMapper mapper)
        {
            _steamService = steamService;
            _mediator = mediator;
            _mapper = mapper;
        }

        [Authorize(AuthenticationSchemes = "Steam", Policy = "RequireNothing")]
        [HttpGet]
        public async Task<IActionResult> SignInAsync()
        {
            if (User.Identity == null ||
                !User.Identity.IsAuthenticated)
                return Challenge("Steam");

            // Manually pass values, since at this point the user is not JWT authenticated
            var user = await _mediator.Send(new GetOrCreateNewUserCommand
            {
                SteamId = _steamService.GetSteamId(),
                BuildUserDto = async () => await _steamService.BuildUserFromProfile(),
                EnsureSteamUserPermittedToCreateProfile = async () => await _steamService.EnsurePremiumAccountWithProfile()
            });

            var userProfile = await _mediator.Send(new GetUserProfileQuery
            {
                UserId = user.Id
            });

            var userSocials = await _mediator.Send(new GetUserSocialsQuery
            {
                UserId = user.Id
            });

            var refreshToken = await _mediator.Send(new GetOrCreateRefreshTokenQuery
            {
                UserId = user.Id
            });

            var accessToken = await _mediator.Send(new RefreshAccessTokenQuery
            {
                RefreshToken = refreshToken
            });

            var userViewModel = _mapper.Map<UserViewModel>(user);
            userViewModel.Profile = _mapper.Map<UserProfileViewModel>(userProfile);

            if (userSocials.UserDiscord != null)
            {
                userViewModel.Profile.DiscordAuth = _mapper.Map<UserDiscordAuthViewModel>(userSocials.UserDiscord);
            }

            if (userSocials.UserTwitch != null)
            {
                userViewModel.Profile.TwitchAuth = _mapper.Map<UserTwitchAuthViewModel>(userSocials.UserTwitch);
            }

            if (userSocials.UserTwitter != null)
            {
                userViewModel.Profile.TwitterAuth = _mapper.Map<UserTwitterAuthViewModel>(userSocials.UserTwitter);
            }

            Response.Cookies.Append("accessToken", accessToken);
            Response.Cookies.Append("refreshToken", refreshToken);
            Response.Cookies.Append("user", JsonSerializer.Serialize(userViewModel));

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

            var steamId = Request.Headers.First(x => string.Equals("id", x.Key, StringComparison.OrdinalIgnoreCase))
                .Value.ToString();

            var userTicketValid = await _mediator.Send(new SteamUserTicketValidQuery
            {
                Ticket = ticketStringBuilder.ToString(),
                UserId = steamId
            });

            if (userTicketValid)
            {
                // Manually pass values, since at this point the user is not JWT authenticated
                var user = await _mediator.Send(new GetOrCreateNewUserCommand
                {
                    SteamId = steamId,
                    BuildUserDto = async () => await _steamService.BuildUserFromProfile(steamId),
                    EnsureSteamUserPermittedToCreateProfile = async () => await _steamService.EnsurePremiumAccountWithProfile(steamId)
                });

                var refreshToken = await _mediator.Send(new GetOrCreateRefreshTokenQuery
                {
                    UserId = user.Id
                });

                var accessToken = await _mediator.Send(new RefreshAccessTokenQuery
                {
                    RefreshToken = refreshToken,
                    FromInGame = true
                });

                return Ok(new GameAccessTokenViewModel(accessToken));
            }

            return Unauthorized();
        }
    }
}