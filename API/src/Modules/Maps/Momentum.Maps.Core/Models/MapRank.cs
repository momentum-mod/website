using System;
using Momentum.Framework.Core.Models;

namespace Momentum.Maps.Core.Models
{
    // TODO: Should this be in the Runs module?
    public class MapRank : TimeTrackedModel
    {
        public Guid Id { get; set; }
        public Guid MapId { get; set; }
        public Guid UserId { get; set; }
        public MapType GameMode { get; set; }
        public RunFlags RunFlags { get; set; }
        public byte TrackNumber { get; set; }
        public byte ZoneNumber { get; set; }
        public Guid RunId { get; set; }
        public uint Rank { get; set; }
        public uint RankXp { get; set; }
    }
}