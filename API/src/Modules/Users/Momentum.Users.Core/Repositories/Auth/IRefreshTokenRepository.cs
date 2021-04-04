using System;
using System.Threading.Tasks;
using Momentum.Framework.Core.Repositories;
using Momentum.Users.Core.Models.Auth;

namespace Momentum.Users.Core.Repositories.Auth
{
    public interface IRefreshTokenRepository : IGenericRepository<UserRefreshToken>
    {
        Task<UserRefreshToken> GetByUserId(Guid userId);
    }
}