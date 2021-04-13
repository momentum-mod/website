using Marten;
using System.Threading.Tasks;
using Momentum.XpSystems.Core.Models;
using Momentum.XpSystems.Core.Repositories;

namespace Momentum.XpSystems.Infrastructure.Repositories
{
    public class XpSystemRepository : IXpSystemRepository<XpSystem>
    {
        protected readonly IDocumentStore Store;

        public XpSystemRepository(IDocumentStore store)
        {
            Store = store;
        }
       
        public async Task<XpSystem> AddOrUpdate(XpSystem model)
        {
            using var session = Store.LightweightSession();

            session.Store(model);

            await session.SaveChangesAsync();

            return model;
        }

        public async Task<XpSystem> Get()
        {
            using var session = Store.LightweightSession();

            return await session.Query<XpSystem>().FirstAsync();
        }
    }
}
