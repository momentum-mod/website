using System;
using System.Threading.Tasks;
using Marten;
using Momentum.Auth.Core.Models;
using Momentum.Auth.Core.Repositories;
using Momentum.Framework.Core.Repositories;
using Momentum.Framework.Infrastructure.Repositories;

namespace Momentum.Auth.Infrastructure.Repositories
{
    public class UserDiscordRepository : GenericTimeTrackedRepository<UserDiscord>, IUserDiscordRepository
    {
        public UserDiscordRepository(IDocumentStore store) : base(store) { }

        public async Task<UserDiscord> GetByUserId(Guid userId) => await GetSingleOrDefaultAsync(x => x.UserId == userId);
    }
}