﻿using Marten;
using System.Threading.Tasks;
using Momentum.XpSystems.Core.Models;
using Momentum.XpSystems.Core.Repositories;
using System;

namespace Momentum.XpSystems.Infrastructure.Repositories
{
    public class XpSystemRepository : IXpSystemRepository
    {
        private readonly IDocumentStore _store;

        public XpSystemRepository(IDocumentStore store)
        {
            _store = store;
        }

        public async Task<XpSystem> CreateOrUpdate(XpSystem model)
        {
            if (model.CreatedAt == default)
            {
                model.CreatedAt = DateTime.UtcNow;
            }
            else
            {
                model.UpdatedAt = DateTime.UtcNow;
            }

            using var session = _store.LightweightSession();

            session.Store(model);

            await session.SaveChangesAsync();

            return model;
        }

        public async Task<XpSystem> SingleOrDefault()
        {
            using var session = _store.QuerySession();

            var xpSystem = await session.Query<XpSystem>().SingleOrDefaultAsync();

            return xpSystem;
        }
    }
}
