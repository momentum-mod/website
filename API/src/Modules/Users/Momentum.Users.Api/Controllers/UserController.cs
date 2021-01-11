using System.Text.Json;
using System.Threading.Tasks;
using AutoMapper;
using MediatR;
using Microsoft.AspNetCore.Mvc;
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
            var userId = _currentUserService.GetUserId();
            var user = await _mediator.Send(new GetUserByIdQuery
            {
                Id = userId
            });

            var userViewModel = _mapper.Map<UserViewModel>(user);

            switch (expand.ToLower())
            {
                case "profile":
                    var userProfile = await _mediator.Send(new GetUserProfileQuery
                    {
                        UserId = userId
                    });

                    userViewModel.Profile = _mapper.Map<UserProfileViewModel>(userProfile);
                    break;
            }

            return Ok(userViewModel);
        }
    }
}