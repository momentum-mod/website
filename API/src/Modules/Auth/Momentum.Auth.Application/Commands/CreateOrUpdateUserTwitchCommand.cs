using System.Threading;
using System.Threading.Tasks;
using AutoMapper;
using MediatR;
using Momentum.Auth.Core.Models;
using Momentum.Auth.Core.Repositories;
using Momentum.Framework.Application.Services;

namespace Momentum.Auth.Application.Commands
{
    public class CreateOrUpdateUserTwitchCommand : IRequest
    {
        public int TwitchId { get; set; }
        public string DisplayName { get; set; }
    }

    public class CreateOrUpdateUserTwitchCommandHandler : IRequestHandler<CreateOrUpdateUserTwitchCommand>
    {
        private readonly IMapper _mapper;
        private readonly ICurrentUserService _currentUserService;
        private readonly IUserTwitchRepository _userTwitchRepository;

        public CreateOrUpdateUserTwitchCommandHandler(IMapper mapper, ICurrentUserService currentUserService, IUserTwitchRepository userTwitchRepository)
        {
            _mapper = mapper;
            _currentUserService = currentUserService;
            _userTwitchRepository = userTwitchRepository;
        }

        public async Task<Unit> Handle(CreateOrUpdateUserTwitchCommand request, CancellationToken cancellationToken)
        {
            var userId = _currentUserService.GetUserId();

            var existingItem = await _userTwitchRepository.GetByUserId(userId);

            var userTwitch = _mapper.Map(request, existingItem);
            userTwitch.UserId = userId;

            if (existingItem == null)
            {
                await _userTwitchRepository.Add(userTwitch);
            }
            else
            {
                await _userTwitchRepository.Update(userTwitch);
            }

            return Unit.Value;
        }
    }
}