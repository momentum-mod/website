using System.Text;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;

namespace Momentum.Gateway.Api.Helpers
{
    public static class ServiceCollectionExtensions
    {
        public static void AddMomentumAuthentication(this IServiceCollection services, IConfiguration configuration) 
            => services.AddMomentumJwtAuthentication(configuration)
            .AddSteamAuthentication()
            .AddDiscordAuthentication(configuration)
            .AddTwitchAuthentication(configuration)
            .AddTwitterAuthentication(configuration);

        private static AuthenticationBuilder AddMomentumJwtAuthentication(this IServiceCollection services, IConfiguration configuration)
            => services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
                .AddJwtBearer(options =>
                {
                    options.SaveToken = true;
                    options.TokenValidationParameters = new TokenValidationParameters
                    {
                        ValidateIssuer = true,
                        ValidateAudience = true,
                        ValidateLifetime = true,
                        ValidateIssuerSigningKey = true,
                        ValidIssuer = configuration["Jwt:Issuer"],
                        ValidAudience = configuration["Jwt:Issuer"],
                        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(configuration["Jwt:Key"]))
                    };
                });

        private static AuthenticationBuilder AddSteamAuthentication(this AuthenticationBuilder authenticationBuilder)
            => authenticationBuilder.AddSteam(options =>
                {
                    options.CallbackPath = "/auth/steam/return";
                    options.CorrelationCookie.SecurePolicy = CookieSecurePolicy.Always;
                    options.CorrelationCookie.IsEssential = true;
                    options.CorrelationCookie.SameSite = SameSiteMode.None;
                    options.SignInScheme = "Cookies";
                }).AddCookie("Cookies");

        private static AuthenticationBuilder AddTwitterAuthentication(this AuthenticationBuilder authenticationBuilder, IConfiguration configuration) 
            => authenticationBuilder.AddTwitter(options =>
            {
                options.ConsumerKey = configuration["Twitter:ApiKey"];
                options.ConsumerSecret = configuration["Twitter:Secret"];
                options.CallbackPath = "/auth/twitter/return";
                options.CorrelationCookie.SecurePolicy = CookieSecurePolicy.Always;
                options.CorrelationCookie.IsEssential = true;
                options.CorrelationCookie.SameSite = SameSiteMode.None;
                options.SignInScheme = "Cookies";
                options.SaveTokens = true;
            });

        private static AuthenticationBuilder AddDiscordAuthentication(this AuthenticationBuilder authenticationBuilder, IConfiguration configuration) 
            => authenticationBuilder.AddDiscord(options =>
            {
                options.ClientId = configuration["Discord:ClientId"];
                options.ClientSecret = configuration["Discord:ClientSecret"];
                options.CallbackPath = "/auth/discord/return";
                options.CorrelationCookie.SecurePolicy = CookieSecurePolicy.Always;
                options.CorrelationCookie.IsEssential = true;
                options.CorrelationCookie.SameSite = SameSiteMode.None;
                options.SignInScheme = "Cookies";
            });

        private static AuthenticationBuilder AddTwitchAuthentication(this AuthenticationBuilder authenticationBuilder, IConfiguration configuration)
            => authenticationBuilder.AddTwitch(options =>
            {
                options.ClientId = configuration["Twitch:ClientId"];
                options.ClientSecret = configuration["Twitch:ClientSecret"];
                options.CallbackPath = "/auth/twitch/return";
                options.CorrelationCookie.SecurePolicy = CookieSecurePolicy.Always;
                options.CorrelationCookie.IsEssential = true;
                options.CorrelationCookie.SameSite = SameSiteMode.None;
                options.SignInScheme = "Cookies";
            });
        
        public static IServiceCollection AddMomentumAuthorization(this IServiceCollection services) =>
            services.AddAuthorization(options =>
            {
                // Default policy requires access tokens
                options.DefaultPolicy = new AuthorizationPolicyBuilder().RequireClaim("refreshToken", "false")
                    .Build();
                options.AddPolicy("AllowRefreshToken", policy => policy.RequireClaim("refreshToken", "true"));
                options.AddPolicy("RequireNothing", policy => policy.RequireAssertion(_ => true));
            });
    }
}