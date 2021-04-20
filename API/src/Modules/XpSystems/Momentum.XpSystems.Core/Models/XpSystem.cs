using System;
using Momentum.Framework.Core.Models;
using Momentum.XpSystems.Core.Models.Cosmetic;
using Momentum.XpSystems.Core.Models.Rank;

namespace Momentum.XpSystems.Core.Models
{
    public class XpSystem : TimeTrackedModel
    {
        public Guid Id { get; set; }
		public RankXp RankXp { get; set; }
		public CosmeticXp CosmeticXp { get; set; }
	}
}
