using Marten;
using Momentum.Framework.Core.DependencyInjection;

namespace Momentum.XpSystems.Infrastructure
{
    public class MartenInitializer : IMartenInitializer
    {
        public void SetupDomainIdentities(StoreOptions options)
        {
            options.InitialData.Add(new InitialData(InitialDataSets.XpSystem));
        }
    }
}
