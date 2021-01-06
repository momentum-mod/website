using System;
using System.Threading.Tasks;
using Momentum.Auth.Core.Models;
using Momentum.Framework.Core.Repositories;

namespace Momentum.Auth.Core.Repositories
{
    public interface IUserTwitchRepository : IGenericRepository<UserTwitch>
    {
        Task<UserTwitch> GetByUserId(Guid userId);
    }
}