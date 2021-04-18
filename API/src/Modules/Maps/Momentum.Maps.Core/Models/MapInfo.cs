using System;
using Momentum.Framework.Core.Models;

namespace Momentum.Maps.Core.Models
{
    public class MapInfo : TimeTrackedModel
    {
        public Guid MapId { get; set; }
        public string Description { get; set; }
        public string YoutubeId { get; set; }
        public DateTime CreationDate { get; set; }
        public byte TrackCount { get; set; }
    }
}