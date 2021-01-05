using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;
using Momentum.Auth.Core.Models;

namespace Momentum.Auth.Core.Services
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