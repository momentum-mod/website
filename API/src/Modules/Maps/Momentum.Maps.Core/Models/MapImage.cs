using System;
using Momentum.Framework.Core.Models;

namespace Momentum.Maps.Core.Models
{
    public class MapImage : TimeTrackedModel
    {
        public Guid Id { get; set; }
        public string SmallUrl { get; set; }
        public string MediumUrl { get; set; }
        public string LargeUrl { get; set; }
    }
}