using System;
using System.Threading.Tasks;
using Marten;
using Momentum.Framework.Core.Models;
using Momentum.Framework.Core.Repositories;

namespace Momentum.Framework.Infrastructure.Repositories
{
    public abstract class GenericTimeTrackedRepository<T> : IGenericRepository<T> where T : TimeTrackedModel
    {
        protected readonly IDocumentStore _store;

        protected GenericTimeTrackedRepository(IDocumentStore store)
        {
            _store = store;
        }
        
        public async Task Add(T model)
        {
            model.CreatedAt = DateTime.UtcNow;
            model.UpdatedAt = null;

            using var session = _store.LightweightSession();
            
            session.Insert(model);

            await session.SaveChangesAsync();
        }

        public async Task Update(T model)
        {
            model.UpdatedAt = DateTime.UtcNow;

            using var session = _store.LightweightSession();
            
            session.Update(model);

            await session.SaveChangesAsync();
        }

        public async Task Delete(T model)
        {
            using var session = _store.LightweightSession();
            
            session.Delete(model);

            await session.SaveChangesAsync();
        }
    }
}