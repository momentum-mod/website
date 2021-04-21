using System;
using System.Collections.Generic;
using Momentum.Framework.Core.Models;

namespace Momentum.Maps.Core.Models.Zones
{
    public class MapTrack : TimeTrackedModel
    {
        public byte TrackNumber { get; set; }
        public byte ZoneCount { get; set; }
        public bool IsLinear { get; set; }
        public byte Tier { get; set; }
        public MapTrackStats Stats { get; set; }
        public List<MapZone> Zones { get; set; }
    }
}