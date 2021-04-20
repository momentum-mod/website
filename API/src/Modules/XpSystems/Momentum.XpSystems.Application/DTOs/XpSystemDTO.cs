using Momentum.XpSystems.Core.Models;
using System;
using Momentum.XpSystems.Core.Models.Cosmetic;
using Momentum.XpSystems.Core.Models.Rank;

namespace Momentum.XpSystems.Application.DTOs
{
    public class XpSystemDto
    {
        public Guid Id { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public RankXp RankXP { get; set; }
        public CosmeticXp CosmeticXP { get; set; }
    }
}
