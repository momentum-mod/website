using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Momentum.Framework.Core.DependencyInjection;
using Momentum.XpSystems.Core.Repositories;
using Momentum.XpSystems.Infrastructure.Repositories;

namespace Momentum.XpSystems.Api
{
    public class Module : IModuleInitializer
    {
        public void ConfigureServices(IServiceCollection services, IConfiguration configuration)
        {
            services.AddSingleton<IXpSystemRepository, XpSystemRepository>();
        }
    }
}
