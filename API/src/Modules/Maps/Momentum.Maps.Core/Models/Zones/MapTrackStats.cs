using System;
using Momentum.Framework.Core.Models;

namespace Momentum.Maps.Core.Models.Zones
{
    public class MapTrackStats : TimeTrackedModel
    {
        public BaseStats BaseStats { get; set; }
        public uint Completions { get; set; }
        public uint UniqueCompletions { get; set; }
    }
}