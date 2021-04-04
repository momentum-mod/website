using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Momentum.Users.Core.Repositories.Auth;
using Momentum.Users.Core.Services;

namespace Momentum.Users.Application.Commands.Auth
{
    public class UnlinkUserTwitterCommand : IRequest
    {
    }

    public class UnlinkUserTwitterCommandHandler : IRequestHandler<UnlinkUserTwitterCommand>
    {
        private readonly ICurrentUserService _currentUserService;
        private readonly IUserTwitterRepository _userTwitterRepository;

        public UnlinkUserTwitterCommandHandler(ICurrentUserService currentUserService, IUserTwitterRepository userTwitterRepository)
        {
            _currentUserService = currentUserService;
            _userTwitterRepository = userTwitterRepository;
        }

        public async Task<Unit> Handle(UnlinkUserTwitterCommand request, CancellationToken cancellationToken)
        {
            var currentUserId = _currentUserService.GetUserId();

            var userTwitter = await _userTwitterRepository.GetByUserId(currentUserId);

            if (userTwitter == null)
            {
                return Unit.Value;
            }

            await _userTwitterRepository.Delete(userTwitter);

            return Unit.Value;
        }
    }
}