using System;
using System.Threading.Tasks;
using Momentum.Framework.Core.Repositories;
using Momentum.Users.Core.Models;

namespace Momentum.Users.Core.Repositories
{
    public interface IUserStatsRepository : IGenericRepository<Stats>
    {
        public Task<Stats> GetByUserId(Guid userId);
    }
}