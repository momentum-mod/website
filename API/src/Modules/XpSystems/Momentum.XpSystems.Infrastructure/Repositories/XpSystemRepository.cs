using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Marten;
using System.Threading.Tasks;
using Momentum.XpSystems.Core.Models;
using Momentum.XpSystems.Core.Repositories;

namespace Momentum.XpSystems.Infrastructure.Repositories
{
    public class XpSystemRepository : IXpSystemRepository
    {
        // public XpSystemRepository(IDocumentStore store) : base(store) { }

        public Task<XpSystem> GetOrCreate()
        {
            throw new NotImplementedException();
        }

        public async Task<XpSystem> Add(XpSystem model)
        {

            using var session = Store.LightweightSession();

            session.Insert(model);

            await session.SaveChangesAsync();

            return model;
        }

        public async Task<XpSystem> Update(XpSystem model)
        {

            using var session = Store.LightweightSession();

            session.Update(model);

            await session.SaveChangesAsync();

            return model;
        }
    }
}
