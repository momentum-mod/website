using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Momentum.Users.Core.Repositories.Auth;
using Momentum.Users.Core.Services;

namespace Momentum.Users.Application.Commands.Auth
{
    public class UnlinkUserTwitchCommand : IRequest
    {
    }

    public class UnlinkUserTwitchCommandHandler : IRequestHandler<UnlinkUserTwitchCommand>
    {
        private readonly ICurrentUserService _currentUserService;
        private readonly IUserTwitchRepository _userTwitchRepository;

        public UnlinkUserTwitchCommandHandler(ICurrentUserService currentUserService, IUserTwitchRepository userTwitchRepository)
        {
            _currentUserService = currentUserService;
            _userTwitchRepository = userTwitchRepository;
        }

        public async Task<Unit> Handle(UnlinkUserTwitchCommand request, CancellationToken cancellationToken)
        {
            var currentUserId = _currentUserService.GetUserId();

            var userTwitch = await _userTwitchRepository.GetByUserId(currentUserId);

            if (userTwitch == null)
            {
                return Unit.Value;
            }

            await _userTwitchRepository.Delete(userTwitch);

            return Unit.Value;
        }
    }
}