using Microsoft.Extensions.DependencyInjection;
using Momentum.Auth.Api.Services;
using Momentum.Framework.Core.DependencyInjection;

namespace Momentum.Auth.Api
{
    public class Module : IModuleInitializer
    {
        public void ConfigureServices(IServiceCollection services)
        {
            services.AddSingleton<SteamService>();
        }
    }
}