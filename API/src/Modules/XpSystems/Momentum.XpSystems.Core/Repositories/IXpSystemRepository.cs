﻿using System.Threading.Tasks;
using Momentum.XpSystems.Core.Models;

namespace Momentum.XpSystems.Core.Repositories
{
    public interface IXpSystemRepository
    {
        Task<XpSystem> CreateOrUpdate(XpSystem model);
        Task<XpSystem> SingleOrDefault();
    }
}
