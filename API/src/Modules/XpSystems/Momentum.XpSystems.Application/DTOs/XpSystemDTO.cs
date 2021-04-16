using Newtonsoft.Json.Linq;
using System;

namespace Momentum.XpSystems.Application.DTOs
{
    public class XpSystemDto
    {
        public Guid Id { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public JObject RankXP { get; set; }
        public JObject CosmeticXP { get; set; }
    }
}
