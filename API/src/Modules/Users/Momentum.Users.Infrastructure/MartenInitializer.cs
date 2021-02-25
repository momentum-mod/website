using Marten;
using Momentum.Framework.Core.DependencyInjection;
using Momentum.Users.Core.Models;

namespace Momentum.Users.Infrastructure
{
    public class MartenInitializer : IMartenInitializer
    {
        public void SetupDomainIdentities(StoreOptions options)
        {
            options.Schema.For<Profile>().Identity(x => x.UserId);
            options.Schema.For<Stats>().Identity(x => x.UserId);
        }
    }
}