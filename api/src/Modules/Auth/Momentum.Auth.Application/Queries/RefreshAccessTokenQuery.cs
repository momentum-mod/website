using System;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Momentum.Auth.Core.Models;
using Momentum.Auth.Core.Services;
using Momentum.Framework.Core.Services;

namespace Momentum.Auth.Application.Queries
{
    public class RefreshAccessTokenQuery : IRequest<string>
    {
        public string RefreshToken { get; set; } = null;
    }

    public class RefreshAccessTokenQueryHandler : IRequestHandler<RefreshAccessTokenQuery, string>
    {
        private readonly ICurrentUserService _currentUserService;
        private readonly IJwtService _jwtService;

        public RefreshAccessTokenQueryHandler(IJwtService jwtService, ICurrentUserService currentUserService)
        {
            _jwtService = jwtService;
            _currentUserService = currentUserService;
        }

        public async Task<string> Handle(RefreshAccessTokenQuery request, CancellationToken cancellationToken)
        {
            var refreshToken = request.RefreshToken;
            var userId = Guid.Empty;

            if (request.RefreshToken == null)
            {
                // No specified refresh token, get user + token from context
                userId = _currentUserService.GetUserId();
                refreshToken = _currentUserService.GetBearerToken();
            }
            else
            {
                // The refresh token was manually set - occurs when logging in through steam
                userId = Guid.Parse(_jwtService.ExtractClaims(request.RefreshToken)
                    .First(x => x.Type == JwtRegisteredClaimNames.Jti)
                    .Value);
            }

            if (string.IsNullOrEmpty(refreshToken))
            {
                // TODO: Move this to a validator
                throw new Exception("No refresh token");
            }

            var userAccessToken = await _jwtService.RefreshAccessTokenAsync(new UserRefreshToken
            {
                RefreshToken = refreshToken,
                UserId = userId
            });
            
            return userAccessToken.AccessToken;
        }
    }
}