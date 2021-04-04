using System;
using System.Threading.Tasks;
using Momentum.Framework.Core.Repositories;
using Momentum.Users.Core.Models.Auth;

namespace Momentum.Users.Core.Repositories.Auth
{
    public interface IUserTwitterRepository : IGenericRepository<UserTwitter>
    {
        Task<UserTwitter> GetByUserId(Guid userId);
    }
}