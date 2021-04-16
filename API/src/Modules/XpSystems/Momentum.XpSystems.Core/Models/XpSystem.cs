using System;
using Momentum.Framework.Core.Models;
using Newtonsoft.Json.Linq;

namespace Momentum.XpSystems.Core.Models
{
    public class XpSystem : TimeTrackedModel
    {
        public Guid Id { get; set; }
		public JObject RankXP { get; set; }
		public JObject CosmeticXP { get; set; }
	}
}
