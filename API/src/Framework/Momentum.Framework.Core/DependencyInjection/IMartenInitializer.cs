using Marten;

namespace Momentum.Framework.Core.DependencyInjection
{
    public interface IMartenInitializer
    {
        public void SetupDomainIdentities(StoreOptions options);
    }
}