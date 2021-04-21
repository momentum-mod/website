using Momentum.Framework.Core.Models;

namespace Momentum.Maps.Core.Models
{
    public class BaseStats : TimeTrackedModel
    {
        public uint Jumps { get; set; }
        public uint Strafes { get; set; }
        public float AverageStrafeSync { get; set; }
        public float AverageStrafeSync2 { get; set; }
        public float EnterTime { get; set; }
        public float TotalTime { get; set; }
        public float VelocityAverage3d { get; set; }
        public float VelocityAverage2d { get; set; }
        public float VelocityMax3d { get; set; }
        public float VelocityMax2d { get; set; }
        public float VelocityEnter3d { get; set; }
        public float VelocityEnter2d { get; set; }
        public float VelocityExit3d { get; set; }
        public float VelocityExit2d { get; set; }
    }
}