using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Momentum.Auth.Api.Services;
using Momentum.Auth.Core.Repositories;
using Momentum.Auth.Core.Services;
using Momentum.Auth.Infrastructure.Repositories;
using Momentum.Framework.Core.DependencyInjection;
using SteamWebAPI2.Utilities;

namespace Momentum.Auth.Api
{
    public class Module : IModuleInitializer
    {
        public void ConfigureServices(IServiceCollection services, IConfiguration configuration)
        {
            services.AddScoped<SteamService>();
            services.AddSingleton<IJwtService, JwtService>();
            services.AddSingleton<IRefreshTokenRepository, RefreshTokenRepository>();
            services.AddSingleton<IUserDiscordRepository, UserDiscordRepository>();
            services.AddSingleton<IUserTwitterRepository, UserTwitterRepository>();
            services.AddSingleton<IUserTwitchRepository, UserTwitchRepository>();
            services.AddSingleton(new SteamWebInterfaceFactory(configuration["SteamApiKey"]));
        }
    }
}