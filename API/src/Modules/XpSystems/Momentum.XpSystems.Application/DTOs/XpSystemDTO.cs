using System;

namespace Momentum.XpSystems.Application.DTOs
{
    public class XpSystemDTO
    {
        public Guid Id { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public string RankXP { get; set; }
        public string CosmeticXP { get; set; }
    }
}
