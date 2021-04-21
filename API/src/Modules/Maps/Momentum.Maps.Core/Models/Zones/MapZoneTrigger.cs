using System;
using System.Collections.Generic;
using Momentum.Framework.Core.Models;
using Momentum.Maps.Core.Models.Zones.Properties;

namespace Momentum.Maps.Core.Models.Zones
{
    public class MapZoneTrigger
    {
        public MapZoneType ZoneType { get; set; }
        public float CoordinatesHeight { get; set; }
        public float CoordinatesZPosition { get; set; }
        public List<MapZonePoint> Points { get; set; }
        public MapZonePropertiesGroup Properties { get; set; }
    }
}