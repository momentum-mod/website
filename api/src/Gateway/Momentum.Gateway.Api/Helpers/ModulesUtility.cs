using System.Collections.Generic;
using Microsoft.Extensions.DependencyInjection;
using Momentum.Framework.Core.DependencyInjection;

namespace Momentum.Gateway.Api.Helpers
{
    public static class ModulesUtility
    {
        public static IEnumerable<IModuleInitializer> GetModules()
        {
            return new[]
            {
                new Auth.Api.Module()
            };
        }
        
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