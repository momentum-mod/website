using System.Threading.Tasks;
using Momentum.XpSystems.Core.Models;

namespace Momentum.XpSystems.Core.Repositories
{
    public interface IXpSystemRepository<T> where T : XpSystem
    {
        Task<T> AddOrUpdate(T model);
        Task<T> Get();
    }
}
