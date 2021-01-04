using Microsoft.Extensions.DependencyInjection;
using Momentum.Framework.Core.DependencyInjection;
using Momentum.Users.Core.Repositories;
using Momentum.Users.Infrastructure.Repositories;

namespace Momentum.Users.Api
{
    public class Module : IModuleInitializer
    {
        public void ConfigureServices(IServiceCollection services)
        {
            services.AddSingleton<IUserRepository, UserRepository>();
        }
    }
}