using System;
using System.Threading.Tasks;
using Marten;
using Momentum.Framework.Infrastructure.Repositories;
using Momentum.Users.Core.Models;
using Momentum.Users.Core.Repositories;

namespace Momentum.Users.Infrastructure.Repositories
{
    public class UserStatsRepository : GenericTimeTrackedRepository<Stats>, IUserStatsRepository
    {
        public UserStatsRepository(IDocumentStore store) : base(store) { }
        
        public async Task<Stats> GetByUserId(Guid userId) => await GetSingleOrDefaultAsync(x => x.UserId == userId);
    }
}