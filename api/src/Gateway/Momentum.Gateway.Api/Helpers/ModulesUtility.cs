using System.Collections.Generic;
using System.Reflection;
using Microsoft.Extensions.DependencyInjection;
using Momentum.Auth.Application.Commands;
using Momentum.Auth.Application.Queries;
using Momentum.Framework.Core.DependencyInjection;

namespace Momentum.Gateway.Api.Helpers
{
    public static class ModulesUtility
    {
        public static IEnumerable<IModuleInitializer> GetModules() => new IModuleInitializer[]
        {
            new Auth.Api.Module(),
            new Users.Api.Module()
        };

        public static IEnumerable<Assembly> GetApplicationLayerAssemblies()
            => new[]
            {
                // Auth
                typeof(RevokeRefreshTokenCommand).Assembly,
                // User
                typeof(GetOrCreateRefreshTokenQuery).Assembly
            };
        
        public static void AddModuleControllers(this IMvcBuilder mvcBuilder, IEnumerable<IModuleInitializer> modules)
        {
            foreach (var module in modules)
            {
                var moduleAssembly = module.GetType()
                    .Assembly;
                
                mvcBuilder.AddApplicationPart(moduleAssembly);
            }
        }
    }
}