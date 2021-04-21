namespace Momentum.Maps.Core.Models.Zones.Properties
{
    public class MapZoneProperties
    {
        public float SpeedLimit { get; set; }
        public SpeedLimitType SpeedLimitType { get; set; }
        public bool IsLimitingSpeed { get; set; }
        public bool StartOnJump { get; set; }
    }
}