using System;
using System.Linq;
using System.Threading.Tasks;
using AutoMapper;
using MediatR;
using Microsoft.AspNetCore.Mvc;
using Momentum.Auth.Application.Queries;
using Momentum.Framework.Application.Services;
using Momentum.Users.Api.ViewModels;
using Momentum.Users.Application.Queries;

namespace Momentum.Users.Api.Controllers
{
    [Route("api/user")]
    [ApiController]
    public class UserController : Controller
    {
        private readonly IMediator _mediator;
        private readonly ICurrentUserService _currentUserService;
        private readonly IMapper _mapper;
        
        public UserController(IMediator mediator, ICurrentUserService currentUserService, IMapper mapper)
        {
            _mediator = mediator;
            _currentUserService = currentUserService;
            _mapper = mapper;
        }

        [HttpGet]
        public async Task<IActionResult> GetUserAsync([FromQuery] string expand)
        {
            expand = expand.Replace("stats", "userStats", StringComparison.Ordinal);

            var expandList = expand.Split(",");
            
            var userId = _currentUserService.GetUserId();
            var user = await _mediator.Send(new GetUserByIdQuery
            {
                Id = userId
            });

            var userViewModel = _mapper.Map<UserViewModel>(user);

            if (expandList.Contains("profile"))
            {
                var userProfile = await _mediator.Send(new GetUserProfileQuery
                {
                    UserId = userId
                });

                userViewModel.Profile = _mapper.Map<UserProfileViewModel>(userProfile);

                var userSocials = await _mediator.Send(new GetUserSocialsQuery
                {
                    UserId = userId
                });

                // Add social auths to profile
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
            }
            
            if (expandList.Contains("userStats"))
            {
                var userStats = await _mediator.Send(new GetUserStatsQuery
                {
                    UserId = userId
                });

                userViewModel.Stats = _mapper.Map<UserStatsViewModel>(userStats);
            }

            return Ok(userViewModel);
        }
    }
}