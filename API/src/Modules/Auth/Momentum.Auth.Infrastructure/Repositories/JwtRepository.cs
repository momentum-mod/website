using System;
using System.Threading.Tasks;
using Marten;
using Momentum.Auth.Core.Models;
using Momentum.Auth.Core.Repositories;

namespace Momentum.Auth.Infrastructure.Repositories
{
    public class JwtRepository : IJwtRepository
    {
        private readonly IDocumentStore _store;

        public JwtRepository(IDocumentStore store)
        {
            _store = store;
        }

        public async Task<UserRefreshToken> GetRefreshTokenByUserId(Guid userId)
        {
            using var session = _store.QuerySession();

            return await session.Query<UserRefreshToken>()
                .SingleOrDefaultAsync(x => x.UserId == userId);
        }

        public async Task AddRefreshToken(UserRefreshToken userRefreshToken)
        {
            using var session = _store.LightweightSession();

            session.Insert(userRefreshToken);

            await session.SaveChangesAsync();
        }

        public async Task UpdateRefreshToken(UserRefreshToken userRefreshToken)
        {
            using var session = _store.LightweightSession();
            
            session.Update(userRefreshToken);

            await session.SaveChangesAsync();
        }

        public async Task DeleteRefreshToken(UserRefreshToken userRefreshToken)
        {
            using var session = _store.LightweightSession();
            
            session.Delete(userRefreshToken);

            await session.SaveChangesAsync();
        }
    }
}