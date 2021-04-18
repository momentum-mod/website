using Momentum.XpSystems.Core.Models;
using System;

namespace Momentum.XpSystems.Application.DTOs
{
    public class XpSystemDto
    {
        public Guid Id { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public RankXP RankXP { get; set; }
        public CosmeticXP CosmeticXP { get; set; }
    }
}
