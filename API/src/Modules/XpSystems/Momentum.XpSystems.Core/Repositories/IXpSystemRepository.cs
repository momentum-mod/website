using System;
using System.Threading.Tasks;
using Momentum.Framework.Core.Repositories;
using Momentum.XpSystems.Core.Models;

namespace Momentum.XpSystems.Core.Repositories
{
    public interface IXpSystemRepository : IGenericRepository<XpSystem>
    {


        Task<XpSystem> GetOrCreate();
        // Task<XpSystem> Update(); defined in generic interface

    }
}
