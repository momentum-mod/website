using System;
using System.Threading.Tasks;
using Momentum.Framework.Core.Repositories;
using Momentum.Users.Core.Models;

namespace Momentum.Users.Core.Repositories
{
    public interface IUserProfileRepository : IGenericRepository<UserProfile>
    {
        Task<UserProfile> GetByUserId(Guid id);
    }
}