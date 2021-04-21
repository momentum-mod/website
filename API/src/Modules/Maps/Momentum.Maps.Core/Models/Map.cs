using System;
using System.Collections.Generic;
using Momentum.Framework.Core.Models;
using Momentum.Maps.Core.Models.Zones;

namespace Momentum.Maps.Core.Models
{
    public class Map : TimeTrackedModel
    {
        public Guid Id { get; set; }
        public string Name { get; set; }
        public GameMode Type { get; set; }
        public MapStatus Status { get; set; }
        public string DownloadUrl { get; set; }
        public string Hash { get; set; }
        public Guid ThumbnailId { get; set; }
        public List<MapImage> Images { get; set; }
        public List<MapCredit> Credits { get; set; }
        public MapInfo Info { get; set; }
        public List<MapReview> Reviews { get; set; }
        public MapStats Stats { get; set; }
        public List<MapTrack> Tracks { get; set; }
    }
}