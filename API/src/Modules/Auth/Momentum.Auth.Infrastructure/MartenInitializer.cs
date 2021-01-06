using Momentum.Auth.Core.Models;
using Momentum.Framework.Core.DependencyInjection;
using StoreOptions = Marten.StoreOptions;

namespace Momentum.Auth.Infrastructure
{
    public class MartenInitializer : IMartenInitializer
    {
        public void SetupDomainIdentities(StoreOptions options)
        {
            options.Schema.For<UserRefreshToken>().Identity(x => x.UserId);
            options.Schema.For<UserDiscord>().Identity(x => x.UserId);
            options.Schema.For<UserTwitch>().Identity(x => x.UserId);
            options.Schema.For<UserTwitter>().Identity(x => x.UserId);
        }
    }
}