using System;
using System.Collections.Generic;
using Momentum.Framework.Core.Models;

namespace Momentum.Maps.Core.Models.Zones
{
    public class MapZone
    {
        public byte ZoneNumber { get; set; }
        public List<MapZoneTrigger> Trigger { get; set; }
        public MapZoneStats Stats { get; set; }
    }
}