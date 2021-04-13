using System;
using Momentum.Framework.Core.Models;

namespace Momentum.XpSystems.Core.Models
{
    public class XpSystem : TimeTrackedModel
    {
        public Guid Id { get; set; }
        public string RankXP { get; set; }
        public string CosmeticXP { get; set; }
    }
}
