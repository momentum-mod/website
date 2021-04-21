using System;
using Momentum.XpSystems.Application.DTOs.Cosmetic;
using Momentum.XpSystems.Application.DTOs.Rank;

namespace Momentum.XpSystems.Application.DTOs
{
    public class XpSystemDto
    {
        public Guid Id { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public RankXpDto RankXp { get; set; }
		public CosmeticXpDto CosmeticXp { get; set; }
	}
}
