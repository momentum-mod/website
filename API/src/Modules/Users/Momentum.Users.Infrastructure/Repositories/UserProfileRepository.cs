using System;
using System.Threading.Tasks;
using Marten;
using Momentum.Framework.Infrastructure.Repositories;
using Momentum.Users.Core.Models;
using Momentum.Users.Core.Repositories;

namespace Momentum.Users.Infrastructure.Repositories
{
    public class UserProfileRepository : GenericTimeTrackedRepository<Profile>, IUserProfileRepository
    {
        public UserProfileRepository(IDocumentStore store) : base(store) { }

        public async Task<Profile> GetByUserId(Guid id) => await GetSingleOrDefaultAsync(x => x.UserId == id);
    }
}