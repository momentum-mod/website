using System;
using System.Threading.Tasks;
using Momentum.Auth.Core.Models;

namespace Momentum.Auth.Core.Repositories
{
    public interface IRefreshTokenRepository
    {
        Task<UserRefreshToken> GetByUserId(Guid userId);
        Task Add(UserRefreshToken userRefreshToken);
        Task Update(UserRefreshToken userRefreshToken);
        Task Delete(UserRefreshToken userRefreshToken);
    }
}