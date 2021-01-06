using System;
using System.Threading.Tasks;
using Momentum.Framework.Core.Repositories;
using Momentum.Users.Core.Models;

namespace Momentum.Users.Core.Repositories
{
    public interface IUserRepository : IGenericRepository<User>
    {
        Task<User> GetById(Guid id);
        Task<User> GetBySteamId(string steamId);
    }
}