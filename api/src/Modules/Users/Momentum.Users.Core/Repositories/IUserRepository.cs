using System;
using System.Threading.Tasks;
using Momentum.Users.Core.Models;

namespace Momentum.Users.Core.Repositories
{
    public interface IUserRepository
    {
        Task Add(User user);
        Task Update(User user);
        Task Delete(User user);
        
        Task<User> GetById(Guid id);
    }
}