using System;
using System.Threading.Tasks;
using Marten;
using Momentum.Framework.Infrastructure.Repositories;
using Momentum.Users.Core.Models.Auth;
using Momentum.Users.Core.Repositories.Auth;

namespace Momentum.Users.Infrastructure.Repositories.Auth
{
    public class UserDiscordRepository : GenericTimeTrackedRepository<UserDiscord>, IUserDiscordRepository
    {
        public UserDiscordRepository(IDocumentStore store) : base(store) { }

        public async Task<UserDiscord> GetByUserId(Guid userId) => await GetSingleOrDefaultAsync(x => x.UserId == userId);
    }
}