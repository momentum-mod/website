using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using AutoMapper.QueryableExtensions;
using Microsoft.Extensions.DependencyInjection;
using Momentum.Framework.Core.DependencyInjection;
using Momentum.Users.Application.Commands;
using Momentum.XpSystems.Application.Commands;

namespace Momentum.Gateway.Api.Helpers
{
    public static class ModulesUtility
    {
        public static IEnumerable<IModuleInitializer> GetApiModules() => new IModuleInitializer[]
        {
            new Users.Api.Module(),
            new XpSystems.Api.Module(),
            new Maps.Api.Module()
        };

        public static IEnumerable<Assembly> GetApplicationLayerAssemblies()
            => new[]
            {
                // User
                typeof(GetOrCreateNewUserCommand).GetTypeInfo().Assembly,
                // XpSystem
                typeof(CreateOrUpdateXpSystemCommand).GetTypeInfo().Assembly
            };

        public static IEnumerable<Assembly> GetApiLayerAssemblies()
            => GetApiModules().Select(module => module.GetType().Assembly);

        public static IEnumerable<IMartenInitializer> GetMartenInitializers()
            => new IMartenInitializer[]
            {
                // User
                new Users.Infrastructure.MartenInitializer(),
                // XpSystem
                new XpSystems.Infrastructure.MartenInitializer(),
                // Maps
                new Maps.Infrastructure.MartenInitializer(),
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