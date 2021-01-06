using System;
using System.Threading.Tasks;
using Momentum.Auth.Core.Models;
using Momentum.Framework.Core.Repositories;

namespace Momentum.Auth.Core.Repositories
{
    public interface IRefreshTokenRepository : IGenericRepository<UserRefreshToken>
    {
        Task<UserRefreshToken> GetByUserId(Guid userId);
    }
}