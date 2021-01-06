using System;
using System.Threading.Tasks;
using Marten;
using Momentum.Framework.Infrastructure.Repositories;
using Momentum.Users.Core.Models;
using Momentum.Users.Core.Repositories;

namespace Momentum.Users.Infrastructure.Repositories
{
    public class UserRepository : GenericTimeTrackedRepository<User>, IUserRepository
    {
        public UserRepository(IDocumentStore store) : base(store) { }

        public async Task<User> GetById(Guid id)
        {
            using var session = _store.QuerySession();

            return await session.Query<User>().SingleOrDefaultAsync(x => x.Id == id);
        }
        
        public async Task<User> GetBySteamId(string steamId)
        {
            using var session = _store.QuerySession();

            return await session.Query<User>().SingleOrDefaultAsync(x => x.SteamId == steamId);
        }
    }
}