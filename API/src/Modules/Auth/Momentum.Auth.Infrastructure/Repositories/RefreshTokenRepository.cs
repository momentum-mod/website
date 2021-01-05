using System;
using System.Threading.Tasks;
using Marten;
using Momentum.Auth.Core.Models;
using Momentum.Auth.Core.Repositories;

namespace Momentum.Auth.Infrastructure.Repositories
{
    public class RefreshTokenRepository : IRefreshTokenRepository
    {
        private readonly IDocumentStore _store;

        public RefreshTokenRepository(IDocumentStore store)
        {
            _store = store;
        }

        public async Task<UserRefreshToken> GetByUserId(Guid userId)
        {
            using var session = _store.QuerySession();

            return await session.Query<UserRefreshToken>()
                .SingleOrDefaultAsync(x => x.UserId == userId);
        }

        public async Task Add(UserRefreshToken userRefreshToken)
        {
            userRefreshToken.CreatedAt = DateTime.UtcNow;
            userRefreshToken.UpdatedAt = null;

            using var session = _store.LightweightSession();

            session.Insert(userRefreshToken);

            await session.SaveChangesAsync();
        }

        public async Task Update(UserRefreshToken userRefreshToken)
        {
            userRefreshToken.UpdatedAt = DateTime.UtcNow;

            using var session = _store.LightweightSession();
            
            session.Update(userRefreshToken);

            await session.SaveChangesAsync();
        }

        public async Task Delete(UserRefreshToken userRefreshToken)
        {
            using var session = _store.LightweightSession();
            
            session.Delete(userRefreshToken);

            await session.SaveChangesAsync();
        }
    }
}