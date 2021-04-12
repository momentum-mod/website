using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Momentum.Framework.Core.DependencyInjection;

namespace Momentum.XpSystems.Api
{
    public class Module : IModuleInitializer
    {
        public void ConfigureServices(IServiceCollection services, IConfiguration configuration)
        {
            throw new System.NotImplementedException();
        }
    }
}
