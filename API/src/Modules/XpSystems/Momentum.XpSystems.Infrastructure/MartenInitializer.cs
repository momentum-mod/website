using Marten;
using Momentum.Framework.Core.DependencyInjection;
using Momentum.XpSystems.Core.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Momentum.XpSystems.Infrastructure
{
    public class MartenInitializer : IMartenInitializer
    {
        public void SetupDomainIdentities(StoreOptions options)
        {
            options.InitialData.Add(new InitialData(InitialDataSets.XpSystem));
        }
    }
}
