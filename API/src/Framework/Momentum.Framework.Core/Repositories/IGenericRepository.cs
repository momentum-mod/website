using System.Threading.Tasks;

namespace Momentum.Framework.Core.Repositories
{
    public interface IGenericRepository<T> where T : class
    {
        public Task<T> Add(T model);
        public Task<T> Update(T model);
        public Task Delete(T model);
    }
}