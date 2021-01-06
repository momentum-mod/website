using System.Threading.Tasks;

namespace Momentum.Framework.Core.Repositories
{
    public interface IGenericRepository<in T> where T : class
    {
        public Task Add(T model);
        public Task Update(T model);
        public Task Delete(T model);
    }
}