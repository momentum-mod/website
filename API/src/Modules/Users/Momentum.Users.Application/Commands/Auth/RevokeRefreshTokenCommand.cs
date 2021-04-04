using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Momentum.Users.Core.Services;

namespace Momentum.Users.Application.Commands.Auth
{
    public class RevokeRefreshTokenCommand : IRequest
    {
    }

    public class RevokeRefreshTokenCommandHandler : IRequestHandler<RevokeRefreshTokenCommand>
    {
        private readonly ICurrentUserService _currentUserService;
        private readonly IJwtService _jwtService;

        public RevokeRefreshTokenCommandHandler(IJwtService jwtService, ICurrentUserService currentUserService)
        {
            _jwtService = jwtService;
            _currentUserService = currentUserService;
        }

        public async Task<Unit> Handle(RevokeRefreshTokenCommand request, CancellationToken cancellationToken)
        {
            var currentUserId = _currentUserService.GetUserId();

            await _jwtService.RevokeRefreshTokenAsync(currentUserId);

            return Unit.Value;
        }
    }
}