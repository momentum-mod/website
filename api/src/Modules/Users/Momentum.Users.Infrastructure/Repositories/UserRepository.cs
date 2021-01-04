using System;
using System.Threading.Tasks;
using Marten;
using Momentum.Users.Core.Models;
using Momentum.Users.Core.Repositories;

namespace Momentum.Users.Infrastructure.Repositories
{
    public class UserRepository : IUserRepository
    {
        private readonly IDocumentStore _store;

        public UserRepository(IDocumentStore store)
        {
            _store = store;
        }

        public async Task Add(User user)
        {
            using var session = _store.LightweightSession();
            
            session.Insert(user);

            await session.SaveChangesAsync();
        }

        public async Task Update(User user)
        {
            using var session = _store.LightweightSession();
            
            session.Update(user);

            await session.SaveChangesAsync();        
        }

        public async Task Delete(User user)
        {
            using var session = _store.LightweightSession();
            
            session.Delete(user);

            await session.SaveChangesAsync();
        }

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