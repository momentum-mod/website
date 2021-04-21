namespace Momentum.Maps.Core.Models.Zones
{
    public class MapZonePoint
    {
        /// <summary>
        /// In the format p{index}, like p0, p1, etc
        /// </summary>
        public string Key { get; set; }
        public float PositionX { get; set; }
        public float PositionY { get; set; }
    }
}