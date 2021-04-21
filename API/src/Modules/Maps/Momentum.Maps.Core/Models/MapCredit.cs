using System;
using Momentum.Framework.Core.Models;

namespace Momentum.Maps.Core.Models
{
    public class MapCredit
    {
        public Guid UserId { get; set; }
        public MapCreditType Type { get; set; }
    }
}