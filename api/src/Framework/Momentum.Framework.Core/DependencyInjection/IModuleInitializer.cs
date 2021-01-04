using Microsoft.Extensions.DependencyInjection;

namespace Momentum.Framework.Core.DependencyInjection
{
    public interface IModuleInitializer
    {
        void ConfigureServices(IServiceCollection services);
    }
}