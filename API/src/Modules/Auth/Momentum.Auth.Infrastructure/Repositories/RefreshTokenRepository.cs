using System;
using System.Threading.Tasks;
using Marten;
using Momentum.Auth.Core.Models;
using Momentum.Auth.Core.Repositories;
using Momentum.Framework.Infrastructure.Repositories;

namespace Momentum.Auth.Infrastructure.Repositories
{
    public class RefreshTokenRepository : GenericTimeTrackedRepository<UserRefreshToken>, IRefreshTokenRepository
    {
        public RefreshTokenRepository(IDocumentStore store) : base(store) { }
        public async Task<UserRefreshToken> GetByUserId(Guid userId) => await GetSingleAsync(x => x.UserId == userId);
    }
}