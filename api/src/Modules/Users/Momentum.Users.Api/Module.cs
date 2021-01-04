using Microsoft.Extensions.DependencyInjection;
using Momentum.Framework.Core.DependencyInjection;
using Momentum.Users.Core.Repositories;
using Momentum.Users.Infrastructure.Repositories;
using Microsoft.Extensions.Configuration;

namespace Momentum.Users.Api
{
    public class Module : IModuleInitializer
    {
        public void ConfigureServices(IServiceCollection services, IConfiguration configuration)
        {
            services.AddSingleton<IUserRepository, UserRepository>();
        }
    }
}