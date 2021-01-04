using System;
using System.Security.Claims;
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
        public static AuthenticationBuilder AddMomentumAuthentication(this IServiceCollection services, IConfiguration configuration)
            => services.AddMomentumJwtAuthentication(configuration)
                .AddMomentumSteamAuthentication(configuration);

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

        private static AuthenticationBuilder AddMomentumSteamAuthentication(this AuthenticationBuilder authenticationBuilder, IConfiguration configuration)
            => authenticationBuilder.AddSteam(options =>
                {
                    options.ApplicationKey = configuration["STEAM_API_KEY"];
                    options.CallbackPath = "/auth/steam/return";
                    options.CorrelationCookie.SecurePolicy = CookieSecurePolicy.Always;
                    options.CorrelationCookie.IsEssential = true;
                    options.CorrelationCookie.SameSite = SameSiteMode.None;
                    options.SignInScheme = "Cookies";
                })
                .AddCookie("Cookies");
        public static IServiceCollection AddMomentumAuthorization(this IServiceCollection services, Action<AuthorizationOptions> additionOptions = null) =>
            services.AddAuthorization(options =>
            {
                // Default policy requires access tokens
                options.DefaultPolicy = new AuthorizationPolicyBuilder().RequireClaim("refreshToken", "false")
                    .Build();
                options.AddPolicy("AllowRefreshToken", policy => policy.RequireClaim("refreshToken", "true"));
                options.AddPolicy("Steam", policy => policy.RequireAuthenticatedUser()
                    .RequireClaim(ClaimTypes.NameIdentifier));
            });
    }
}