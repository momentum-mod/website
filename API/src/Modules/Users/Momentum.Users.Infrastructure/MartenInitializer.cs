using Marten;
using Momentum.Framework.Core.DependencyInjection;
using Momentum.Users.Core.Models;
using Momentum.Users.Core.Models.Auth;

namespace Momentum.Users.Infrastructure
{
    public class MartenInitializer : IMartenInitializer
    {
        public void SetupDomainIdentities(StoreOptions options)
        {   
            options.Schema.For<UserRefreshToken>().Identity(x => x.UserId);
            options.Schema.For<UserDiscord>().Identity(x => x.UserId);
            options.Schema.For<UserTwitch>().Identity(x => x.UserId);
            options.Schema.For<UserTwitter>().Identity(x => x.UserId);
            
            options.Schema.For<Profile>().Identity(x => x.UserId);
            options.Schema.For<Stats>().Identity(x => x.UserId);
        }
    }
}