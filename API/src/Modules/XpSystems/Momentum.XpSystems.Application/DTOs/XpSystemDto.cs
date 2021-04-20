using System;
using Momentum.Framework.Core.Models;
using Momentum.XpSystems.Application.DTOs.Cosmetic;
using Momentum.XpSystems.Application.DTOs.Rank;

namespace Momentum.XpSystems.Application.DTOs
{
    public class XpSystemDto : TimeTrackedModel
    {
        public Guid Id { get; set; }
		public RankXpDto RankXp { get; set; }
		public CosmeticXpDto CosmeticXp { get; set; }
	}
}
