using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;
using Momentum.Users.Core.Models.Auth;

namespace Momentum.Users.Core.Services
{
    public interface IJwtService
    {
        Task<UserRefreshToken> GetOrUpdateRefreshTokenAsync(Guid userId);
        Task<UserRefreshToken> CreateOrUpdateRefreshTokenAsync(Guid userId);
        Task<UserAccessToken> RefreshAccessTokenAsync(UserRefreshToken userRefreshToken, bool fromInGame);
        bool VerifyAccessToken(string accessToken);
        List<Claim> ExtractClaims(string accessToken);
        Task RevokeRefreshTokenAsync(Guid userId);
    }
}