using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Momentum.Auth.Core.Repositories;
using Momentum.Auth.Core.Services;

namespace Momentum.Auth.Application.Commands
{
    public class UnlinkUserDiscordCommand : IRequest
    {
    }

    public class UnlinkUserDiscordCommandHandler : IRequestHandler<UnlinkUserDiscordCommand>
    {
        private readonly ICurrentUserService _currentUserService;
        private readonly IUserDiscordRepository _userDiscordRepository;

        public UnlinkUserDiscordCommandHandler(ICurrentUserService currentUserService, IUserDiscordRepository userDiscordRepository)
        {
            _currentUserService = currentUserService;
            _userDiscordRepository = userDiscordRepository;
        }

        public async Task<Unit> Handle(UnlinkUserDiscordCommand request, CancellationToken cancellationToken)
        {
            var currentUserId = _currentUserService.GetUserId();

            var userDiscord = await _userDiscordRepository.GetByUserId(currentUserId);

            if (userDiscord == null)
            {
                return Unit.Value;
            }

            await _userDiscordRepository.Delete(userDiscord);

            return Unit.Value;
        }
    }
}