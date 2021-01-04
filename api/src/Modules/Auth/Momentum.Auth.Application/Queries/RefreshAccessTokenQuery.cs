using System;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Momentum.Auth.Core.Models;
using Momentum.Auth.Core.Services;
using Momentum.Framework.Core.Services;

namespace Momentum.Auth.Application.Queries
{
    public class RefreshAccessTokenQuery : IRequest<UserAccessToken>
    {
    }

    public class RefreshAccessTokenQueryHandler : IRequestHandler<RefreshAccessTokenQuery, UserAccessToken>
    {
        private readonly ICurrentUserService _currentUserService;
        private readonly IJwtService _jwtService;

        public RefreshAccessTokenQueryHandler(IJwtService jwtService, ICurrentUserService currentUserService)
        {
            _jwtService = jwtService;
            _currentUserService = currentUserService;
        }

        public async Task<UserAccessToken> Handle(RefreshAccessTokenQuery request, CancellationToken cancellationToken)
        {
            var user = await _currentUserService.GetUser();
            var refreshToken = _currentUserService.GetBearerToken();

            if (string.IsNullOrEmpty(refreshToken))
            {
                // TODO: Move this to a validator
                throw new Exception("No refresh token");
            }

            return await _jwtService.RefreshAccessTokenAsync(new UserRefreshToken
            {
                RefreshToken = refreshToken,
                UserId = user.Id
            });
        }
    }
}