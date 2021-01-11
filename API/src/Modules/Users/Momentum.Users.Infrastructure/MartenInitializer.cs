using Marten;
using Momentum.Framework.Core.DependencyInjection;
using Momentum.Users.Core.Models;

namespace Momentum.Users.Infrastructure
{
    public class MartenInitializer : IMartenInitializer
    {
        public void SetupDomainIdentities(StoreOptions options)
        {
            options.Schema.For<UserProfile>().Identity(x => x.UserId);
        }
    }
}