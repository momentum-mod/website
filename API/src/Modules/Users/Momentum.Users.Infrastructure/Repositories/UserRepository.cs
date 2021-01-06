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

        public async Task<User> GetById(Guid id) => await GetSingleAsync(x => x.Id == id);

        public async Task<User> GetBySteamId(string steamId) => await GetSingleAsync(x => x.SteamId == steamId);
    }
}