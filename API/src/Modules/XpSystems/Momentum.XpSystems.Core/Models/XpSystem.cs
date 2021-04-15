using System;
using Momentum.Framework.Core.Models;

namespace Momentum.XpSystems.Core.Models
{
    public class XpSystem : TimeTrackedModel
    {
        public Guid Id { get; set; }
		public dynamic RankXP { get; set; }
		public dynamic CosmeticXP { get; set; }
	}
}
