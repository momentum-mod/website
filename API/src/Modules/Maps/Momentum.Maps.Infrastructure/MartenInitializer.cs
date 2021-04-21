using Marten;
using Momentum.Framework.Core.DependencyInjection;
using Momentum.Maps.Core.Models;

namespace Momentum.Maps.Infrastructure
{
    public class MartenInitializer : IMartenInitializer
    {
        public void SetupDomainIdentities(StoreOptions options)
        {
            options.Schema.For<Map>().Identity(x => x.Id);

        }
    }
}