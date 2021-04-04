using Microsoft.Extensions.DependencyInjection;
using Momentum.Framework.Core.DependencyInjection;
using Momentum.Users.Core.Repositories;
using Momentum.Users.Infrastructure.Repositories;
using Microsoft.Extensions.Configuration;
using Momentum.Users.Api.Services;
using Momentum.Users.Core.Repositories.Auth;
using Momentum.Users.Core.Services;
using Momentum.Users.Infrastructure.Repositories.Auth;
using SteamWebAPI2.Utilities;

namespace Momentum.Users.Api
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
            services.AddSingleton<IUserStatsRepository, UserStatsRepository>();
            services.AddSingleton<ISteamWebInterfaceFactory>(new SteamWebInterfaceFactory(configuration["SteamApiKey"]));

            services.AddSingleton<IUserRepository, UserRepository>();
            services.AddSingleton<IUserProfileRepository, UserProfileRepository>();
        }
    }
}