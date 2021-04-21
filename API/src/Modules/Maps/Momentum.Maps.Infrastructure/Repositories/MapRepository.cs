using Marten;
using Momentum.Framework.Infrastructure.Repositories;
using Momentum.Maps.Core.Models;
using Momentum.Maps.Core.Repositories;

namespace Momentum.Maps.Infrastructure.Repositories
{
    public class MapRepository : GenericTimeTrackedRepository<Map>, IMapRepository
    {
        public MapRepository(IDocumentStore store) : base(store) { }
    }
}