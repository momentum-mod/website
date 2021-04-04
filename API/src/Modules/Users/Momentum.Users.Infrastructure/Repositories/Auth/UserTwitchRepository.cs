using System;
using System.Threading.Tasks;
using Marten;
using Momentum.Framework.Infrastructure.Repositories;
using Momentum.Users.Core.Models.Auth;
using Momentum.Users.Core.Repositories.Auth;

namespace Momentum.Users.Infrastructure.Repositories.Auth
{
    public class UserTwitchRepository : GenericTimeTrackedRepository<UserTwitch>, IUserTwitchRepository
    {
        public UserTwitchRepository(IDocumentStore store) : base(store) { }

        public async Task<UserTwitch> GetByUserId(Guid userId) => await GetSingleOrDefaultAsync(x => x.UserId == userId);
    }
}