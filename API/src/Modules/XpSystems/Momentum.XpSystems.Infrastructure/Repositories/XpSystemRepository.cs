using Marten;
using System.Threading.Tasks;
using Momentum.XpSystems.Core.Models;
using Momentum.XpSystems.Core.Repositories;
using System;

namespace Momentum.XpSystems.Infrastructure.Repositories
{
    public class XpSystemRepository : IXpSystemRepository
    {
        protected readonly IDocumentStore Store;

        public XpSystemRepository(IDocumentStore store)
        {
            Store = store;
        }

        public async Task<XpSystem> Update(XpSystem model)
        {
            using var session = Store.LightweightSession();

            session.Store(model);

            await session.SaveChangesAsync();

            return model;
        }

        public async Task<XpSystem> Get()
        {
            using var session = Store.QuerySession();

            var xpSystem = await session.Query<XpSystem>().SingleAsync();

            return xpSystem;
        }
    }
}
