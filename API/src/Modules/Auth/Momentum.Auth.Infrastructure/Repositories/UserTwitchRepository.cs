using System;
using System.Threading.Tasks;
using Marten;
using Momentum.Auth.Core.Models;
using Momentum.Auth.Core.Repositories;
using Momentum.Framework.Infrastructure.Repositories;

namespace Momentum.Auth.Infrastructure.Repositories
{
    public class UserTwitchRepository : GenericTimeTrackedRepository<UserTwitch>, IUserTwitchRepository
    {
        public UserTwitchRepository(IDocumentStore store) : base(store) { }

        public async Task<UserTwitch> GetByUserId(Guid userId) => await GetSingleOrDefaultAsync(x => x.UserId == userId);
    }
}