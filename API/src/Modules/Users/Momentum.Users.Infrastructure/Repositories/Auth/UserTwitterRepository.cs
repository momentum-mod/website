using System;
using System.Threading.Tasks;
using Marten;
using Momentum.Framework.Infrastructure.Repositories;
using Momentum.Users.Core.Models.Auth;
using Momentum.Users.Core.Repositories.Auth;

namespace Momentum.Users.Infrastructure.Repositories.Auth
{
    public class UserTwitterRepository : GenericTimeTrackedRepository<UserTwitter>, IUserTwitterRepository
    {
        public UserTwitterRepository(IDocumentStore store) : base(store) { }

        public async Task<UserTwitter> GetByUserId(Guid userId) => await GetSingleOrDefaultAsync(x => x.UserId == userId);
    }
}