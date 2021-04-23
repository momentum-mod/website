using Marten;
using Momentum.Framework.Core.DependencyInjection;
using Momentum.Reports.Core.Models;

namespace Momentum.Reports.Infrastructure
{
    public class MartenInitializer : IMartenInitializer
    {
        public void SetupDomainIdentities(StoreOptions options)
        {
            options.Schema.For<Report>().Identity(x => x.Id);
        }
    }
}
