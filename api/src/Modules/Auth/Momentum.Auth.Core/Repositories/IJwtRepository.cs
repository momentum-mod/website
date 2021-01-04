using System;
using System.Threading.Tasks;
using Momentum.Auth.Core.Models;

namespace Momentum.Auth.Core.Repositories
{
    public interface IJwtRepository
    {
        Task<UserRefreshToken> GetRefreshTokenByUserId(Guid userId);
        Task AddRefreshToken(UserRefreshToken userRefreshToken);
        Task UpdateRefreshToken(UserRefreshToken userRefreshToken);
        Task DeleteRefreshToken(UserRefreshToken userRefreshToken);
    }
}